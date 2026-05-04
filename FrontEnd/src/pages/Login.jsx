import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-layout">
      <section className="auth-hero">
        <h1>
          Re-Mmogo
          <br />
          Motshelo
        </h1>
        <p>Digitising traditional savings groups for a modern Botswana.</p>
        <div className="auth-metrics">
          <div>
            <strong>P1K</strong>
            <span>Monthly Contrib</span>
          </div>
          <div>
            <strong>20%</strong>
            <span>Loan Interest</span>
          </div>
          <div>
            <strong>P5K</strong>
            <span>Interest Target</span>
          </div>
        </div>
      </section>
      <section className="auth-form-panel">
        <h2>Welcome back</h2>
        <p className="sub">Sign in to manage your Motshelo group</p>
        <form className="field-grid" onSubmit={handleSubmit}>
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
          <div className="field">
            <label htmlFor="password">PASSWORD</label>
            <input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
          <p className="auth-footer">
            Don&apos;t have an account? <Link to="/register">Register here</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
