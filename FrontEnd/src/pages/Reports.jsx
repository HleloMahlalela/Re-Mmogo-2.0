import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";

export default function Reports() {
  const { groupId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/reports/${groupId}/yearend`);
        setReport(data);
      } catch (err) {
        setReport(null);
        setError(err.response?.data?.message || "Failed to load report.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId]);

  const monthly = report?.monthly_contributions || [];
  const memberTotals = report?.member_contribution_totals || [];
  const interestProgress = report?.interest_progress || [];
  const maxMonthly = Math.max(...monthly.map((m) => Number(m.total) || 0), 0, 1);
  const maxMember = Math.max(...memberTotals.map((m) => Number(m.total_contributions) || 0), 0, 1);

  return (
    <AppLayout
      title="Year-End Report"
      subtitle={
        report
          ? `${report.group_name} · FY ${report.year}`
          : `Group · ${groupId}`
      }
    >
      {error ? <p className="error-text">{error}</p> : null}
      {loading ? (
        <p className="muted">Loading report…</p>
      ) : report ? (
        <>
          <section className="kpi-banner">
            <h2 className="report-kpi-title">Financial summary</h2>
            <p className="report-kpi-meta">
              {report.group_name} · {report.member_count} active member(s) · FY {report.year}
            </p>
            <div className="kpi-grid">
              <div>
                <strong>P{Number(report.total_contributions || 0).toLocaleString()}</strong>
                <p>Total contributions (approved)</p>
              </div>
              <div>
                <strong>
                  P{Number(report.total_loan_repayments || report.total_interest || 0).toLocaleString()}
                </strong>
                <p>Approved loan repayments (FY)</p>
              </div>
              <div>
                <strong>P{Number(report.pool_value || 0).toLocaleString()}</strong>
                <p>Combined pool value</p>
              </div>
              <div>
                <strong>P{Number(report.avg_pool_share_per_member || 0).toLocaleString()}</strong>
                <p>Avg pool share / member</p>
              </div>
            </div>
            <p className="report-kpi-detail">
              Top contributor: <strong>{report.top_contributor}</strong> · Lowest:{" "}
              <strong>{report.lowest_contributor}</strong>
            </p>
            <p className="report-kpi-detail">
              Most loan repayments (FY): <strong>{report.top_loan_payer}</strong> · Least:{" "}
              <strong>{report.lowest_loan_payer}</strong>
            </p>
            <p className="report-kpi-detail">
              Monthly contribution rule: P{Number(report.monthly_contrib || 0).toLocaleString()} ·
              Interest target / member / year: P{Number(report.target_interest || 0).toLocaleString()}{" "}
              · Loan rate: {Number(report.interest_rate || 0)}% on balance / month
            </p>
          </section>

          <section className="charts">
            <article className="chart-card">
              <strong>Approved contributions by month</strong>
              {monthly.length === 0 ? (
                <p className="muted" style={{ marginTop: 12 }}>
                  No monthly data yet.
                </p>
              ) : (
                <div className="bars">
                  {monthly.map((row, idx) => (
                    <div
                      key={`${row.month_label}-${idx}`}
                      style={{
                        height: `${Math.max(4, (row.total / maxMonthly) * 140)}px`,
                      }}
                      title={`${row.month_label}: P${Number(row.total).toLocaleString()}`}
                    />
                  ))}
                </div>
              )}
            </article>
            <article className="chart-card">
              <strong>Approved contributions per member</strong>
              {memberTotals.length === 0 ? (
                <p className="muted" style={{ marginTop: 12 }}>
                  No per-member totals yet.
                </p>
              ) : (
                <div className="bars gold">
                  {memberTotals.map((row, idx) => (
                    <div
                      key={`${row.full_name}-${idx}`}
                      style={{
                        height: `${Math.max(4, (row.total_contributions / maxMember) * 140)}px`,
                      }}
                      title={`${row.full_name}: P${row.total_contributions.toLocaleString()}`}
                    />
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="table-card member-report-table">
            <div className="table-head">
              <strong>Member contribution totals (approved)</strong>
            </div>
            {memberTotals.length === 0 ? (
              <p className="muted" style={{ padding: "16px", margin: 0 }}>
                No rows to show.
              </p>
            ) : (
              <>
                <div className="payout-row muted" style={{ fontWeight: 600, fontSize: 11 }}>
                  <span>#</span>
                  <span>Member</span>
                  <span>Contributions (FY)</span>
                  <span>Est. equal payout</span>
                  <span>Loan repay (FY)</span>
                  <span>Target met</span>
                </div>
                {memberTotals.map((row, idx) => {
                  const ip = interestProgress.find((x) => x.full_name === row.full_name);
                  return (
                    <div className="payout-row" key={`${row.full_name}-${idx}`}>
                      <span>{idx + 1}</span>
                      <span>{row.full_name}</span>
                      <span>P{Number(row.total_contributions || 0).toLocaleString()}</span>
                      <span>P{Number(row.estimated_payout_share || 0).toLocaleString()}</span>
                      <span>P{Number(ip?.payments_toward_loans || 0).toLocaleString()}</span>
                      <span>{ip?.met_target ? "Yes" : "No"}</span>
                    </div>
                  );
                })}
              </>
            )}
          </section>
        </>
      ) : (
        <p className="muted">No report data.</p>
      )}
    </AppLayout>
  );
}
