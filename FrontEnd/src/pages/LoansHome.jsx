import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";
import "./HomePickGroup.css";

export default function LoansHome() {
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
    <AppLayout title="Loans" subtitle="Pick a group to request or review loans">
      {error ? <p className="error-text">{error}</p> : null}
      <div className="pick-grid">
        {groups.length === 0 ? (
          <p className="muted">No groups found. Create one from Dashboard.</p>
        ) : (
          groups.map((g) => (
            <Link key={g.group_id} className="pick-card" to={`/groups/${g.group_id}/loans`}>
              <strong>{g.group_name}</strong>
              <span className="muted">Rate {g.interest_rate || 20}% · {g.member_count || 0} members</span>
            </Link>
          ))
        )}
      </div>
    </AppLayout>
  );
}

