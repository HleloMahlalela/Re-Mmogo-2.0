/**
 * Monthly compound interest on loan balance (rate percent per month).
 * next_accrual_date is the first calendar day on which the next accrual applies.
 */

function toUtcDateOnly(d) {
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
}

export function formatYmdUtc(d) {
  if (!d || isNaN(new Date(d))) {
    return null; // 🔥 prevent NaN-NaN-NaN
  }

  const x = toUtcDateOnly(d);
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, "0");
  const day = String(x.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** First day of the month after `d` (UTC). */
export function firstDayOfNextMonthUtc(d) {
  const x = toUtcDateOnly(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 1));
}

export function accrueLoanBalance(loan, monthlyRatePct, asOf = new Date()) {
  let outstanding = Number(loan.outstanding || 0);

  if (outstanding <= 0) {
    return { outstanding: 0, next_accrual_date: loan.next_accrual_date };
  }

  if (loan.status !== "APPROVED" || !loan.next_accrual_date) {
    return { outstanding, next_accrual_date: loan.next_accrual_date };
  }

  const r = Number(monthlyRatePct || 0) / 100;
  if (r <= 0) {
    return { outstanding, next_accrual_date: loan.next_accrual_date };
  }

  // 🔥 SAFE DATE PARSE
  const rawNext = loan.next_accrual_date;
  const parsedNext = new Date(`${rawNext}T00:00:00.000Z`);

  if (!rawNext || isNaN(parsedNext)) {
    return { outstanding, next_accrual_date: loan.next_accrual_date };
  }

  let next = parsedNext;
  const end = toUtcDateOnly(asOf);

  let guard = 0;
  while (next <= end && guard < 600) {
    outstanding = Number((outstanding * (1 + r)).toFixed(2));
    next = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 1));
    guard += 1;
  }

  return {
    outstanding,
    next_accrual_date: formatYmdUtc(next),
  };
}

export async function persistAccruedLoan(pool, loanId, monthlyRatePct) {
  const [rows] = await pool.query("SELECT * FROM Loans WHERE loan_id = ?", [loanId]);
  let loan = rows[0];
  if (!loan) return null;

  // 🔥 Ensure base dates exist
  if (loan.status === "APPROVED" && !loan.next_accrual_date) {
    const base = loan.disbursed_at
      ? new Date(loan.disbursed_at)
      : loan.requested_at
      ? new Date(loan.requested_at)
      : new Date();

    if (isNaN(base)) {
      return loan;
    }

    const nextStr = formatYmdUtc(firstDayOfNextMonthUtc(base));

    await pool.query(
      `UPDATE Loans
       SET disbursed_at = COALESCE(disbursed_at, ?),
           next_accrual_date = ?
       WHERE loan_id = ?`,
      [base, nextStr || null, loanId]
    );

    const [again] = await pool.query("SELECT * FROM Loans WHERE loan_id = ?", [loanId]);
    loan = again[0];
  }

  const [gRows] = await pool.query(
    "SELECT interest_rate FROM MotsheloGroups WHERE group_id = ?",
    [loan.group_id]
  );

  const rate = monthlyRatePct ?? Number(gRows[0]?.interest_rate ?? 20);

  const { outstanding, next_accrual_date } = accrueLoanBalance(loan, rate);

  if (
    outstanding !== Number(loan.outstanding) ||
    next_accrual_date !== loan.next_accrual_date
  ) {
    await pool.query(
      "UPDATE Loans SET outstanding = ?, next_accrual_date = ? WHERE loan_id = ?",
      [outstanding, next_accrual_date || null, loanId] // 🔥 safe write
    );
  }

  const [out] = await pool.query("SELECT * FROM Loans WHERE loan_id = ?", [loanId]);
  return out[0];
}