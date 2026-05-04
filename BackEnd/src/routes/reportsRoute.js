import express from "express";
import pool from "../db/pool.js";

const router = express.Router();

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
  ); 

  const topContributor = contributorRows.length > 0 ? contributorRows[0].full_name : "N/A";
  const lowestContributor =
    contributorRows.length > 0 ? contributorRows[contributorRows.length - 1].full_name : "N/A";

  return res.json({
    total_contributions: Number(contributionTotals[0].total_contributions || 0),
    total_interest: Number(loanTotals[0].total_interest || 0),
    top_contributor: topContributor,
    lowest_contributor: lowestContributor,
  });
});

export default router