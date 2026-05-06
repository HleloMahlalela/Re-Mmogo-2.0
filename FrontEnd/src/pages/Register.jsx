import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [confirmPassword, setConfirmPassword] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (confirmPassword !== form.password) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-layout register-layout">
      <section className="auth-hero">
        <h1 className="register-hero-title">
          Create your
          <br />
          account
        </h1>
        <div className="register-steps">
          <p>1 Create your personal account with secure credentials</p>
          <p>2 Register or join an existing Motshelo group</p>
          <p>3 Start recording contributions and managing loans</p>
        </div>
      </section>
      <section className="auth-form-panel">
        <h2>Create Account</h2>
        <p className="sub">Join Re-Mmogo - it takes less than a minute</p>
        <form className="field-grid" onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="full_name">FULL NAME</label>
              <input
                id="full_name"
                required
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="phone">PHONE NUMBER</label>
              <input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="email">EMAIL ADDRESS</label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="password">PASSWORD</label>
              <input
                id="password"
                type="password"
                minLength={6}
                required
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="confirm_password">CONFIRM PASSWORD</label>
              <input
                id="confirm_password"
                type="password"
                minLength={6}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
