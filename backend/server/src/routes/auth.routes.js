import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import validateEmail from "../utils/validateEmail.js";
import { sendWelcomeEmail } from "../utils/sendEmail.js";

const router = express.Router();

router.post("/admin/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      if (existing.role === "admin") {
        return res
          .status(409)
          .json({ message: "User already registered as admin" });
      }

      return res.status(409).json({
        message:
          "This email is already registered as a candidate. Please use a different email to register as admin.",
      });
    }

    const admin = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role: "admin",
      authProvider: "local",
      emailVerified: true,
    });

    sendWelcomeEmail(email, name).catch(console.error);

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Admin registered successfully",
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("Admin register error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});


/* ===============================
   ADMIN LOGIN
=============================== */
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const admin = await User.findOne({ email, role: "admin" });
    if (!admin || admin.authProvider !== "local") {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

router.post("/candidate/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      if (existing.role === "candidate") {
        return res
          .status(409)
          .json({ message: "User already registered as candidate" });
      }

      return res.status(409).json({
        message:
          "This email is already registered as an admin. Please use a different email to register as candidate.",
      });
    }

    const candidate = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role: "candidate",
      authProvider: "local",
      emailVerified: true,
    });

    sendWelcomeEmail(email, name).catch(console.error);

    const token = jwt.sign(
      { id: candidate._id, role: candidate.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Candidate registered successfully",
      token,
      user: {
        id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        role: candidate.role,
      },
    });
  } catch (err) {
    console.error("Candidate register error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});


/* ===============================
   CANDIDATE LOGIN
=============================== */
router.post("/candidate/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const candidate = await User.findOne({ email, role: "candidate" });
    if (!candidate || candidate.authProvider !== "local") {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, candidate.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: candidate._id, role: candidate.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        role: candidate.role,
      },
    });
  } catch (err) {
    console.error("Candidate login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

export default router;
