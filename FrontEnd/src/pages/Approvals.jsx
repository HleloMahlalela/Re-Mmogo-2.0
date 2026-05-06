import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";

function formatWhen(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function typeLabel(kind) {
  if (kind === "CONTRIBUTION") return "CONTRIBUTION";
  if (kind === "LOAN") return "LOAN";
  return "LOAN REPAYMENT";
}

function voteClass(decision) {
  if (decision === "APPROVED") return "green";
  if (decision === "REJECTED") return "red";
  return "yellow";
}

export default function Approvals() {
  const [data, setData] = useState({ contributions: [], loans: [], repayments: [] });
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
        repayments: body.repayments || [],
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load approvals.");
      setData({ contributions: [], loans: [], repayments: [] });
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
        ["PROOF", row.proof_of_payment || "—"],
        ["REQUESTED", formatWhen(row.initiated_at)],
      ],
      signatoryVotes: row.signatory_votes || [],
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
      signatoryVotes: row.signatory_votes || [],
    }));
    const r = (data.repayments || []).map((row) => ({
      key: `repayment-${row.repayment_id}`,
      kind: "REPAYMENT",
      id: row.repayment_id,
      groupName: row.group_name,
      title: `${row.member_name || "Member"} · repayment P${Number(row.amount || 0).toLocaleString()}`,
      subtitle: row.notes || "—",
      when: row.initiated_at,
      fields: [
        ["TYPE", "Loan repayment"],
        ["GROUP", row.group_name || "—"],
        ["AMOUNT", `P${Number(row.amount || 0).toLocaleString()}`],
        ["LOAN PRINCIPAL", `P${Number(row.loan_principal || 0).toLocaleString()}`],
        ["PROOF", row.proof_of_payment || "—"],
        ["REQUESTED", formatWhen(row.initiated_at)],
      ],
      signatoryVotes: row.signatory_votes || [],
    }));
    return [...c, ...l, ...r].sort(
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

  const decideRepayment = async (repaymentId, decision) => {
    setActingId(`repayment-${repaymentId}`);
    setError("");
    try {
      await api.post(`/loans/repayments/${repaymentId}/approve`, { decision });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update repayment.");
    } finally {
      setActingId(null);
    }
  };

  const approve = (item) => {
    if (item.kind === "CONTRIBUTION") return decideContribution(item.id, "APPROVED");
    if (item.kind === "LOAN") return decideLoan(item.id, "APPROVED");
    return decideRepayment(item.id, "APPROVED");
  };

  const reject = (item) => {
    if (item.kind === "CONTRIBUTION") return decideContribution(item.id, "REJECTED");
    if (item.kind === "LOAN") return decideLoan(item.id, "REJECTED");
    return decideRepayment(item.id, "REJECTED");
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
              <span className="pill yellow">{typeLabel(item.kind)}</span>
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
            <div className="signatory-votes">
              {(item.signatoryVotes || []).map((vote) => (
                <div className="signatory-vote-row" key={`${item.key}-${vote.signatory_id}`}>
                  <span className="muted">{vote.signatory_name}</span>
                  <span className={`pill ${voteClass(vote.decision)}`}>{vote.decision}</span>
                </div>
              ))}
            </div>
            <div className="approval-actions">
              <button
                className="primary-btn"
                type="button"
                disabled={actingId !== null}
                onClick={() => approve(item)}
              >
                ✓ Approve
              </button>
              <button
                className="danger-btn"
                type="button"
                disabled={actingId !== null}
                onClick={() => reject(item)}
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
