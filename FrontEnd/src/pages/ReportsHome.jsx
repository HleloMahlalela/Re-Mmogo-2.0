import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";
import "./HomePickGroup.css";

export default function ReportsHome() {
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
    <AppLayout title="Reports" subtitle="Pick a group to generate the year-end report">
      {error ? <p className="error-text">{error}</p> : null}
      <div className="pick-grid">
        {groups.length === 0 ? (
          <p className="muted">No groups found. Create one from Dashboard.</p>
        ) : (
          groups.map((g) => (
            <Link key={g.group_id} className="pick-card" to={`/groups/${g.group_id}/reports`}>
              <strong>{g.group_name}</strong>
              <span className="muted">FY {g.year} · Export insights</span>
            </Link>
          ))
        )}
      </div>
    </AppLayout>
  );
}

