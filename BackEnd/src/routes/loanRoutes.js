import express from "express";
import pool from "../db/pool.js";

const router = express.Router();



router.post("/", async (req, res) => {
  const { group_id, principal, notes } = req.body || {};
  if (!group_id || !principal) {
    return res.status(400).json({ message: "group_id and principal are required." });
  }

  const [members] = await pool.query(
    "SELECT member_id FROM GroupMembers WHERE group_id = ? AND user_id = ? AND is_active = TRUE",
    [Number(group_id), req.user.user_id]
  );
  if (members.length === 0) {
    return res.status(403).json({ message: "You are not an active member in this group." });
  }

  const principalValue = Number(principal);
  const [result] = await pool.query(
    `INSERT INTO Loans (group_id, member_id, principal, outstanding, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [Number(group_id), members[0].member_id, principalValue, principalValue, notes || null]
  );

  const [rows] = await pool.query("SELECT * FROM Loans WHERE loan_id = ?", [result.insertId]);
  return res.status(201).json(rows[0]);
});

router.post("/:loanId/approve", async (req, res) => {
  const loanId = Number(req.params.loanId);
  const decision = req.body?.decision === "REJECTED" ? "REJECTED" : "APPROVED";
  const notes = req.body?.notes ? String(req.body.notes).trim() : null;

  const [loans] = await pool.query("SELECT * FROM Loans WHERE loan_id = ?", [loanId]);
  const loan = loans[0];
  if (!loan) {
    return res.status(404).json({ message: "Loan not found." });
  }

  const [signatories] = await pool.query(
    `SELECT member_id FROM GroupMembers
     WHERE group_id = ? AND user_id = ? AND is_signatory = TRUE AND is_active = TRUE`,
    [loan.group_id, req.user.user_id]
  );
  if (signatories.length === 0) {
    return res.status(403).json({ message: "Only active signatories can approve loans." });
  }

  const [existingApprovals] = await pool.query(
    "SELECT approval_id FROM LoanApprovals WHERE loan_id = ? AND signatory_id = ?",
    [loanId, signatories[0].member_id]
  );
  if (existingApprovals.length > 0) {
    await pool.query(
      `UPDATE LoanApprovals
       SET decision = ?, notes = ?, decided_at = CURRENT_TIMESTAMP
       WHERE approval_id = ?`,
      [decision, notes, existingApprovals[0].approval_id]
    );
  } else {
    await pool.query(
      `INSERT INTO LoanApprovals (loan_id, signatory_id, decision, notes)
       VALUES (?, ?, ?, ?)`,
      [loanId, signatories[0].member_id, decision, notes]
    );
  }

  const outstanding = decision === "APPROVED" ? Number((Number(loan.principal) * 1.1).toFixed(2)) : loan.outstanding;
  await pool.query("UPDATE Loans SET status = ?, outstanding = ? WHERE loan_id = ?", [
    decision,
    outstanding,
    loanId,
  ]);

  const [rows] = await pool.query("SELECT * FROM Loans WHERE loan_id = ?", [loanId]);
  return res.json(rows[0]);
});

export default router;