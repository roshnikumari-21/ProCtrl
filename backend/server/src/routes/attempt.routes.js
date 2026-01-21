import express from "express";
import Test from "../models/Test.js";
import TestAttempt from "../models/TestAttempt.js";
import validateEmail from "../utils/validateEmail.js";
import bcrypt from "bcryptjs";
import { authorize } from "../middleware/role.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";

// Configure Multer for ID Card Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/id_cards";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "id_card-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

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
        .populate("test", "title duration totalScore")
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
        totalMarks: a.totalMarks ?? 0,
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

    /* ---------------- Find User & ID Card ---------------- */
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    const idCardImage = user?.idCardImage || null;

    /* ----------------- Create attempt ---------------- */
    const attempt = await TestAttempt.create({
      test: test._id,
      candidateName: name.trim(),
      candidateEmail: email.toLowerCase().trim(),
      systemInfo,
      status: "joined",
    });

    /* ---------------- Respond ---------------- */
    res.json({
      attemptId: attempt._id,
      idCardImage,
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
    const referenceImage = req.body?.referenceImage;
    console.log("HEADERS:", req.headers["content-type"]);
    console.log("BODY EXISTS:", !!req.body);

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

    if (!referenceImage) {
      return res
        .status(400)
        .json({ message: "Reference image (face capture) is required." });
    }

    // --- STRICT SERVER-SIDE FACE MATCHING ---
    const user = await User.findOne({ email: attempt.candidateEmail });
    if (!user || !user.idCardImage) {
      return res.status(400).json({
        message: "ID Card not found. Please upload ID card first.",
      });
    }

    const idCardPath = path.resolve(user.idCardImage);
    if (!fs.existsSync(idCardPath)) {
      return res
        .status(404)
        .json({ message: "ID Card file missing on server" });
    }

    // Call ML Service to verify match
    try {
      const formData = new FormData();
      formData.append("id_image", fs.createReadStream(idCardPath));
      formData.append("live_image", referenceImage);

      const mlServiceUrl =
        process.env.ML_SERVICE_URL || "http://localhost:5001";

      const mlRes = await axios.post(`${mlServiceUrl}/match_faces`, formData, {
        headers: { ...formData.getHeaders() },
      });

      if (!mlRes.data.match) {
        return res.status(403).json({
          message: "Face verification FAILED. Face does not match ID Card.",
          details: mlRes.data.warning || "Identity mismatch detected.",
        });
      }

      // If matched, save proof
      attempt.referenceImage = referenceImage;
      attempt.status = "verified";
      await attempt.save();

      res.json({
        message: "Candidate verified successfully",
        confidence: mlRes.data.confidence,
      });
    } catch (mlErr) {
      console.error("ML Verification Error:", mlErr.message);
      return res.status(500).json({
        message: "Face verification service unavailable. Please try again.",
      });
    }
    // --- END STRICT MATCHING ---
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

    if (!attempt || attempt.status !== "in_progress") {
      return res.status(400).json({ message: "Test not in progress" });
    }

    await attempt.calculateScore();
    await attempt.calculateTotalMarks();

    attempt.status = "submitted";
    attempt.submittedAt = new Date();

    await attempt.save();

    res.json({
      message: "Test submitted successfully",
      score: attempt.score,
      totalMarks: attempt.totalMarks,
    });
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

/**
 * ===============================
 * UPLOAD ID CARD
 * ===============================
 */
router.post(
  "/upload-id/:attemptId",
  upload.single("idCard"),
  async (req, res) => {
    try {
      const attempt = await TestAttempt.findById(req.params.attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const imagePath = `uploads/id_cards/${req.file.filename}`;

      // Update or Create User
      let user = await User.findOne({ email: attempt.candidateEmail });
      if (!user) {
        user = new User({
          name: attempt.candidateName,
          email: attempt.candidateEmail,
          role: "candidate",
          authProvider: "local",
          password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
          idCardImage: imagePath,
        });
      } else {
        user.idCardImage = imagePath;
      }
      await user.save();

      res.json({
        message: "ID Card uploaded successfully",
        idCardImage: imagePath,
      });
    } catch (err) {
      console.error("ID Upload error:", err);
      res.status(500).json({ message: "Failed to upload ID card" });
    }
  }
);

/**
 * ===============================
 * VERIFY FACE (ML INTEGRATION)
 * ===============================
 */
router.post("/verify-face", async (req, res) => {
  const { attemptId, liveImage } = req.body;

  try {
    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    const user = await User.findOne({ email: attempt.candidateEmail });
    if (!user || !user.idCardImage) {
      return res.status(400).json({ message: "User ID not found" });
    }

    // Resolve path. user.idCardImage is relative like "uploads/id_cards/..."
    // We assume the server is running from backend/server/
    const idCardPath = path.resolve(user.idCardImage);

    if (!fs.existsSync(idCardPath)) {
      console.error("ID Card file missing:", idCardPath);
      return res
        .status(404)
        .json({ message: "ID card file missing on server" });
    }

    // Prepare data for ML service
    const formData = new FormData();
    formData.append("id_image", fs.createReadStream(idCardPath));
    formData.append("live_image", liveImage); // base64 string

    // Call ML Service
    // Ensure ML Service is running
    const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:5001";
    const mlResponse = await axios.post(
      `${mlServiceUrl}/match_faces`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );

    res.json(mlResponse.data);
  } catch (error) {
    console.error("Face verification error:", error.message);
    // If ML service is down, we shouldn't block the exam completely,
    // but maybe warn or return success=true (fail open) vs fail closed.
    // user requested "smooth workflow", "detect violations properly".
    // I will return the error so frontend knows.
    res
      .status(500)
      .json({ message: "Face verification failed", error: error.message });
  }
});

export default router;
