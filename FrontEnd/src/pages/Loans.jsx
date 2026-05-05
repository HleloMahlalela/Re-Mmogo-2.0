import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";

export default function Loans() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ principal: 1000, notes: "" });
  const [repayForm, setRepayForm] = useState({ loanId: "", amount: "", proof_of_payment: "", notes: "" });

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

  const loadRepayments = async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}/repayments`);
      setRepayments(data);
    } catch {
      setRepayments([]);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    loadLoans();
    loadRepayments();
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

  const submitRepayment = async (e) => {
    e.preventDefault();
    setError("");
    const lid = Number(repayForm.loanId);
    if (!lid) {
      setError("Select a loan.");
      return;
    }
    try {
      await api.post(`/loans/${lid}/repayments`, {
        amount: Number(repayForm.amount),
        proof_of_payment: repayForm.proof_of_payment?.trim() || null,
        notes: repayForm.notes?.trim() || null,
      });
      setRepayForm({ loanId: "", amount: "", proof_of_payment: "", notes: "" });
      await loadLoans();
      await loadRepayments();
    } catch (err) {
      setError(err.response?.data?.message || "Repayment request failed.");
    }
  };

  const activeCount = loans.filter((l) => l.status === "APPROVED").length;
  const myLoans = loans.filter(
    (l) => user && Number(l.borrower_user_id) === Number(user.user_id)
  );

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
                      <h4 style={{ margin: 0, fontSize: 20 }}>{loan.full_name || "Borrower"}</h4>
                      <p className="muted" style={{ marginTop: 3 }}>
                        LOAN-{loan.loan_id} ·{" "}
                        {loan.status === "PENDING" ? "Awaiting two signatories" : loan.status}
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
                    <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                      Use Approvals to vote. Both signatories must approve before funds are active.
                    </p>
                  ) : null}
                </div>
              </article>
            ))
          )}

          {repayments.length > 0 ? (
            <div className="list-card" style={{ marginTop: 20 }}>
              <div className="list-card-header">
                <strong>Repayment requests</strong>
              </div>
              {repayments.map((r) => (
                <div className="list-item" key={r.repayment_id}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.full_name}</div>
                    <div className="muted">Loan #{r.loan_id}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>P{Number(r.amount).toLocaleString()}</div>
                    <span
                      className={`pill ${
                        r.status === "APPROVED" ? "green" : r.status === "REJECTED" ? "red" : "yellow"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
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
                BALANCE GROWS {interestPct}% / MONTH (APPROVED LOANS)
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
              Two signatories must approve before the loan is active.
            </p>
            <p className="muted">
              <Link to={`/groups/${groupId}`}>Back to group</Link>
            </p>
          </form>

          <form className="form-card-body" style={{ borderTop: "1px solid #e8ece9" }} onSubmit={submitRepayment}>
              <div className="form-card-header" style={{ margin: "0 -20px 12px", paddingTop: 8 }}>
                Record loan repayment
              </div>
              {!myLoans.some((l) => l.status === "APPROVED") ? (
                <p className="muted" style={{ marginTop: 0 }}>
                  Your repayment form is ready. It unlocks once one of your loans is approved.
                </p>
              ) : null}
              <p className="small-label">LOAN</p>
              <select
                required
                value={repayForm.loanId}
                onChange={(e) => setRepayForm((p) => ({ ...p, loanId: e.target.value }))}
                disabled={!myLoans.some((l) => l.status === "APPROVED")}
              >
                <option value="">Select your active loan</option>
                {myLoans
                  .filter((l) => l.status === "APPROVED")
                  .map((l) => (
                    <option key={l.loan_id} value={l.loan_id}>
                      #{l.loan_id} · outstanding P{Number(l.outstanding || 0).toLocaleString()}
                    </option>
                  ))}
              </select>
              <p className="small-label">AMOUNT (BWP)</p>
              <input
                type="number"
                min={1}
                required
                value={repayForm.amount}
                onChange={(e) => setRepayForm((p) => ({ ...p, amount: e.target.value }))}
                disabled={!myLoans.some((l) => l.status === "APPROVED")}
              />
              <p className="small-label">PROOF OF PAYMENT</p>
              <textarea
                rows={2}
                placeholder="Bank ref, receipt #, or link"
                value={repayForm.proof_of_payment}
                onChange={(e) => setRepayForm((p) => ({ ...p, proof_of_payment: e.target.value }))}
                style={{ width: "100%" }}
                disabled={!myLoans.some((l) => l.status === "APPROVED")}
              />
              <p className="small-label">NOTES (OPTIONAL)</p>
              <input
                value={repayForm.notes}
                onChange={(e) => setRepayForm((p) => ({ ...p, notes: e.target.value }))}
                disabled={!myLoans.some((l) => l.status === "APPROVED")}
              />
              <button
                className="secondary-btn"
                style={{ width: "100%", marginTop: 12 }}
                type="submit"
                disabled={!myLoans.some((l) => l.status === "APPROVED")}
              >
                Submit repayment (needs two signatories)
              </button>
          </form>
        </section>
      </div>
    </AppLayout>
  );
}
