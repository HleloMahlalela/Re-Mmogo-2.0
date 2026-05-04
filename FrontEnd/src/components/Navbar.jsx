import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <Link to="/dashboard" className="brand">
        Re-Mmogo
      </Link>
      <nav className="nav-links">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/dashboard"> My Groups</NavLink>
        <NavLink to="/dashboard">Contributions</NavLink>
        <NavLink to="/dashboard">Loans</NavLink>
      </nav>
      <div className="nav-right">
        <span className="user-chip">{user?.full_name || "User"}</span>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
