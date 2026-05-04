import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";
import "./Groups.css";

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/groups");
        setGroups(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load groups.");
      }
    };
    load();
  }, []);

  return (
    <AppLayout title="My Groups" subtitle="Select a motshelo group to continue">
      {error ? <p className="error-text">{error}</p> : null}
      <section className="groups-grid">
        {groups.length === 0 ? (
          <p className="muted">No groups found. Create one from Dashboard.</p>
        ) : (
          groups.map((group) => (
            <Link
              to={`/groups/${group.group_id}`}
              className="group-card"
              key={group.group_id}
            >
              <div className="bar" />
              <div className="group-content">
                <div className="group-card-top">
                  <div>
                    <h4 className="group-title">{group.group_name}</h4>
                    <p className="muted group-sub">
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
    </AppLayout>
  );
}

