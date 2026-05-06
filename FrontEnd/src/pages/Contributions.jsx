import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";

export default function Contributions() {
  const { groupId } = useParams();
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");

  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [form, setForm] = useState({
    amount: 1000,
    contribution_month: formattedDate,
    proof_of_payment: "",
  });

  const group = groups.find((g) => String(g.group_id) === String(groupId));

  useEffect(() => {
    if (group?.monthly_contrib != null) {
      setForm((prev) => ({
        ...prev,
        amount: Number(group.monthly_contrib),
      }));
    }
  }, [group?.group_id, group?.monthly_contrib]);

  const loadGroups = async () => {
    try {
      const { data } = await api.get("/groups");
      setGroups(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load groups.");
    }
  };

  const load = async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}/contributions`);
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load contributions.");
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (groupId) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/contributions", {
        group_id: Number(groupId),
        amount: Number(form.amount),
        contribution_month: form.contribution_month,
        proof_of_payment: form.proof_of_payment?.trim() || null,
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit contribution.");
    }
  };

  const expected = Number(group?.monthly_contrib ?? 1000);

  return (
    <AppLayout
      title="Contributions"
      subtitle={group?.group_name ? `${group.group_name}` : `Group · ${groupId}`}
    >
      {error ? <p className="error-text">{error}</p> : null}
      <div className="two-col">
        <section className="list-card">
          <div className="list-card-header">
            <strong>Contribution History</strong>
            <span className="pill green">{items.length} Records</span>
          </div>
          {items.length === 0 ? (
            <p className="muted" style={{ padding: "16px 20px", margin: 0 }}>
              No contribution records yet.
            </p>
          ) : (
            items.map((item) => {
              const name = item.full_name || "Member";
              const initials = name
                .split(" ")
                .map((part) => part[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <article className="list-item" key={item.contribution_id}>
                  <div className="member-item">
                    <div className="avatar">{initials || "?"}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{name}</div>
                      <div className="muted">{item.contribution_month || "—"}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      P{Number(item.amount || 0).toLocaleString()}
                    </div>
                    <span
                      className={`pill ${
                        item.status === "APPROVED"
                          ? "green"
                          : item.status === "REJECTED"
                            ? "red"
                            : "yellow"
                      }`}
                    >
                      {item.status || "PENDING"}
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <section className="form-card">
          <div className="form-card-header">Record Contribution</div>
          <form className="form-card-body" onSubmit={submit}>
            <p className="small-label">GROUP</p>
            <input value={group?.group_name || "—"} readOnly />
            <p className="small-label">CONTRIBUTION MONTH</p>
            <input
              value={form.contribution_month}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, contribution_month: e.target.value }))
              }
            />
            <p className="small-label">AMOUNT (BWP)</p>
            <input
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, amount: Number(e.target.value) }))
              }
            />
            <p className="muted" style={{ marginTop: 0, fontSize: 12 }}>
              This group requires exactly P{expected.toLocaleString()} per month.
            </p>
            <p className="small-label">PROOF OF PAYMENT</p>
            <textarea
              rows={3}
              placeholder="e.g. bank ref, receipt number, or link to proof"
              value={form.proof_of_payment}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, proof_of_payment: e.target.value }))
              }
              style={{ width: "100%", resize: "vertical" }}
            />
            <button className="primary-btn" style={{ width: "100%", marginTop: 14 }} type="submit">
              Submit Contribution
            </button>
            <p className="muted" style={{ textAlign: "center" }}>
              Two signatories must approve before this is recorded as paid.
            </p>
          </form>
        </section>
      </div>
    </AppLayout>
  );
}
