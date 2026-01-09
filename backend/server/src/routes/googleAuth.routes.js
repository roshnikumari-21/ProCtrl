import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    /* ---------- Validate request ---------- */
    if (!token) {
      return res.status(400).json({ message: "Google token is required" });
    }

    /* ---------- Verify Google token ---------- */
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name } = payload;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Google account email not found" });
    }

    /* ---------- Find existing user ---------- */
    let user = await User.findOne({ email });

    /* ---------- Prevent auth-provider conflict ---------- */
    if (user && user.authProvider === "local") {
      return res.status(409).json({
        message:
          "This email is registered with password login. Please use email & password.",
      });
    }

    /* ---------- Create admin if new ---------- */
    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        role: "admin",
        authProvider: "google",
        googleId: sub,
        emailVerified: true,
      });
    } else {
      /* ---------- Update googleId if needed ---------- */
      if (!user.googleId || user.googleId !== sub) {
        user.googleId = sub;
        await user.save();
      }
    }

    /* ---------- Issue JWT ---------- */
    const jwtToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    /* ---------- Respond ---------- */
    res.status(200).json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Google authentication error:", err);
    res.status(401).json({ message: "Google authentication failed" });
  }
});

router.post("/google/candidate", async (req, res) => {
  try {
    const { token } = req.body;

    /* ---------- Validate request ---------- */
    if (!token) {
      return res.status(400).json({ message: "Google token is required" });
    }

    /* ---------- Verify Google token ---------- */
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name } = payload;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Google account email not found" });
    }

    /* ---------- Find existing user ---------- */
    let user = await User.findOne({ email });

    /* ---------- Prevent auth-provider conflict ---------- */
    if (user && user.authProvider === "local") {
      return res.status(409).json({
        message:
          "This email is registered with password login. Please use email & password.",
      });
    }

    /* ---------- Create candidate if new ---------- */
    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        role: "candidate",
        authProvider: "google",
        googleId: sub,
        emailVerified: true,
      });
    } else {
      /* ---------- Update googleId if needed ---------- */
      if (!user.googleId || user.googleId !== sub) {
        user.googleId = sub;
        await user.save();
      }
    }

    /* ---------- Issue JWT ---------- */
    const jwtToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    /* ---------- Respond ---------- */
    res.status(200).json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Google candidate authentication error:", err);
    res.status(401).json({ message: "Google authentication failed" });
  }
});

export default router;
