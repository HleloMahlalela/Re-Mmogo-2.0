/** Motshelo rules: two distinct signatories must approve disbursements and payments. */
export const REQUIRED_SIGNATORY_APPROVALS = 2;

export async function countActiveSignatories(pool, groupId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n FROM GroupMembers
     WHERE group_id = ? AND is_signatory = TRUE AND is_active = TRUE`,
    [groupId]
  );
  return Number(rows[0]?.n || 0);
}

export async function countDistinctContributionApprovals(pool, contributionId) {
  const [rows] = await pool.query(
    `SELECT COUNT(DISTINCT signatory_id) AS n FROM ContributionApprovals
     WHERE contribution_id = ? AND decision = 'APPROVED'`,
    [contributionId]
  );
  return Number(rows[0]?.n || 0);
}

export async function hasContributionRejection(pool, contributionId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM ContributionApprovals
     WHERE contribution_id = ? AND decision = 'REJECTED' LIMIT 1`,
    [contributionId]
  );
  return rows.length > 0;
}

export async function countDistinctLoanApprovals(pool, loanId) {
  const [rows] = await pool.query(
    `SELECT COUNT(DISTINCT signatory_id) AS n FROM LoanApprovals
     WHERE loan_id = ? AND decision = 'APPROVED'`,
    [loanId]
  );
  return Number(rows[0]?.n || 0);
}

export async function hasLoanRejection(pool, loanId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM LoanApprovals WHERE loan_id = ? AND decision = 'REJECTED' LIMIT 1`,
    [loanId]
  );
  return rows.length > 0;
}

export async function countDistinctRepaymentApprovals(pool, repaymentId) {
  const [rows] = await pool.query(
    `SELECT COUNT(DISTINCT signatory_id) AS n FROM LoanRepaymentApprovals
     WHERE repayment_id = ? AND decision = 'APPROVED'`,
    [repaymentId]
  );
  return Number(rows[0]?.n || 0);
}

export async function hasRepaymentRejection(pool, repaymentId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM LoanRepaymentApprovals
     WHERE repayment_id = ? AND decision = 'REJECTED' LIMIT 1`,
    [repaymentId]
  );
  return rows.length > 0;
}

export function approvalsMet(signatoryCount, distinctApproved) {
  if (signatoryCount < REQUIRED_SIGNATORY_APPROVALS) return false;
  return distinctApproved >= REQUIRED_SIGNATORY_APPROVALS;
}
