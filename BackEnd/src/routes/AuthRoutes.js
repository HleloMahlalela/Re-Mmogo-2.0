import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db/pool.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || "super-secret-change-me";

function publicUser(user) {
  return {
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
  };
}

router.post("/register", asyncHandler(async (req, res) => {
  const { full_name, email, phone, password } = req.body || {};
  if (!full_name || !email || !password) {
    return res.status(400).json({ message: "full_name, email and password are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const [existing] = await pool.query("SELECT user_id FROM Users WHERE email = ?", [normalizedEmail]);
  if (existing.length > 0) {
    return res.status(409).json({ message: "Email already registered." });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const [result] = await pool.query(
    `INSERT INTO Users (full_name, email, phone, password_hash)
     VALUES (?, ?, ?, ?)`,
    [
      String(full_name).trim(),
      normalizedEmail,
      phone ? String(phone).trim() : null,
      passwordHash,
    ]
  );

  const [users] = await pool.query(
    "SELECT user_id, full_name, email, phone FROM Users WHERE user_id = ?",
    [result.insertId]
  );
  return res.status(201).json({ message: "Registration successful.", user: users[0] });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const [rows] = await pool.query("SELECT * FROM Users WHERE email = ?", [normalizedEmail]);
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const valid = await bcrypt.compare(String(password), user.password_hash);
  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const token = jwt.sign({ user_id: user.user_id, email: user.email }, jwtSecret, {
    expiresIn: "7d",
  });
  return res.json({ token, user: publicUser(user) });
}));

export default router;
/*aihsdfbviwebvoebwviou */