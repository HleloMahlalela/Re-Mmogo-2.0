import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import contributionRoutes from "./routes/contributionRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import authRequired from "./middleware/authRequired.js";
import approvalRoutes from "./routes/approvalRoutes.js";


const app = express();
const port = Number(process.env.PORT || 5000);

const normalizeOrigin = (origin) => origin.replace(/\/+$/, "");
const corsOrigins = [
  process.env.CORS_ORIGIN,
  process.env.CORS_ORIGINS,
  "https://re-mmogo-2-0.vercel.app",
]
  .filter(Boolean)
  .flatMap((value) => value.split(","))
  .map((origin) => normalizeOrigin(origin.trim()))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || !corsOrigins.length) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);
      if (corsOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Public routes
app.use("/api/auth", authRoutes);

// Protected routes
app.use("/api/groups", authRequired, groupRoutes);
app.use("/api/contributions", authRequired, contributionRoutes);
app.use("/api/loans", authRequired, loanRoutes);
app.use("/api/reports", authRequired, reportRoutes);
app.use("/api/approvals", authRequired, approvalRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

app.listen(port, () => {
  console.log(`RE-MMOGO backend running at http://localhost:${port}`);
});