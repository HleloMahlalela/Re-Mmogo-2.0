import express from "express";
import pool from "../db/pool.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();

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

    const [contributions] = await pool.query(
      `SELECT c.*, u.full_name AS member_name, g.group_name
       FROM Contributions c
       INNER JOIN GroupMembers gm ON gm.member_id = c.member_id
       INNER JOIN Users u ON u.user_id = gm.user_id
       INNER JOIN MotsheloGroups g ON g.group_id = c.group_id
       WHERE c.group_id IN (?) AND c.status = 'PENDING'`,
      [groupIds]
    );

    const [loans] = await pool.query(
      `SELECT l.*, u.full_name AS member_name, g.group_name
       FROM Loans l
       INNER JOIN GroupMembers gm ON gm.member_id = l.member_id
       INNER JOIN Users u ON u.user_id = gm.user_id
       INNER JOIN MotsheloGroups g ON g.group_id = l.group_id
       WHERE l.group_id IN (?) AND l.status = 'PENDING'`,
      [groupIds]
    );

    const [repayments] = await pool.query(
      `SELECT r.*, u.full_name AS member_name, g.group_name, l.principal AS loan_principal
       FROM LoanRepayments r
       INNER JOIN Loans l ON l.loan_id = r.loan_id
       INNER JOIN GroupMembers gm ON gm.member_id = r.member_id
       INNER JOIN Users u ON u.user_id = gm.user_id
       INNER JOIN MotsheloGroups g ON g.group_id = l.group_id
       WHERE l.group_id IN (?) AND r.status = 'PENDING'`,
      [groupIds]
    );

    return res.json({ contributions, loans, repayments });
  })
);

export default router;
