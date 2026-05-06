import express from "express";
import pool from "../db/pool.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { persistAccruedLoan, firstDayOfNextMonthUtc, formatYmdUtc } from "../lib/loanAccrual.js";
import {
  REQUIRED_SIGNATORY_APPROVALS,
  approvalsMet,
  countActiveSignatories,
  countDistinctLoanApprovals,
  countDistinctRepaymentApprovals,
  hasLoanRejection,
  hasRepaymentRejection,
} from "../lib/dualApproval.js";

const router = express.Router();
const MAX_NOTE_LEN = 500;
const MAX_PROOF_LEN = 255;

function sanitizeOptionalText(value, maxLen) {
  if (value == null) return null;
  const clean = String(value).trim();
  if (!clean) return null;
  return clean.slice(0, maxLen);
}

router.post(
  "/repayments/:repaymentId/approve",
  asyncHandler(async (req, res) => {
    const repaymentId = Number(req.params.repaymentId);
    const decision = req.body?.decision === "REJECTED" ? "REJECTED" : "APPROVED";
    const notes = req.body?.notes ? String(req.body.notes).trim() : null;

    const [repRows] = await pool.query(
      `SELECT r.*, l.group_id, l.loan_id AS lid
       FROM LoanRepayments r
       INNER JOIN Loans l ON l.loan_id = r.loan_id
       WHERE r.repayment_id = ?`,
      [repaymentId]
    );
    const repayment = repRows[0];
    if (!repayment) {
      return res.status(404).json({ message: "Repayment not found." });
    }

    const [signatories] = await pool.query(
      `SELECT member_id FROM GroupMembers
       WHERE group_id = ? AND user_id = ? AND is_signatory = TRUE AND is_active = TRUE`,
      [repayment.group_id, req.user.user_id]
    );
    if (signatories.length === 0) {
      return res.status(403).json({ message: "Only active signatories can approve repayments." });
    }

    const [existingApprovals] = await pool.query(
      "SELECT approval_id FROM LoanRepaymentApprovals WHERE repayment_id = ? AND signatory_id = ?",
      [repaymentId, signatories[0].member_id]
    );
    if (existingApprovals.length > 0) {
      await pool.query(
        `UPDATE LoanRepaymentApprovals
         SET decision = ?, notes = ?, decided_at = CURRENT_TIMESTAMP
         WHERE approval_id = ?`,
        [decision, notes, existingApprovals[0].approval_id]
      );
    } else {
      await pool.query(
        `INSERT INTO LoanRepaymentApprovals (repayment_id, signatory_id, decision, notes)
         VALUES (?, ?, ?, ?)`,
        [repaymentId, signatories[0].member_id, decision, notes]
      );
    }

    const sigCount = await countActiveSignatories(pool, repayment.group_id);
    const rejected = await hasRepaymentRejection(pool, repaymentId);
    let newStatus = "PENDING";
    if (rejected) {
      newStatus = "REJECTED";
    } else {
      const approvedN = await countDistinctRepaymentApprovals(pool, repaymentId);
      if (approvalsMet(sigCount, approvedN)) {
        newStatus = "APPROVED";
      }
    }

    await pool.query("UPDATE LoanRepayments SET status = ? WHERE repayment_id = ?", [
      newStatus,
      repaymentId,
    ]);

    if (newStatus === "APPROVED") {
      const loanId = repayment.loan_id;
      await persistAccruedLoan(pool, loanId);
      const [loans] = await pool.query("SELECT outstanding FROM Loans WHERE loan_id = ?", [loanId]);
      const curOut = Number(loans[0]?.outstanding || 0);
      const pay = Number(repayment.amount);
      if (pay > curOut) {
        newStatus = "REJECTED";
        await pool.query("UPDATE LoanRepayments SET status = ? WHERE repayment_id = ?", [
          newStatus,
          repaymentId,
        ]);
      } else {
        const nextOut = Math.max(0, Number((curOut - pay).toFixed(2)));
        const loanStatus = nextOut === 0 ? "PAID" : "APPROVED";
        await pool.query("UPDATE Loans SET outstanding = ?, status = ? WHERE loan_id = ?", [
          nextOut,
          loanStatus,
          loanId,
        ]);
      }
    }

    const [rows] = await pool.query("SELECT * FROM LoanRepayments WHERE repayment_id = ?", [
      repaymentId,
    ]);
    return res.json(rows[0]);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { group_id, principal, notes } = req.body || {};
    if (!group_id || !principal) {
      return res.status(400).json({ message: "group_id and principal are required." });
    }
    const groupId = Number(group_id);
    const principalValue = Number(principal);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      return res.status(400).json({ message: "group_id must be a positive integer." });
    }
    if (!Number.isFinite(principalValue) || principalValue <= 0) {
      return res.status(400).json({ message: "principal must be a positive number." });
    }

    const [members] = await pool.query(
      "SELECT member_id FROM GroupMembers WHERE group_id = ? AND user_id = ? AND is_active = TRUE",
      [groupId, req.user.user_id]
    );
    if (members.length === 0) {
      return res.status(403).json({ message: "You are not an active member in this group." });
    }

    const [result] = await pool.query(
      `INSERT INTO Loans (group_id, member_id, principal, outstanding, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [groupId, members[0].member_id, principalValue, principalValue, sanitizeOptionalText(notes, MAX_NOTE_LEN)]
    );

    const [rows] = await pool.query("SELECT * FROM Loans WHERE loan_id = ?", [result.insertId]);
    return res.status(201).json(rows[0]);
  })
);

router.post(
  "/:loanId/approve",
  asyncHandler(async (req, res) => {
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

    const sigCount = await countActiveSignatories(pool, loan.group_id);
    if (sigCount < REQUIRED_SIGNATORY_APPROVALS) {
      await pool.query(
        `UPDATE Loans SET status = 'PENDING' WHERE loan_id = ?`,
        [loanId]
      );
      const [rows] = await pool.query("SELECT * FROM Loans WHERE loan_id = ?", [loanId]);
      return res.status(200).json({
        ...rows[0],
        approval_note:
          "This group needs two active signatories before a loan can be fully approved.",
      });
    }

    const rejected = await hasLoanRejection(pool, loanId);
    if (rejected) {
      await pool.query("UPDATE Loans SET status = 'REJECTED' WHERE loan_id = ?", [loanId]);
      const [rows] = await pool.query("SELECT * FROM Loans WHERE loan_id = ?", [loanId]);
      return res.json(rows[0]);
    }

    const approvedN = await countDistinctLoanApprovals(pool, loanId);
    if (!approvalsMet(sigCount, approvedN)) {
      await pool.query("UPDATE Loans SET status = 'PENDING' WHERE loan_id = ?", [loanId]);
      const [rows] = await pool.query("SELECT * FROM Loans WHERE loan_id = ?", [loanId]);
      return res.json(rows[0]);
    }

    const [groupRows] = await pool.query("SELECT interest_rate FROM MotsheloGroups WHERE group_id = ?", [
      loan.group_id,
    ]);
    const groupInterestRate = Number(groupRows[0]?.interest_rate ?? 20);
    const openingOutstanding = Number((Number(loan.principal) * (1 + groupInterestRate / 100)).toFixed(2));
    const disbursedAt = new Date();
    const nextAccrual = firstDayOfNextMonthUtc(disbursedAt);
    const nextStr = formatYmdUtc(nextAccrual);
    await pool.query(
      `UPDATE Loans
       SET status = 'APPROVED',
           outstanding = ?,
           disbursed_at = ?,
           next_accrual_date = ?
       WHERE loan_id = ?`,
      [openingOutstanding, disbursedAt, nextStr, loanId]
    );

    const [rows] = await pool.query("SELECT * FROM Loans WHERE loan_id = ?", [loanId]);
    return res.json(rows[0]);
  })
);

router.post(
  "/:loanId/repayments",
  asyncHandler(async (req, res) => {
    const loanId = Number(req.params.loanId);
    const { amount, proof_of_payment, notes } = req.body || {};
    const payAmt = Number(amount);
    if (!Number.isFinite(payAmt) || payAmt <= 0) {
      return res.status(400).json({ message: "amount is required and must be positive." });
    }
    if (!Number.isInteger(loanId) || loanId <= 0) {
      return res.status(400).json({ message: "loanId must be a positive integer." });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [loans] = await conn.query("SELECT * FROM Loans WHERE loan_id = ? FOR UPDATE", [loanId]);
      const loan = loans[0];
      if (!loan) {
        await conn.rollback();
        return res.status(404).json({ message: "Loan not found." });
      }
      if (loan.status !== "APPROVED") {
        await conn.rollback();
        return res.status(400).json({ message: "Only active loans accept repayments." });
      }

      const [members] = await conn.query(
        "SELECT member_id FROM GroupMembers WHERE group_id = ? AND user_id = ? AND is_active = TRUE",
        [loan.group_id, req.user.user_id]
      );
      if (!members.length || members[0].member_id !== loan.member_id) {
        await conn.rollback();
        return res.status(403).json({ message: "Only the borrower can record a repayment." });
      }

      const outstanding = Number(loan.outstanding);
      const [pending] = await conn.query(
        "SELECT SUM(amount) as total_pending FROM LoanRepayments WHERE loan_id = ? AND status = 'PENDING' FOR UPDATE",
        [loanId]
      );
      const totalPending = Number(pending[0]?.total_pending || 0);
      if (payAmt + totalPending > outstanding) {
        await conn.rollback();
        return res.status(400).json({
          message: `Total pending repayments (P${totalPending}) plus this amount would exceed outstanding balance (P${outstanding}).`,
        });
      }
      if (payAmt > outstanding) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: `Repayment cannot exceed outstanding balance (P${outstanding}).` });
      }

      const [result] = await conn.query(
        `INSERT INTO LoanRepayments (loan_id, member_id, amount, proof_of_payment, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [
          loanId,
          loan.member_id,
          payAmt,
          sanitizeOptionalText(proof_of_payment, MAX_PROOF_LEN),
          sanitizeOptionalText(notes, MAX_NOTE_LEN),
        ]
      );
      await conn.commit();

      const [rows] = await pool.query("SELECT * FROM LoanRepayments WHERE repayment_id = ?", [
        result.insertId,
      ]);
      return res.status(201).json(rows[0]);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

export default router;
