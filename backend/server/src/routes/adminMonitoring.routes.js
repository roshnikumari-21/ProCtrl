// routes/adminMonitoring.routes.js
import express from "express";
import TestAttempt from "../models/TestAttempt.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

/**
 * ===============================
 * GET SINGLE ATTEMPT (ADMIN)
 * ===============================
 */
router.get(
  "/attempts/:attemptId",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const attempt = await TestAttempt.findById(req.params.attemptId)
        .populate("test", "title duration activeTill")
        .populate("answers.question", "questionText type marks");

      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }

      res.json(attempt);
    } catch (err) {
      console.error("Fetch attempt error:", err);
      res.status(500).json({ message: "Failed to fetch attempt" });
    }
  }
);

// GET all attempts for a test (ADMIN)
router.get(
  "/tests/:testId/attempts",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const attempts = await TestAttempt.find({
        test: req.params.testId,
      }).sort({ createdAt: -1 });

      res.json(attempts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch attempts" });
    }
  }
);


export default router;
