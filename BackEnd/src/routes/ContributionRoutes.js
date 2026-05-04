import express from "express";
import pool from "../db/pool.js";

const router = express.Router();

/* router.get("/:groupId/contributions", async (req, res) => {
  const groupId = Number(req.params.groupId);
  const [rows] = await pool.query(
    `SELECT c.*, u.full_name
     FROM Contributions c
     INNER JOIN GroupMembers gm ON gm.member_id = c.member_id
     INNER JOIN Users u ON u.user_id = gm.user_id
     WHERE c.group_id = ?
     ORDER BY c.initiated_at DESC`,
    [groupId]
  );
  return res.json(rows);
});
 */
router.post("/", async (req, res) => {
  const { group_id, amount, contribution_month, proof_of_payment } = req.body || {};
  if (!group_id || !amount || !contribution_month) {
    return res.status(400).json({ message: "group_id, amount and contribution_month are required." });
  }

  const [members] = await pool.query(
    "SELECT member_id FROM GroupMembers WHERE group_id = ? AND user_id = ? AND is_active = TRUE",
    [Number(group_id), req.user.user_id]
  );
  if (members.length === 0) {
    return res.status(403).json({ message: "You are not an active member in this group." });
  }

  const [result] = await pool.query(
    `INSERT INTO Contributions (group_id, member_id, amount, contribution_month, proof_of_payment)
     VALUES (?, ?, ?, ?, ?)`,
    [Number(group_id), members[0].member_id, Number(amount), contribution_month, proof_of_payment || null]
  );

  const [rows] = await pool.query("SELECT * FROM Contributions WHERE contribution_id = ?", [result.insertId]);
  return res.status(201).json(rows[0]);
});

router.post("/:contributionId/approve", async (req, res) => {
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

  await pool.query("UPDATE Contributions SET status = ? WHERE contribution_id = ?", [
    decision,
    contributionId,
  ]);
  const [rows] = await pool.query("SELECT * FROM Contributions WHERE contribution_id = ?", [contributionId]);
  return res.json(rows[0]);
});

export default router;
