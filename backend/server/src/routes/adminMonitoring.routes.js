import express from "express";
import TestAttempt from "../models/TestAttempt.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import Test from "../models/Test.js";

const router = express.Router();

/**
 * ===============================
 * GET SINGLE ATTEMPT (ADMIN)
 * ===============================
 */
router.get(
  "/attempts/:attemptId",
  async (req, res) => {
    try {
      const attempt = await TestAttempt.findById(req.params.attemptId)
        .populate({
          path: "test",
          select: "title duration totalScore",
          populate: {
            path: "questions",
            model: "Question",
          },
        })
        .populate("answers.question");

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


router.get(
  "/tests/:testId/attempt-stats",
  authenticate,
  authorize("admin"),
  async (req, res) => {
  try {
    const { testId } = req.params;

    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    const allowedEmails = test.allowedCandidates.map(
      (c) => c.email
    );

    const attempts = await TestAttempt.find({
      test: testId,
      candidateEmail: { $in: allowedEmails },
    });

    const attemptMap = new Map();
    attempts.forEach((a) => {
      attemptMap.set(a.candidateEmail, a.status);
    });

    const stats = {
      not_started: 0,
      in_progress: 0,
      submitted: 0,
      terminated: 0,
    };

    allowedEmails.forEach((email) => {
      if (!attemptMap.has(email)) {
        stats.not_started++;
      } else {
        stats[attemptMap.get(email)]++;
      }
    });

    res.json({ testId, attemptStats: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to compute stats" });
  }
});

router.get(
  "/live-candidates",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const attempts = await TestAttempt.find({
        status: "in_progress",
      })
        .populate("test", "title duration")
        .select(
          "candidateName candidateEmail startedAt integrityScore violations test"
        )
        .sort({ startedAt: 1 });

      const formatted = attempts.map((a) => {
        const elapsedMinutes = Math.floor(
          (Date.now() - new Date(a.startedAt)) / 60000
        );

        return {
          attemptId: a._id,
          candidateName: a.candidateName,
          candidateEmail: a.candidateEmail,
          testTitle: a.test?.title,
          duration: a.test?.duration,
          elapsedMinutes,
          integrityScore: a.integrityScore,
          violationCount: a.violations.length,
        };
      });

      res.json(formatted);
    } catch (err) {
      console.error("Live candidates error:", err);
      res.status(500).json({ message: "Failed to fetch live candidates" });
    }
  }
);


export default router;
