import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Google token is required" });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub, email, name } = ticket.getPayload();

    if (!email) {
      return res.status(400).json({ message: "Google account email not found" });
    }

    const existing = await User.findOne({ email });

    if (existing && existing.role !== "admin") {
      return res.status(403).json({
        message:
          "This email is already registered as a candidate. Please use a different email to login as admin.",
      });
    }

    let user = existing;

    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        role: "admin",
        authProvider: "google",
        googleId: sub,
        emailVerified: true,
      });
    } else if (!user.googleId) {
      user.googleId = sub;
      user.authProvider = "google";
      await user.save();
    }

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Google admin auth error:", err);
    res.status(401).json({ message: "Google authentication failed" });
  }
});



router.post("/google/candidate", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Google token is required" });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub, email, name } = ticket.getPayload();

    if (!email) {
      return res.status(400).json({ message: "Google account email not found" });
    }

    const existing = await User.findOne({ email });

    if (existing && existing.role !== "candidate") {
      return res.status(403).json({
        message:
          "This email is already registered as an admin. Please use a different email to login as candidate.",
      });
    }

    let user = existing;

    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        role: "candidate",
        authProvider: "google",
        googleId: sub,
        emailVerified: true,
      });
    } else if (!user.googleId) {
      user.googleId = sub;
      user.authProvider = "google";
      await user.save();
    }

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Google candidate auth error:", err);
    res.status(401).json({ message: "Google authentication failed" });
  }
});


export default router;
