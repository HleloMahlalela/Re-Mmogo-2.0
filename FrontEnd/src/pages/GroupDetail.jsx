import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";

export default function GroupDetail() {
  const { groupId } = useParams();

  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [memberForm, setMemberForm] = useState({ email: "" });

  const group = groups.find((g) => g.group_id == groupId);

  const loadData = async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}/members`);
      setMembers(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load group details.");
    }
  };

  const loadGroups = async () => {
    try {
      const { data } = await api.get("/groups");
      setGroups(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load groups.");
    }
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  useEffect(() => {
    loadGroups();
  }, []);

  const addMember = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post(`/groups/${groupId}/members`, memberForm);
      setMemberForm({ email: "" });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not enroll member.");
    }
  };

  return (
    <AppLayout
      title={group?.group_name || "Group"}
      subtitle={`Group Year: ${group?.year || "-"} · Members: ${group?.member_count || 0}`}
      actions={
        <>
          <button className="secondary-btn" type="button">
            Export
          </button>
          <button className="primary-btn" type="submit" form="enroll-member">
            + Enroll Member
          </button>
        </>
      }
    >
      <div className="tabs">
        <Link className="active" to={`/groups/${groupId}`}>
          Members
        </Link>
        <Link to={`/contributions/${groupId}`}>Contributions</Link>
        <Link to={`/groups/${groupId}/loans`}>Loans</Link>
        <Link to={`/groups/${groupId}/reports`}>Reports</Link>
      </div>

      {error && <p className="error-text">{error}</p>}

      {/* Enroll form */}
      <form id="enroll-member" onSubmit={addMember} style={{ marginBottom: 12 }}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="email">MEMBER EMAIL</label>
            <input
              id="email"
              type="email"
              required
              value={memberForm.email}
              onChange={(e) => setMemberForm({ email: e.target.value })}
            />
          </div>
        </div>
      </form>

      {/* Members table */}
      <section className="panel members-table">
        <div className="thead">
          <span>MEMBER</span>
          <span>ROLE</span>
          <span>JOINED</span>
          <span>PHONE</span>
          <span>STATUS</span>
        </div>

        {members.length === 0 ? (
          <p>No members found. Add a member</p>
        ) : (
          members.map((member) => (
            <div className="row" key={member.member_id}>
              <div className="member-item">
                <div className="avatar">
                  {member.full_name
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")}
                </div>

                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>
                    {member.full_name}
                  </div>

                  <div className="muted">{member.email || "—"}</div>
                </div>
              </div>

              <span className={member.is_signatory ? "pill yellow" : "muted"}>
                {member.is_signatory ? "✦ Signatory" : "Member"}
              </span>

              <span className="muted">
                {member.joined_at
                  ? new Date(member.joined_at).toLocaleDateString()
                  : "—"}
              </span>

              <span className="muted">{member.phone || "—"}</span>

              <span className={`pill ${member.is_active ? "green" : "red"}`}>
                {member.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          ))
        )}
      </section>
    </AppLayout>
  );
}