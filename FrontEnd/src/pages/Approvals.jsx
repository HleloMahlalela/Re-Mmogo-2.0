import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";

function formatWhen(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export default function Approvals() {
  const [data, setData] = useState({ contributions: [], loans: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: body } = await api.get("/approvals");
      setData({
        contributions: body.contributions || [],
        loans: body.loans || [],
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load approvals.");
      setData({ contributions: [], loans: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    const c = (data.contributions || []).map((row) => ({
      key: `contribution-${row.contribution_id}`,
      kind: "CONTRIBUTION",
      id: row.contribution_id,
      groupName: row.group_name,
      title: `${row.member_name || "Member"} · P${Number(row.amount || 0).toLocaleString()}`,
      subtitle: row.contribution_month || "—",
      when: row.initiated_at,
      fields: [
        ["TYPE", "Contribution"],
        ["GROUP", row.group_name || "—"],
        ["AMOUNT", `P${Number(row.amount || 0).toLocaleString()}`],
        ["MONTH", row.contribution_month || "—"],
        ["REQUESTED", formatWhen(row.initiated_at)],
      ],
    }));
    const l = (data.loans || []).map((row) => ({
      key: `loan-${row.loan_id}`,
      kind: "LOAN",
      id: row.loan_id,
      groupName: row.group_name,
      title: `${row.member_name || "Member"} · loan request`,
      subtitle: row.notes || "—",
      when: row.requested_at,
      fields: [
        ["TYPE", "Loan"],
        ["GROUP", row.group_name || "—"],
        ["PRINCIPAL", `P${Number(row.principal || 0).toLocaleString()}`],
        ["OUTSTANDING", `P${Number(row.outstanding || 0).toLocaleString()}`],
        ["REQUESTED", formatWhen(row.requested_at)],
      ],
    }));
    return [...c, ...l].sort(
      (a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime()
    );
  }, [data]);

  const decideContribution = async (contributionId, decision) => {
    setActingId(`contribution-${contributionId}`);
    setError("");
    try {
      await api.post(`/contributions/${contributionId}/approve`, { decision });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update contribution.");
    } finally {
      setActingId(null);
    }
  };

  const decideLoan = async (loanId, decision) => {
    setActingId(`loan-${loanId}`);
    setError("");
    try {
      await api.post(`/loans/${loanId}/approve`, { decision });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update loan.");
    } finally {
      setActingId(null);
    }
  };

  const pendingCount = items.length;

  return (
    <AppLayout
      title="Signatory approvals"
      subtitle={
        loading
          ? "Loading…"
          : pendingCount === 0
            ? "No pending items"
            : `${pendingCount} pending item(s)`
      }
    >
      {error ? <p className="error-text">{error}</p> : null}
      {loading ? (
        <p className="muted">Loading pending approvals…</p>
      ) : items.length === 0 ? (
        <p className="muted">Nothing needs your vote right now.</p>
      ) : (
        items.map((item) => (
          <section className="approval-card" key={item.key}>
            <div className="approval-top">
              <span className="pill yellow">
                {item.kind === "CONTRIBUTION" ? "CONTRIBUTION" : "LOAN"}
              </span>
              <span className="pill yellow">Pending</span>
            </div>
            <h3 style={{ margin: "6px 0 10px" }}>{item.title}</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              {item.groupName} · {item.subtitle}
            </p>
            <div className="approval-details">
              {item.fields.map((field) => (
                <div key={field[0]}>
                  <div className="small-label" style={{ margin: 0 }}>
                    {field[0]}
                  </div>
                  <div style={{ fontWeight: 600, marginTop: 6 }}>{field[1]}</div>
                </div>
              ))}
            </div>
            <div className="approval-actions">
              <button
                className="primary-btn"
                type="button"
                disabled={actingId !== null}
                onClick={() =>
                  item.kind === "CONTRIBUTION"
                    ? decideContribution(item.id, "APPROVED")
                    : decideLoan(item.id, "APPROVED")
                }
              >
                ✓ Approve
              </button>
              <button
                className="danger-btn"
                type="button"
                disabled={actingId !== null}
                onClick={() =>
                  item.kind === "CONTRIBUTION"
                    ? decideContribution(item.id, "REJECTED")
                    : decideLoan(item.id, "REJECTED")
                }
              >
                ✕ Reject
              </button>
            </div>
          </section>
        ))
      )}
    </AppLayout>
  );
}
