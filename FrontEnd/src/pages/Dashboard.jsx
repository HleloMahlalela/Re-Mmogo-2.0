import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";

const initialGroup = {
  group_name: "",
  description: "",
  year: new Date().getFullYear(),
  interest_rate: 20,
  monthly_contrib: 0,
};

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(initialGroup);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadGroups = async () => {
    try {
      const { data } = await api.get("/groups");
      setGroups(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load groups.");
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const totals = useMemo(() => {
    const totalMembers = groups.reduce(
      (sum, group) => sum + Number(group.member_count || 0),
      0
    );
    const totalMonthly = groups.reduce(
      (sum, group) => sum + Number(group.monthly_contrib || 0),
      0
    );
    const averageInterest = groups.length
      ? (
        groups.reduce(
          (sum, group) => sum + Number(group.interest_rate || 0),
          0
        ) / groups.length
      ).toFixed(1)
      : "0";

    return {
      totalGroups: groups.length,
      totalMembers,
      totalMonthly,
      averageInterest,
    };
  }, [groups]);

  const createGroup = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/groups", {
        group_name: form.group_name,
        description: form.description,
        year: Number(form.year) || new Date().getFullYear(),
        interest_rate: Number(form.interest_rate) || 0,
        monthly_contrib: Number(form.monthly_contrib) || 0,
      });

      setForm(initialGroup);
      await loadGroups();

      setShowForm(false);

    } catch (err) {
      setError(err.response?.data?.message || "Could not create group.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="Dashboard"
      subtitle={new Date().toLocaleDateString("en-BW", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })}
      actions={
        <>
          <button className="secondary-btn" type="button">
            Export
          </button>

          <button
            className="primary-btn"
            type="button"
            onClick={() => {
              setError("");
              setShowForm(true);
            }}
            disabled={loading}
          >
            + New Group
          </button>
        </>
      }
    >
      <section className="stats-grid">
        <article className="stat-card">
          <h4>TOTAL GROUPS</h4>
          <strong>{totals.totalGroups}</strong>
          <p>Across your portfolio</p>
        </article>

        <article className="stat-card">
          <h4>TOTAL MEMBERS</h4>
          <strong>{totals.totalMembers}</strong>
          <p>Across all groups</p>
        </article>

        <article className="stat-card">
          <h4>MONTHLY CONTRIBUTIONS</h4>
          <strong>P{totals.totalMonthly.toLocaleString()}</strong>
          <p>Total target contribution</p>
        </article>

        <article className="stat-card">
          <h4>AVG INTEREST</h4>
          <strong>{totals.averageInterest}%</strong>
          <p>Average group rate</p>
        </article>
      </section>

      <h3 className="section-title">My Motshelo Groups</h3>

      {error && <p className="error-text">{error}</p>}
      <section className="groups-grid">
        {groups.length === 0 ? (
          <p>No groups found. Create one.</p>
        ) : (
          groups.map((group) => ( 
            <Link
              to={`/groups/${group.group_id}`}
              className="group-card"
              key={group.group_id}
            >
              <div className="bar" />

              <div className="group-content">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 24 }}>
                      {group.group_name}
                    </h4>

                    <p className="muted" style={{ marginTop: 4 }}>
                      Group Year: {group.year} · {group.member_count || 0} members
                    </p>
                  </div>

                  <span className="pill green">Active</span>
                </div>

                <div className="group-stats">
                  <div>
                    <strong>P{group.monthly_contrib || 0}</strong>
                    <span>Collected</span>
                  </div>

                  <div>
                    <strong>{group.interest_rate || 0}%</strong>
                    <span>Interest</span>
                  </div>

                  <div>
                    <strong>{group.member_count || 0}</strong>
                    <span>Members</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </section>
      {showForm && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowForm(false);
            setForm(initialGroup);
            setError("");
          }}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Group</h3>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setShowForm(false);
                  setForm(initialGroup);
                  setError("");
                }}
              >
                Cancel
              </button>
            </div>

            <form className="field-grid" onSubmit={createGroup}>
              <div className="field">
                <label htmlFor="group_name">GROUP NAME</label>
                <input
                  id="group_name"
                  type="text"
                  required
                  value={form.group_name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      group_name: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="description">DESCRIPTION</label>
                <input
                  id="description"
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="year">YEAR</label>
                <input
                  id="year"
                  type="number"
                  required
                  value={form.year}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      year: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="monthly_contrib">MONTHLY CONTRIBUTION</label>
                <input
                  id="monthly_contrib"
                  type="number"
                  required
                  value={form.monthly_contrib}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      monthly_contrib: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="interest_rate">INTEREST RATE</label>
                <input
                  id="interest_rate"
                  type="number"
                  required
                  value={form.interest_rate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      interest_rate: Number(e.target.value),
                    }))
                  }
                />
              </div>

              {error && <p className="error-text">{error}</p>}

              <button className="primary-btn" type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create A Group"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}