import express from "express";
import Test from "../models/Test.js";
import TestAttempt from "../models/TestAttempt.js";
import validateEmail from "../utils/validateEmail.js";
import bcrypt from "bcryptjs";
import { authorize } from "../middleware/role.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { evaluateDescriptiveAnswer } from "../utils/nlpEvaluation.js";

const router = express.Router();

/**
 * ===============================
 * GET MY ATTEMPTS (CANDIDATE)
 * ===============================
 * - Returns all attempts by logged-in candidate
 * - Secure: JWT + role enforced
 */

import User from "../models/User.js";

router.get(
  "/my-attempts",
  authenticate,
  authorize("candidate"),
  async (req, res) => {
    try {
      /* --------------------------------
         1. Get candidate email from user
      -------------------------------- */
      const user = await User.findById(req.user.id).select("email role");

      if (!user || user.role !== "candidate") {
        return res.status(403).json({
          message: "Unauthorized access",
        });
      }

      /* --------------------------------
         2. Fetch attempts
      -------------------------------- */
      const attempts = await TestAttempt.find({
        candidateEmail: user.email,
      })
        .populate("test", "title duration")
        .sort({ createdAt: -1 });

      /* --------------------------------
         3. Format response
      -------------------------------- */
      const formatted = attempts.map((a) => ({
        _id: a._id,
        status: a.status,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,

        test: {
          title: a.test?.title || "Assessment",
          duration: a.test?.duration ?? null,
        },

        score: a.score ?? null,
        totalMarks: a.totalMarks ?? null,
        violations: Array.isArray(a.violations) ? a.violations.length : 0,
        integrityScore: a.integrityScore ?? 100,
      }));

      res.json(formatted);
    } catch (err) {
      console.error("Fetch my attempts error:", err);
      res.status(500).json({
        message: "Failed to fetch attempts",
      });
    }
  }
);

/**
 * ===============================
 * CANDIDATE JOINS TEST
 * ===============================
 * - Validates testId
 * - Verifies email whitelist
 * - Verifies per-candidate passcode
 * - Enforces single attempt
 * - Captures system info
 * - Creates TestAttempt in "joined" state
 */
router.post("/join", async (req, res) => {
  try {
    const { name, email, testId, passcode, systemInfo } = req.body;

    /* ---------------- Basic validation ---------------- */
    if (!name || !email || !testId || !passcode) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Invalid email address",
      });
    }

    /* ---------------- Find test ---------------- */
    const test = await Test.findOne({ testId }).populate("questions");

    if (!test) {
      return res.status(404).json({
        message: "Invalid Test ID",
      });
    }

    /* ---------------- Expiry check ---------------- */
    if (test.activeTill < new Date()) {
      return res.status(403).json({
        message: "This test has expired and is no longer accepting attempts",
      });
    }

    /* ---------------- Email whitelist check ---------------- */
    const candidateEntry = test.allowedCandidates.find(
      (c) => c.email === email.toLowerCase().trim()
    );

    if (!candidateEntry) {
      return res.status(403).json({
        message:
          "This email is not authorized to access the test. Please contact the administrator.",
      });
    }

    /* ---------------- Passcode verification ---------------- */
    const passcodeValid = await bcrypt.compare(
      passcode,
      candidateEntry.passcodeHash
    );

    if (!passcodeValid) {
      return res.status(401).json({
        message: "Invalid access passcode",
      });
    }

    /* ---------------- One-attempt enforcement ---------------- */
    if (candidateEntry.hasAttempted) {
      return res.status(409).json({
        message: "An attempt has already been recorded for this email address.",
      });
    }

    /* ----------------- Create attempt ---------------- */
    const attempt = await TestAttempt.create({
      test: test._id,
      candidateName: name.trim(),
      candidateEmail: email.toLowerCase().trim(),
      systemInfo,
      status: "joined",
    });

    await test.save();

    /* ---------------- Respond ---------------- */
    res.json({
      attemptId: attempt._id,
      test: {
        testId: test.testId,
        title: test.title,
        duration: test.duration,
        questions: test.questions.map((q) => ({
          _id: q._id,
          questionText: q.questionText,
          type: q.type,
          marks: q.marks,

          mcq: q.type === "mcq" ? q.mcq : undefined,
          descriptive: q.type === "descriptive" ? q.descriptive : undefined,

          coding:
            q.type === "coding"
              ? {
                  problemStatement: q.coding.problemStatement,
                  constraints: q.coding.constraints,
                  inputFormat: q.coding.inputFormat,
                  outputFormat: q.coding.outputFormat,
                  sampleTestCases: q.coding.sampleTestCases,
                  supportedLanguages: q.coding.supportedLanguages,
                  boilerplateCode: q.coding.boilerplateCode,
                }
              : undefined,
        })),
      },
    });
  } catch (err) {
    console.error("Join test error:", err);
    res.status(500).json({
      message: "Failed to join test",
    });
  }
});

/**
 * ===============================
 * VERIFICATION COMPLETE (PROCTORING HOOK)
 * ===============================
 * - Called after webcam/mic checks (later)
 * - Moves attempt from "joined" → "verified"
 */
router.post("/verify/:attemptId", async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId);
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    const test = await Test.findById(attempt.test);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    if (test.activeTill < new Date()) {
      return res.status(403).json({
        message: "Test has expired. Verification is no longer allowed.",
      });
    }

    attempt.status = "verified";
    await attempt.save();

    res.json({ message: "Candidate verified successfully" });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ message: "Verification failed" });
  }
});

