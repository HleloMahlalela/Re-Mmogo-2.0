import express from "express";
import pool from "../db/pool.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();

router.get(
  "/:groupId/yearend",
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.groupId);

    const [gRows] = await pool.query("SELECT * FROM MotsheloGroups WHERE group_id = ?", [groupId]);
    const group = gRows[0];
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const fy = Number(group.year);

    const [memberCountRows] = await pool.query(
      `SELECT COUNT(*) AS n FROM GroupMembers
       WHERE group_id = ? AND is_active = TRUE`,
      [groupId]
    );
    const memberCount = Number(memberCountRows[0]?.n || 0);

    const [contributionTotals] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_contributions
       FROM Contributions
       WHERE group_id = ? AND status = 'APPROVED' AND YEAR(contribution_month) = ?`,
      [groupId, fy]
    );

    const [repaymentTotals] = await pool.query(
      `SELECT COALESCE(SUM(r.amount), 0) AS total_repayments
       FROM LoanRepayments r
       INNER JOIN Loans l ON l.loan_id = r.loan_id
       WHERE l.group_id = ? AND r.status = 'APPROVED' AND YEAR(r.initiated_at) = ?`,
      [groupId, fy]
    );

    const totalContributions = Number(contributionTotals[0]?.total_contributions || 0);
    const totalRepayments = Number(repaymentTotals[0]?.total_repayments || 0);
    const poolValue = totalContributions + totalRepayments;
    const avgPoolSharePerMember =
      memberCount > 0 ? Number((poolValue / memberCount).toFixed(2)) : 0;

    const [contributorRows] = await pool.query(
      `SELECT u.full_name, u.user_id, COALESCE(SUM(c.amount), 0) AS total
       FROM GroupMembers gm
       INNER JOIN Users u ON u.user_id = gm.user_id
       LEFT JOIN Contributions c
         ON c.member_id = gm.member_id
         AND c.group_id = gm.group_id
         AND c.status = 'APPROVED'
         AND YEAR(c.contribution_month) = ?
       WHERE gm.group_id = ? AND gm.is_active = TRUE
       GROUP BY u.user_id, u.full_name
       ORDER BY total DESC`,
      [fy, groupId]
    );

    const memberTotals = contributorRows.map((row) => ({
      full_name: row.full_name,
      total_contributions: Number(row.total),
      estimated_payout_share:
        memberCount > 0 ? Number((poolValue / memberCount).toFixed(2)) : 0,
    }));

    const [monthlyRows] = await pool.query(
      `SELECT
       DATE_FORMAT(contribution_month, '%Y-%m') AS month_key,
       DATE_FORMAT(contribution_month, '%b %Y') AS month_label,
       SUM(amount) AS total
     FROM Contributions
     WHERE group_id = ? AND status = 'APPROVED' AND YEAR(contribution_month) = ?
     GROUP BY
       DATE_FORMAT(contribution_month, '%Y-%m'),
       DATE_FORMAT(contribution_month, '%b %Y')
     ORDER BY month_key`,
      [groupId, fy]
    );

    const [loanPaymentRows] = await pool.query(
      `SELECT u.full_name, SUM(r.amount) AS total_loan_payments
       FROM LoanRepayments r
       INNER JOIN Loans l ON l.loan_id = r.loan_id
       INNER JOIN GroupMembers gm ON gm.member_id = l.member_id
       INNER JOIN Users u ON u.user_id = gm.user_id
       WHERE l.group_id = ? AND r.status = 'APPROVED' AND YEAR(r.initiated_at) = ?
       GROUP BY u.user_id, u.full_name
       ORDER BY total_loan_payments DESC`,
      [groupId, fy]
    );

    const topContributor =
      contributorRows.length > 0 ? contributorRows[0].full_name : "N/A";
    const lowestContributor =
      contributorRows.length > 0
        ? contributorRows[contributorRows.length - 1].full_name
        : "N/A";

    const topLoanPayer =
      loanPaymentRows.length > 0 ? loanPaymentRows[0].full_name : "N/A";
    const lowestLoanPayer =
      loanPaymentRows.length > 0
        ? loanPaymentRows[loanPaymentRows.length - 1].full_name
        : "N/A";

    const [interestProgress] = await pool.query(
      `SELECT u.full_name,
              COALESCE((
                SELECT SUM(r.amount)
                FROM LoanRepayments r
                INNER JOIN Loans l2 ON l2.loan_id = r.loan_id
                WHERE l2.group_id = gm.group_id
                  AND l2.member_id = gm.member_id
                  AND r.status = 'APPROVED'
                  AND YEAR(r.initiated_at) = ?
              ), 0) AS payments_toward_loans
       FROM GroupMembers gm
       INNER JOIN Users u ON u.user_id = gm.user_id
       WHERE gm.group_id = ? AND gm.is_active = TRUE
       ORDER BY payments_toward_loans DESC`,
      [fy, groupId]
    );

    const targetInterest = Number(group.target_interest ?? 5000);
    const interest_progress = interestProgress.map((row) => ({
      full_name: row.full_name,
      payments_toward_loans: Number(row.payments_toward_loans || 0),
      target_interest: targetInterest,
      met_target: Number(row.payments_toward_loans || 0) >= targetInterest,
    }));

    const totalInterestProxy = loanPaymentRows.reduce(
      (s, r) => s + Number(r.total_loan_payments || 0),
      0
    );

    return res.json({
      group_id: group.group_id,
      group_name: group.group_name,
      year: fy,
      member_count: memberCount,
      monthly_contrib: Number(group.monthly_contrib),
      interest_rate: Number(group.interest_rate),
      target_interest: targetInterest,
      total_contributions: totalContributions,
      total_loan_repayments: totalRepayments,
      total_interest: totalInterestProxy,
      pool_value: poolValue,
      avg_pool_share_per_member: avgPoolSharePerMember,
      top_contributor: topContributor,
      lowest_contributor: lowestContributor,
      top_loan_payer: topLoanPayer,
      lowest_loan_payer: lowestLoanPayer,
      monthly_contributions: monthlyRows,
      member_contribution_totals: memberTotals,
      member_loan_payment_totals: loanPaymentRows.map((row) => ({
        full_name: row.full_name,
        total_loan_payments: Number(row.total_loan_payments || 0),
      })),
      interest_progress,
    });
  })
);

export default router;
