import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";

export default function Loans() {
  const { groupId } = useParams();
  const [loans, setLoans] = useState([]);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ principal: 1000, notes: "" });

  const group = groups.find((g) => String(g.group_id) === String(groupId));
  const interestPct = Number(group?.interest_rate ?? 20);
  const rateFactor = 1 + interestPct / 100;

  const loadGroups = async () => {
    try {
      const { data } = await api.get("/groups");
      setGroups(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load groups.");
    }
  };

  const loadLoans = async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}/loans`);
      setLoans(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load loans.");
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    loadLoans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const requestLoan = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/loans", {
        group_id: Number(groupId),
        principal: Number(form.principal),
        notes: form.notes,
      });
      setForm({ principal: 1000, notes: "" });
      await loadLoans();
    } catch (err) {
      setError(err.response?.data?.message || "Loan request failed.");
    }
  };

  const voteLoan = async (loanId, decision) => {
    try {
      await api.post(`/loans/${loanId}/approve`, { decision });
      await loadLoans();
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit vote.");
    }
  };

  const activeCount = loans.filter((l) => l.status === "APPROVED").length;

  return (
    <AppLayout
      title="Loans"
      subtitle={
        group?.group_name
          ? `${group.group_name} · ${activeCount} active loan(s)`
          : `Group · ${groupId}`
      }
      actions={
        <button className="primary-btn" type="submit" form="loan-form">
          + Request Loan
        </button>
      }
    >
      {error ? <p className="error-text">{error}</p> : null}
      <div className="two-col">
        <section>
          {loans.length === 0 ? (
            <p className="muted">No loan records for this group yet.</p>
          ) : (
            loans.map((loan) => (
              <article className="group-card" key={loan.loan_id} style={{ marginBottom: 14 }}>
                <div className="group-content">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 20 }}>
                        {loan.full_name || "Borrower"}
                      </h4>
                      <p className="muted" style={{ marginTop: 3 }}>
                        LOAN-{loan.loan_id} ·{" "}
                        {loan.status === "PENDING" ? "Awaiting approval" : loan.status}
                      </p>
                    </div>
                    <span
                      className={`pill ${
                        loan.status === "REJECTED"
                          ? "red"
                          : loan.status === "PENDING"
                            ? "yellow"
                            : "green"
                      }`}
                    >
                      {loan.status === "APPROVED" ? "Active" : loan.status}
                    </span>
                  </div>
                  <div className="group-stats">
                    <div>
                      <span>Principal</span>
                      <strong>P{Number(loan.principal || 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span>Outstanding</span>
                      <strong
                        style={{
                          color: loan.status === "APPROVED" ? "#C62828" : "#0d1b0e",
                        }}
                      >
                        P{Number(loan.outstanding || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span>Notes</span>
                      <strong>{loan.notes || "—"}</strong>
                    </div>
                  </div>
                  {loan.status === "PENDING" ? (
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={() => voteLoan(loan.loan_id, "APPROVED")}
                      >
                        Approve
                      </button>
                      <button
                        className="danger-btn"
                        type="button"
                        onClick={() => voteLoan(loan.loan_id, "REJECTED")}
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </section>

        <section className="form-card">
          <div className="form-card-header">Request a Loan</div>
          <form className="form-card-body" id="loan-form" onSubmit={requestLoan}>
            <p className="small-label">GROUP</p>
            <input value={group?.group_name || "—"} readOnly />
            <p className="small-label">LOAN AMOUNT (BWP)</p>
            <input
              id="principal"
              type="number"
              min={1}
              required
              value={form.principal}
              onChange={(e) => setForm((p) => ({ ...p, principal: e.target.value }))}
            />
            <p className="small-label">PURPOSE / NOTES</p>
            <input
              id="notes"
              required
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
            <div className="soft-box" style={{ marginTop: 12 }}>
              <p className="small-label" style={{ marginTop: 0, color: "#2E5E32" }}>
                LOAN ESTIMATE (GROUP RATE {interestPct}% / MONTH)
              </p>
              <div className="muted">
                Principal: P{Number(form.principal || 0).toLocaleString()}
              </div>
              <div className="muted">
                After 1 month: P
                {Math.round(Number(form.principal || 0) * rateFactor).toLocaleString()}
              </div>
              <div className="muted">
                After 2 months: P
                {Math.round(Number(form.principal || 0) * rateFactor ** 2).toLocaleString()}
              </div>
            </div>
            <button className="primary-btn" style={{ width: "100%", marginTop: 14 }} type="submit">
              Submit Loan Request
            </button>
            <p className="muted" style={{ textAlign: "center", marginBottom: 0 }}>
              Signatories approve before disbursement.
            </p>
            <p className="muted">
              <Link to={`/groups/${groupId}`}>Back to group</Link>
            </p>
          </form>
        </section>
      </div>
    </AppLayout>
  );
}
