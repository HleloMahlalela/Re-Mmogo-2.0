import express from "express";
import pool from "../db/pool.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const [groups] = await pool.query(
    `SELECT 
        g.*,
        COUNT(gm.user_id) AS member_count
     FROM MotsheloGroups g
     LEFT JOIN GroupMembers gm ON gm.group_id = g.group_id
     WHERE g.created_by = ? OR gm.user_id = ?
     GROUP BY g.group_id`,
    [req.user.user_id, req.user.user_id]
  );

  return res.json(groups);
});

router.post("/", async (req, res) => {
  const {
    group_name,
    description,
    year,
    monthly_contrib,
    interest_rate,
    target_interest,
  } = req.body ;

  if (!group_name || !year) {
    return res
      .status(400)
      .json({ message: "group_name and year are required." });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO MotsheloGroups
        (group_name, description, monthly_contrib, interest_rate, target_interest, year, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(group_name).trim(),
        description ? String(description).trim() : null,
        monthly_contrib ?? 0,
        interest_rate ?? 20,
        target_interest ?? 0,
        Number(year),
        req.user.user_id,
      ]
    );

    await pool.query(
      `INSERT INTO GroupMembers (group_id, user_id, is_signatory)
       VALUES (?, ?, TRUE)`,
      [result.insertId, req.user.user_id]
    );

    const [groups] = await pool.query(
      "SELECT * FROM MotsheloGroups WHERE group_id = ?",
      [result.insertId]
    );

    return res.status(201).json(groups[0]);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create group." });
  }
});
router.get("/:groupId/members", async (req, res) => {
  const groupId = Number(req.params.groupId);
  const [members] = await pool.query(
    `SELECT gm.member_id, gm.group_id, gm.user_id, gm.is_signatory, gm.joined_at, gm.is_active,
            u.full_name, u.email, u.phone
     FROM GroupMembers gm
     INNER JOIN Users u ON u.user_id = gm.user_id
     WHERE gm.group_id = ?`,
    [groupId]
  );
  return res.json(members);
});

router.post("/:groupId/members", async (req, res) => {
  const groupId = Number(req.params.groupId);
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: "email is required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const [users] = await pool.query("SELECT user_id FROM Users WHERE email = ?", [normalizedEmail]);
  if (users.length === 0) {
    return res.status(404).json({ message: "User not found. Register user first." });
  }

  try {
    await pool.query(
      `INSERT INTO GroupMembers (group_id, user_id, is_signatory)
       VALUES (?, ?, FALSE)`,
      [groupId, users[0].user_id]
    );
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Member already exists in group." });
    }
    throw error;
  }

  const [members] = await pool.query(
    `SELECT gm.member_id, gm.group_id, gm.user_id, gm.is_signatory, gm.joined_at, gm.is_active,
            u.full_name, u.email, u.phone
     FROM GroupMembers gm
     INNER JOIN Users u ON u.user_id = gm.user_id
     WHERE gm.group_id = ? AND gm.user_id = ?`,
    [groupId, users[0].user_id]
  );
  return res.status(201).json(members[0]);
});

router.get("/:groupId/contributions", async (req, res) => {
  const groupId = Number(req.params.groupId);

  const [rows] = await pool.query(`
    SELECT c.*, u.full_name
    FROM Contributions c
    INNER JOIN GroupMembers gm ON gm.member_id = c.member_id
    INNER JOIN Users u ON u.user_id = gm.user_id
    WHERE c.group_id = ?
    ORDER BY c.initiated_at DESC
  `, [groupId]);


  res.json(rows);
});


router.get("/:groupId/loans", async (req, res) => {
  const groupId = Number(req.params.groupId);
  const [rows] = await pool.query(
    `SELECT l.*, u.full_name
     FROM Loans l
     INNER JOIN GroupMembers gm ON gm.member_id = l.member_id
     INNER JOIN Users u ON u.user_id = gm.user_id
     WHERE l.group_id = ?
     ORDER BY l.requested_at DESC`,
    [groupId]
  );
  return res.json(rows);
});

router.get("/:groupId/yearend", async (req, res) => {
  const groupId = Number(req.params.groupId);

  const [contributionTotals] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_contributions
     FROM Contributions
     WHERE group_id = ? AND status = 'APPROVED'`,
    [groupId]
  );
  const [loanTotals] = await pool.query(
    `SELECT COALESCE(SUM(outstanding - principal), 0) AS total_interest
     FROM Loans
     WHERE group_id = ? AND status = 'APPROVED'`,
    [groupId]
  );

  const [contributorRows] = await pool.query(
    `SELECT u.full_name, SUM(c.amount) AS total
     FROM Contributions c
     INNER JOIN GroupMembers gm ON gm.member_id = c.member_id
     INNER JOIN Users u ON u.user_id = gm.user_id
     WHERE c.group_id = ? AND c.status = 'APPROVED'
     GROUP BY u.user_id, u.full_name
     ORDER BY total DESC`,
    [groupId]
  );})

export default router;