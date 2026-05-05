import express from "express";
import pool from "../db/pool.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { persistAccruedLoan } from "../lib/loanAccrual.js";

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
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
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      group_name,
      description,
      year,
      monthly_contrib,
      interest_rate,
      target_interest,
    } = req.body || {};
    if (!group_name || !year) {
      return res.status(400).json({ message: "group_name and year are required." });
    }

    const mc =
      monthly_contrib !== undefined && monthly_contrib !== null && monthly_contrib !== ""
        ? Number(monthly_contrib)
        : 1000;
    const ti =
      target_interest !== undefined && target_interest !== null && target_interest !== ""
        ? Number(target_interest)
        : 5000;
    const ir =
      interest_rate !== undefined && interest_rate !== null && interest_rate !== ""
        ? Number(interest_rate)
        : 20;

    try {
      const [result] = await pool.query(
        `INSERT INTO MotsheloGroups
        (group_name, description, monthly_contrib, interest_rate, target_interest, year, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          String(group_name).trim(),
          description ? String(description).trim() : null,
          mc,
          ir,
          ti,
          Number(year),
          req.user.user_id,
        ]
      );

      await pool.query(
        `INSERT INTO GroupMembers (group_id, user_id, is_signatory)
       VALUES (?, ?, TRUE)`,
        [result.insertId, req.user.user_id]
      );

      const [groups] = await pool.query("SELECT * FROM MotsheloGroups WHERE group_id = ?", [
        result.insertId,
      ]);

      return res.status(201).json(groups[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to create group." });
    }
  })
);

router.get(
  "/:groupId/members",
  asyncHandler(async (req, res) => {
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
  })
);

router.patch(
  "/:groupId/members/:memberId",
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.groupId);
    const memberId = Number(req.params.memberId);
    const { is_signatory } = req.body || {};
    if (typeof is_signatory !== "boolean") {
      return res.status(400).json({ message: "is_signatory (boolean) is required." });
    }

    const [caller] = await pool.query(
      `SELECT member_id FROM GroupMembers
       WHERE group_id = ? AND user_id = ? AND is_signatory = TRUE AND is_active = TRUE`,
      [groupId, req.user.user_id]
    );
    if (caller.length === 0) {
      return res.status(403).json({ message: "Only signatories can update member roles." });
    }

    const [target] = await pool.query(
      `SELECT member_id, is_signatory FROM GroupMembers
       WHERE group_id = ? AND member_id = ? AND is_active = TRUE`,
      [groupId, memberId]
    );
    if (target.length === 0) {
      return res.status(404).json({ message: "Member not found in this group." });
    }

    if (is_signatory) {
      const [cnt] = await pool.query(
        `SELECT COUNT(*) AS n FROM GroupMembers
         WHERE group_id = ? AND is_signatory = TRUE AND is_active = TRUE`,
        [groupId]
      );
      if (Number(cnt[0].n) >= 2 && !target[0].is_signatory) {
        return res.status(400).json({ message: "This group already has two signatories." });
      }
    } else {
      const [cnt] = await pool.query(
        `SELECT COUNT(*) AS n FROM GroupMembers
         WHERE group_id = ? AND is_signatory = TRUE AND is_active = TRUE`,
        [groupId]
      );
      if (target[0].is_signatory && Number(cnt[0].n) <= 1) {
        return res.status(400).json({ message: "A group must keep at least one signatory." });
      }
    }

    await pool.query(
      `UPDATE GroupMembers SET is_signatory = ? WHERE member_id = ? AND group_id = ?`,
      [is_signatory, memberId, groupId]
    );

    const [members] = await pool.query(
      `SELECT gm.member_id, gm.group_id, gm.user_id, gm.is_signatory, gm.joined_at, gm.is_active,
            u.full_name, u.email, u.phone
     FROM GroupMembers gm
     INNER JOIN Users u ON u.user_id = gm.user_id
     WHERE gm.group_id = ? AND gm.member_id = ?`,
      [groupId, memberId]
    );
    return res.json(members[0]);
  })
);

router.post(
  "/:groupId/members",
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.groupId);
    const { email, as_signatory } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: "email is required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [users] = await pool.query("SELECT user_id FROM Users WHERE email = ?", [normalizedEmail]);
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found. Register user first." });
    }

    let isSignatory = false;
    if (as_signatory === true) {
      const [caller] = await pool.query(
        `SELECT 1 FROM GroupMembers
         WHERE group_id = ? AND user_id = ? AND is_signatory = TRUE AND is_active = TRUE`,
        [groupId, req.user.user_id]
      );
      if (caller.length === 0) {
        return res
          .status(403)
          .json({ message: "Only a signatory can appoint another signatory when enrolling." });
      }
      const [cnt] = await pool.query(
        `SELECT COUNT(*) AS n FROM GroupMembers
         WHERE group_id = ? AND is_signatory = TRUE AND is_active = TRUE`,
        [groupId]
      );
      if (Number(cnt[0].n) >= 2) {
        return res.status(400).json({ message: "This group already has two signatories." });
      }
      isSignatory = true;
    }

    try {
      await pool.query(
        `INSERT INTO GroupMembers (group_id, user_id, is_signatory)
       VALUES (?, ?, ?)`,
        [groupId, users[0].user_id, isSignatory]
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
  })
);

router.get(
  "/:groupId/contributions",
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.groupId);

    const [rows] = await pool.query(
      `
    SELECT c.*, u.full_name
    FROM Contributions c
    INNER JOIN GroupMembers gm ON gm.member_id = c.member_id
    INNER JOIN Users u ON u.user_id = gm.user_id
    WHERE c.group_id = ?
    ORDER BY c.initiated_at DESC
  `,
      [groupId]
    );

    return res.json(rows);
  })
);

router.get(
  "/:groupId/repayments",
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.groupId);
    const [rows] = await pool.query(
      `SELECT r.*, u.full_name, l.loan_id
       FROM LoanRepayments r
       INNER JOIN Loans l ON l.loan_id = r.loan_id
       INNER JOIN GroupMembers gm ON gm.member_id = r.member_id
       INNER JOIN Users u ON u.user_id = gm.user_id
       WHERE l.group_id = ?
       ORDER BY r.initiated_at DESC`,
      [groupId]
    );
    return res.json(rows);
  })
);

router.get(
  "/:groupId/loans",
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.groupId);

    const [rows] = await pool.query(
      `SELECT l.*, u.full_name, gm.user_id AS borrower_user_id
       FROM Loans l
       INNER JOIN GroupMembers gm ON gm.member_id = l.member_id
       INNER JOIN Users u ON u.user_id = gm.user_id
       WHERE l.group_id = ?
       ORDER BY l.requested_at DESC`,
      [groupId]
    );

    // 🔥 SAFE accrual processing (no crashes)
    for (const row of rows) {
      if (row.status === "APPROVED") {
        try {
          await persistAccruedLoan(pool, row.loan_id);
        } catch (err) {
          console.error(
            `❌ Accrual failed for loan ${row.loan_id}:`,
            err.message
          );
          // continue instead of crashing everything
        }
      }
    }

    // Fetch updated data after accrual attempts
    const [updated] = await pool.query(
      `SELECT l.*, u.full_name, gm.user_id AS borrower_user_id
       FROM Loans l
       INNER JOIN GroupMembers gm ON gm.member_id = l.member_id
       INNER JOIN Users u ON u.user_id = gm.user_id
       WHERE l.group_id = ?
       ORDER BY l.requested_at DESC`,
      [groupId]
    );

    return res.json(updated);
  })
);


export default router;