/**
 * ===============================
 * START TEST
 * ===============================
 * - Only allowed after verification
 * - Starts authoritative timer
 * - Marks hasAttempted = true for candidate
 */

router.post("/save/:attemptId", async (req, res) => {
  try {
    const { answers } = req.body;

    const attempt = await TestAttempt.findById(req.params.attemptId);

    if (!attempt || attempt.status !== "in_progress") {
      return res.status(400).json({ message: "Invalid attempt" });
    }

    const test = await Test.findById(attempt.test);

    if (test.activeTill < new Date()) {
      return res.status(403).json({
        message: "Test time window has expired. Auto-save disabled.",
      });
    }

    for (const incoming of answers) {
      const existing = attempt.answers.find(
        (a) => a.question.toString() === incoming.question
      );

      if (existing) {
        // Update based on type
        if (incoming.mcqAnswer !== undefined) {
          existing.mcqAnswer = incoming.mcqAnswer;
        }

        if (incoming.descriptiveAnswer !== undefined) {
          existing.descriptiveAnswer = incoming.descriptiveAnswer;
        }

        if (incoming.codingAnswer?.code) {
          existing.codingAnswer = {
            ...existing.codingAnswer,
            code: incoming.codingAnswer.code,
            language: incoming.codingAnswer.language,
          };
        }
      } else {
        attempt.answers.push(incoming);
      }
    }

    await attempt.save();
    res.json({ message: "Saved successfully" });
  } catch (err) {
    console.error("Auto-save error:", err);
    res.status(500).json({ message: "Auto-save failed" });
  }
});

router.post("/start/:attemptId", async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId);
    console.log(attempt.status);
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.status !== "verified") {
      return res.status(403).json({
        message: "Candidate verification required before starting test",
      });
    }

    const test = await Test.findById(attempt.test);

    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    /* ---------------- Expiry enforcement ---------------- */
    if (test.activeTill < new Date()) {
      return res.status(403).json({
        message: "Test has expired and can no longer be started",
      });
    }

    const candidate = test.allowedCandidates.find(
      (c) => c.email === attempt.candidateEmail
    );

    if (!candidate) {
      return res.status(403).json({
        message: "Candidate not authorized for this test",
      });
    }

    if (candidate.hasAttempted) {
      return res.status(403).json({
        message: "Test has already been attempted by this candidate",
      });
    }
    console.log(attempt.status);
    attempt.status = "in_progress";
    attempt.startedAt = new Date();
    candidate.hasAttempted = true;

    await attempt.save();
    await test.save();

    console.log(attempt.status);
    const attempt2 = await TestAttempt.findById(req.params.attemptId);
    console.log(attempt2.status, "AFTER SAVE ");
    res.json({
      message: "Test started successfully",
      startedAt: attempt.startedAt,
    });
  } catch (err) {
    console.error("Start test error:", err);
    res.status(500).json({ message: "Failed to start test" });
  }
});

/**
 * ===============================
 * SUBMIT TEST
 * ===============================
 * - Accepts answers for all question types
 * - Finalizes attempt
 */
router.post("/submit/:attemptId", async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId);

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        message: "Test is not in progress",
      });
    }

    // Fetch the test with questions populated
    const test = await Test.findById(attempt.test).populate("questions");
    let totalScore = 0;

    // Create a map for quick question lookup
    const questionMap = new Map();
    for (const q of test.questions) {
      questionMap.set(q._id.toString(), q);
    }

    for (const ans of attempt.answers) {
      const q = questionMap.get(ans.question.toString());
      if (!q) continue;
      // MCQ
      if (q.type === "mcq" && ans.mcqAnswer !== undefined) {
        if (ans.mcqAnswer === q.mcq.correctAnswer) {
          totalScore += q.marks;
        }
      }

      // Descriptive
      if (q.type === "descriptive" && ans.descriptiveAnswer) {
        // Calculate score based on NLP similarity with sample answer
        const score = evaluateDescriptiveAnswer(
          ans.descriptiveAnswer,
          q.descriptive?.sampleAnswer || "",
          q.marks
        );
        totalScore += score;
      }

      // Coding: award full marks if verdict is 'Accepted' and all test cases passed
      if (
        q.type === "coding" &&
        ans.codingAnswer &&
        ans.codingAnswer.verdict === "Accepted"
      ) {
        if (
          ans.codingAnswer.passedTestCases ===
            ans.codingAnswer.totalTestCases &&
          ans.codingAnswer.totalTestCases > 0
        ) {
          totalScore += q.marks;
        }
      }
      // (Optional) Add logic for descriptive if auto-grading is implemented
    }

    attempt.score = totalScore;
    attempt.status = "submitted";
    attempt.submittedAt = new Date();

    await attempt.save();

    res.json({ message: "Test submitted successfully", score: totalScore });
  } catch (err) {
    console.error("Submit test error:", err);
    res.status(500).json({ message: "Failed to submit test" });
  }
});

/**
 * ===============================
 * SUBMIT FEEDBACK
 * ===============================
 */
router.post("/feedback/:attemptId", async (req, res) => {
  try {
    const { rating, summary, additionalComment } = req.body;
    const attempt = await TestAttempt.findById(req.params.attemptId);

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    attempt.feedback.push({
      rating,
      summary,
      additionalComment,
    });

    await attempt.save();

    res.json({ message: "Feedback submitted successfully" });
  } catch (err) {
    console.error("Feedback submit error:", err);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
});

export default router;
