/* import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [{ label: "Dashboard", to: "/dashboard" }, 
                  { label: "My Groups", to: "/dashboard" },
                  { label: "Contribution", to: "/dashboard" },
                  {label: "Loans", to: "/dashboard"}];

const signatoryItems = [{ label: "Approvals", to: "/approvals" },
                        { label: "Reports", to: "/approvals" }
];

export default function AppLayout({
  title,
  subtitle,
  actions,
  children,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.full_name || "?")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="screen">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h3>Re-Mmogo</h3>
          <p>Savings Platform</p>
        </div>
        <hr />
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className="nav-link">
            <span className="dot" />
            {item.label}
          </NavLink>
        ))}
        <p className="nav-section">SIGNATORY</p>
        {signatoryItems.map((item) => (
          <NavLink key={item.to} to={item.to} className="nav-link">
            <span className="dot" />
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-bottom">
          <div className="avatar">{initials.slice(0, 2).toUpperCase() || "?"}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{user?.full_name || "Signed out"}</div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              style={{
                border: 0,
                background: "transparent",
                color: "rgba(255,255,255,0.55)",
                fontSize: 10,
                padding: 0,
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="main-header">
          <div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="header-actions">{actions}</div>
        </header>
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
}
 */
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AppLayout.css";

const navSections = [
  {
    title: null,
    items: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "My Groups", to: "/groups" },
      { label: "Contribution", to: "/contributions" },
      { label: "Loans", to: "/loans" },
    ],
  },
  {
    title: "SIGNATORY",
    items: [
      { label: "Approvals", to: "/approvals" },
      { label: "Reports", to: "/reports" },
    ],
  },
];

export default function AppLayout({
  title,
  subtitle,
  actions,
  children,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Safer initials logic
  const initials = user?.full_name
    ? user.full_name
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("")
    : "?";

  const handleLogout = async () => {
    try {
      await logout(); // safer if async
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      navigate("/login");
    }
  };

  return (
    <div className="screen">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h3>Re-Mmogo</h3>
          <p>Savings Platform</p>
        </div>

        <hr />

        {navSections.map((section, index) => (
          <div key={index}>
            {section.title && (
              <p className="nav-section">{section.title}</p>
            )}

            {section.items.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                <span className="dot" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        {/* USER */}
        <div className="sidebar-bottom">
          <div className="avatar">
            {initials.slice(0, 2) || "?"}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>
              {user?.full_name || "Signed out"}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="logout-btn"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        <header className="main-header">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <div className="header-actions">{actions}</div>
        </header>

        <main className="page-body">{children}</main>
      </div>
    </div>
  );
}