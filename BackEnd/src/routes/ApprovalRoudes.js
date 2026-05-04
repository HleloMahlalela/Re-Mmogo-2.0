import express from "express";
import pool from "../db/pool.js";

const router = express.Router();

router.get("/", async (req, res) => {
    const userId = req.user.user_id;

    try {
        // 1. Get groups where user is a signatory
        const [signatoryGroups] = await pool.query(
            `SELECT group_id, member_id 
       FROM GroupMembers
       WHERE user_id = ? AND is_signatory = TRUE AND is_active = TRUE`,
            [userId]
        );

        if (signatoryGroups.length === 0) {
            return res.json({ contributions: [], loans: [] });
        }

        const groupIds = signatoryGroups.map(g => g.group_id);

        // 2. Pending contributions
        const [contributions] = await pool.query(
            `SELECT c.*, u.full_name
       FROM Contributions c
       INNER JOIN GroupMembers gm ON gm.member_id = c.member_id
       INNER JOIN Users u ON u.user_id = gm.user_id
       WHERE c.group_id IN (?) AND c.status = 'PENDING'`,
            [groupIds]
        );

        // 3. Pending loans
        const [loans] = await pool.query(
            `SELECT l.*, u.full_name
       FROM Loans l
       INNER JOIN GroupMembers gm ON gm.member_id = l.member_id
       INNER JOIN Users u ON u.user_id = gm.user_id
       WHERE l.group_id IN (?) AND l.status = 'PENDING'`,
            [groupIds]
        );

        return res.json({ contributions, loans });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load approvals." });
    }
});

export default router;