import express from "express";
import pool from "../db/pool.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  REQUIRED_SIGNATORY_APPROVALS,
  approvalsMet,
  countActiveSignatories,
  countDistinctContributionApprovals,
  hasContributionRejection,
} from "../lib/dualApproval.js";

const router = express.Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { group_id, amount, contribution_month, proof_of_payment } = req.body || {};
    if (!group_id || !amount || !contribution_month) {
      return res
        .status(400)
        .json({ message: "group_id, amount and contribution_month are required." });
    }

    const [members] = await pool.query(
      "SELECT member_id FROM GroupMembers WHERE group_id = ? AND user_id = ? AND is_active = TRUE",
      [Number(group_id), req.user.user_id]
    );
    if (members.length === 0) {
      return res.status(403).json({ message: "You are not an active member in this group." });
    }

    const [groups] = await pool.query(
      "SELECT monthly_contrib FROM MotsheloGroups WHERE group_id = ?",
      [Number(group_id)]
    );
    const expected = Number(groups[0]?.monthly_contrib ?? 1000);
    if (Number(amount) !== expected) {
      return res.status(400).json({
        message: `Monthly contribution for this group must be P${expected}.`,
      });
    }

    const [result] = await pool.query(
      `INSERT INTO Contributions (group_id, member_id, amount, contribution_month, proof_of_payment)
       VALUES (?, ?, ?, ?, ?)`,
      [
        Number(group_id),
        members[0].member_id,
        Number(amount),
        contribution_month,
        proof_of_payment || null,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM Contributions WHERE contribution_id = ?", [
      result.insertId,
    ]);
    return res.status(201).json(rows[0]);
  })
);

router.post(
  "/:contributionId/approve",
  asyncHandler(async (req, res) => {
    const contributionId = Number(req.params.contributionId);
    const decision = req.body?.decision === "REJECTED" ? "REJECTED" : "APPROVED";
    const notes = req.body?.notes ? String(req.body.notes).trim() : null;

    const [contributions] = await pool.query(
      "SELECT contribution_id, group_id FROM Contributions WHERE contribution_id = ?",
      [contributionId]
    );
    const contribution = contributions[0];
    if (!contribution) {
      return res.status(404).json({ message: "Contribution not found." });
    }

    const [signatories] = await pool.query(
      `SELECT member_id FROM GroupMembers
       WHERE group_id = ? AND user_id = ? AND is_signatory = TRUE AND is_active = TRUE`,
      [contribution.group_id, req.user.user_id]
    );
    if (signatories.length === 0) {
      return res.status(403).json({ message: "Only active signatories can approve contributions." });
    }

    const [existingApprovals] = await pool.query(
      "SELECT approval_id FROM ContributionApprovals WHERE contribution_id = ? AND signatory_id = ?",
      [contributionId, signatories[0].member_id]
    );
    if (existingApprovals.length > 0) {
      await pool.query(
        `UPDATE ContributionApprovals
         SET decision = ?, notes = ?, decided_at = CURRENT_TIMESTAMP
         WHERE approval_id = ?`,
        [decision, notes, existingApprovals[0].approval_id]
      );
    } else {
      await pool.query(
        `INSERT INTO ContributionApprovals (contribution_id, signatory_id, decision, notes)
         VALUES (?, ?, ?, ?)`,
        [contributionId, signatories[0].member_id, decision, notes]
      );
    }

    const sigCount = await countActiveSignatories(pool, contribution.group_id);
    if (sigCount < REQUIRED_SIGNATORY_APPROVALS) {
      await pool.query("UPDATE Contributions SET status = 'PENDING' WHERE contribution_id = ?", [
        contributionId,
      ]);
      const [rows] = await pool.query("SELECT * FROM Contributions WHERE contribution_id = ?", [
        contributionId,
      ]);
      return res.status(200).json({
        ...rows[0],
        approval_note:
          "This group needs two active signatories before contributions can be fully approved.",
      });
    }

    const rejected = await hasContributionRejection(pool, contributionId);
    if (rejected) {
      await pool.query("UPDATE Contributions SET status = 'REJECTED' WHERE contribution_id = ?", [
        contributionId,
      ]);
      const [rows] = await pool.query("SELECT * FROM Contributions WHERE contribution_id = ?", [
        contributionId,
      ]);
      return res.json(rows[0]);
    }

    const approvedN = await countDistinctContributionApprovals(pool, contributionId);
    const finalStatus = approvalsMet(sigCount, approvedN) ? "APPROVED" : "PENDING";

    await pool.query("UPDATE Contributions SET status = ? WHERE contribution_id = ?", [
      finalStatus,
      contributionId,
    ]);
    const [rows] = await pool.query("SELECT * FROM Contributions WHERE contribution_id = ?", [
      contributionId,
    ]);
    return res.json(rows[0]);
  })
);

export default router;
