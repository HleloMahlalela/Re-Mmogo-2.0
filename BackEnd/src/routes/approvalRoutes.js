import express from "express";
import pool from "../db/pool.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();

async function attachVotes(rows, groupId, approvalTable, fkColumn) {
  const [signatories] = await pool.query(
    `SELECT gm.member_id, u.full_name
     FROM GroupMembers gm
     INNER JOIN Users u ON u.user_id = gm.user_id
     WHERE gm.group_id = ? AND gm.is_signatory = TRUE AND gm.is_active = TRUE`,
    [groupId]
  );

  const output = [];
  for (const row of rows) {
    const [votes] = await pool.query(
      `SELECT signatory_id, decision, decided_at
       FROM ${approvalTable}
       WHERE ${fkColumn} = ?`,
      [row[fkColumn]]
    );
    const bySignatory = new Map(votes.map((v) => [Number(v.signatory_id), v]));
    output.push({
      ...row,
      signatory_votes: signatories.map((s) => {
        const vote = bySignatory.get(Number(s.member_id));
        return {
          signatory_id: s.member_id,
          signatory_name: s.full_name,
          decision: vote?.decision || "PENDING",
          decided_at: vote?.decided_at || null,
        };
      }),
    });
  }
  return output;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user.user_id;

    const [signatoryGroups] = await pool.query(
      `SELECT group_id, member_id
       FROM GroupMembers
       WHERE user_id = ? AND is_signatory = TRUE AND is_active = TRUE`,
      [userId]
    );

    if (signatoryGroups.length === 0) {
      return res.json({ contributions: [], loans: [], repayments: [] });
    }

    const groupIds = signatoryGroups.map((g) => g.group_id);

    const [rawContributions] = await pool.query(
      `SELECT c.*, u.full_name AS member_name, g.group_name
       FROM Contributions c
       INNER JOIN GroupMembers gm ON gm.member_id = c.member_id
       INNER JOIN Users u ON u.user_id = gm.user_id
       INNER JOIN MotsheloGroups g ON g.group_id = c.group_id
       WHERE c.group_id IN (?) AND c.status = 'PENDING'`,
      [groupIds]
    );

    const [rawLoans] = await pool.query(
      `SELECT l.*, u.full_name AS member_name, g.group_name
       FROM Loans l
       INNER JOIN GroupMembers gm ON gm.member_id = l.member_id
       INNER JOIN Users u ON u.user_id = gm.user_id
       INNER JOIN MotsheloGroups g ON g.group_id = l.group_id
       WHERE l.group_id IN (?) AND l.status = 'PENDING'`,
      [groupIds]
    );

    const [rawRepayments] = await pool.query(
      `SELECT r.*, l.group_id, u.full_name AS member_name, g.group_name, l.principal AS loan_principal
       FROM LoanRepayments r
       INNER JOIN Loans l ON l.loan_id = r.loan_id
       INNER JOIN GroupMembers gm ON gm.member_id = r.member_id
       INNER JOIN Users u ON u.user_id = gm.user_id
       INNER JOIN MotsheloGroups g ON g.group_id = l.group_id
       WHERE l.group_id IN (?) AND r.status = 'PENDING'`,
      [groupIds]
    );

    const contributions = [];
    for (const groupId of groupIds) {
      const inGroup = rawContributions.filter((r) => Number(r.group_id) === Number(groupId));
      const enriched = await attachVotes(
        inGroup,
        groupId,
        "ContributionApprovals",
        "contribution_id"
      );
      contributions.push(...enriched);
    }

    const loans = [];
    for (const groupId of groupIds) {
      const inGroup = rawLoans.filter((r) => Number(r.group_id) === Number(groupId));
      const enriched = await attachVotes(inGroup, groupId, "LoanApprovals", "loan_id");
      loans.push(...enriched);
    }

    const repayments = [];
    for (const groupId of groupIds) {
      const inGroup = rawRepayments.filter((r) => Number(r.group_id) === Number(groupId));
      const enriched = await attachVotes(
        inGroup,
        groupId,
        "LoanRepaymentApprovals",
        "repayment_id"
      );
      repayments.push(...enriched);
    }

    return res.json({ contributions, loans, repayments });
  })
);

export default router;
