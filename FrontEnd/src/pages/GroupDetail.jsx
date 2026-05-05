import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";

export default function GroupDetail() {
  const { groupId } = useParams();
  const { user } = useAuth();

  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [memberForm, setMemberForm] = useState({ email: "", as_signatory: false });
  const [actingId, setActingId] = useState(null);

  const group = groups.find((g) => g.group_id == groupId);
  const signatoryCount = members.filter((m) => m.is_signatory).length;
  const iAmSignatory = members.some(
    (m) => user && Number(m.user_id) === Number(user.user_id) && m.is_signatory
  );

  const loadData = useCallback(async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}/members`);
      setMembers(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load group details.");
    }
  }, [groupId]);

  const loadGroups = useCallback(async () => {
    try {
      const { data } = await api.get("/groups");
      setGroups(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load groups.");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const addMember = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post(`/groups/${groupId}/members`, {
        email: memberForm.email,
        as_signatory: memberForm.as_signatory,
      });
      setMemberForm({ email: "", as_signatory: false });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not enroll member.");
    }
  };

  const promoteSignatory = async (memberId) => {
    setError("");
    setActingId(memberId);
    try {
      await api.patch(`/groups/${groupId}/members/${memberId}`, { is_signatory: true });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update signatory.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <AppLayout
      title={group?.group_name || "Group"}
      subtitle={`Group Year: ${group?.year || "-"} · Members: ${group?.member_count || 0} · Signatories: ${signatoryCount}/2`}
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

      {iAmSignatory && signatoryCount < 2 ? (
        <p className="muted" style={{ marginBottom: 12 }}>
          This motshelo needs two signatories before loans or contributions can be fully approved.
          Enroll a co-signatory or promote an existing member.
        </p>
      ) : null}

      <form id="enroll-member" onSubmit={addMember} style={{ marginBottom: 12 }}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="email">MEMBER EMAIL</label>
            <input
              id="email"
              type="email"
              required
              value={memberForm.email}
              onChange={(e) => setMemberForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          {iAmSignatory && signatoryCount < 2 ? (
            <label className="field" style={{ alignSelf: "flex-end", display: "flex", gap: 8 }}>
              <input
                type="checkbox"
                checked={memberForm.as_signatory}
                onChange={(e) =>
                  setMemberForm((p) => ({ ...p, as_signatory: e.target.checked }))
                }
              />
              <span>Appoint as second signatory</span>
            </label>
          ) : null}
        </div>
      </form>

      <section className="panel members-table">
        <div className="thead">
          <span>MEMBER</span>
          <span>ROLE</span>
          <span>JOINED</span>
          <span>PHONE</span>
          <span>STATUS</span>
          <span>ACTION</span>
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
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{member.full_name}</div>

                  <div className="muted">{member.email || "—"}</div>
                </div>
              </div>

              <span className={member.is_signatory ? "pill yellow" : "muted"}>
                {member.is_signatory ? "✦ Signatory" : "Member"}
              </span>

              <span className="muted">
                {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : "—"}
              </span>

              <span className="muted">{member.phone || "—"}</span>

              <span className={`pill ${member.is_active ? "green" : "red"}`}>
                {member.is_active ? "Active" : "Inactive"}
              </span>

              <span>
                {iAmSignatory && signatoryCount < 2 && !member.is_signatory ? (
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={actingId !== null}
                    onClick={() => promoteSignatory(member.member_id)}
                  >
                    Make signatory
                  </button>
                ) : (
                  <span className="muted">—</span>
                )}
              </span>
            </div>
          ))
        )}
      </section>
    </AppLayout>
  );
}
