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
  const maxMonthly = Math.max(...monthly.map((m) => m.total), 0, 1);
  const maxMember = Math.max(...memberTotals.map((m) => m.total_contributions), 0, 1);

  return (
    <AppLayout
      title="Year-End Report"
      subtitle={
        report
          ? `${report.group_name} · FY ${report.year}`
          : `Group · ${groupId}`
      }
      actions={
        <button className="primary-btn" type="button" disabled title="Not implemented yet">
          Download PDF
        </button>
      }
    >
      {error ? <p className="error-text">{error}</p> : null}
      {loading ? (
        <p className="muted">Loading report…</p>
      ) : report ? (
        <>
          <section className="kpi-banner">
            <h2 style={{ margin: 0, fontSize: 32 }}>Financial summary</h2>
            <p style={{ margin: "2px 0 0", opacity: 0.6 }}>
              {report.group_name} · {report.member_count} active member(s) · FY {report.year}
            </p>
            <div className="kpi-grid">
              <div>
                <strong>P{Number(report.total_contributions || 0).toLocaleString()}</strong>
                <p>Total contributions (approved)</p>
              </div>
              <div>
                <strong>P{Number(report.total_interest || 0).toLocaleString()}</strong>
                <p>Interest (approved loans)</p>
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
            <p style={{ margin: "14px 0 0", opacity: 0.75, fontSize: 13 }}>
              Top contributor: <strong>{report.top_contributor}</strong> · Lowest:{" "}
              <strong>{report.lowest_contributor}</strong>
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
                      title={`${row.month_label}: P${row.total.toLocaleString()}`}
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

          <section className="table-card">
            <div className="table-head">
              <strong>Member contribution totals (approved)</strong>
              <button className="secondary-btn" type="button" disabled title="Not implemented yet">
                Export CSV
              </button>
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
                  <span>Approved contributions</span>
                  <span>—</span>
                  <span>—</span>
                  <span>—</span>
                </div>
                {memberTotals.map((row, idx) => (
                  <div className="payout-row" key={`${row.full_name}-${idx}`}>
                    <span>{idx + 1}</span>
                    <span>{row.full_name}</span>
                    <span>P{Number(row.total_contributions || 0).toLocaleString()}</span>
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                  </div>
                ))}
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
