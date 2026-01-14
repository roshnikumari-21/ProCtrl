import express from "express";
import bcrypt from "bcryptjs";
import Test from "../models/Test.js";
import generateTestId from "../utils/generateTestId.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import validateEmail from "../utils/validateEmail.js";

const router = express.Router();

/**
 * ===============================
 * CREATE TEST (Admin only)
 * ===============================
 * - Auto-generate unique testId
 * - Store questions
 * - Store email whitelist + hashed passcodes
 */
router.post("/", authenticate, authorize("admin"), async (req, res) => {
  try {
    const {
      title,
      duration,
      questions,
      allowedCandidates,
      activeTill,
      supportedLanguages,
    } = req.body;

    /* ---------- Validation ---------- */
    if (!title || !duration || !questions || questions.length === 0) {
      return res.status(400).json({
        message: "Title, duration, and at least one question are required",
      });
    }

    if (!Array.isArray(allowedCandidates) || allowedCandidates.length === 0) {
      return res.status(400).json({
        message: "At least one allowed candidate is required",
      });
    }

    /* ---------- Active Till Validation ---------- */
    if (!activeTill) {
      return res.status(400).json({
        message: "Active till date is required",
      });
    }

    const expiryDate = new Date(activeTill);

    if (isNaN(expiryDate.getTime())) {
      return res.status(400).json({
        message: "Invalid activeTill date",
      });
    }

    if (expiryDate <= new Date()) {
      return res.status(400).json({
        message: "activeTill must be a future date",
      });
    }

    /* ---------- Process allowed candidates ---------- */
    const processedCandidates = [];

    for (const entry of allowedCandidates) {
      const { email, passcode } = entry;

      if (!email || !passcode) {
        return res.status(400).json({
          message: "Each candidate must have an email and passcode",
        });
      }

      if (!validateEmail(email)) {
        return res.status(400).json({
          message: `Invalid email format: ${email}`,
        });
      }

      const passcodeHash = await bcrypt.hash(passcode, 10);

      processedCandidates.push({
        email: email.toLowerCase().trim(),
        passcodeHash,
        hasAttempted: false,
      });
    }

    /* ---------- Generate collision-safe Test ID ---------- */
    let testId;
    let exists = true;

    while (exists) {
      testId = generateTestId();
      exists = await Test.findOne({ testId });
    }

    /* ---------- Create test ---------- */
    const test = await Test.create({
      testId,
      title,
      duration,
      activeTill: expiryDate,
      questions,
      supportedLanguages: supportedLanguages || ["cpp", "python", "java"],
      allowedCandidates: processedCandidates,
      createdBy: req.user.id,
    });

    await test.calculateTotalScore();

    res.status(201).json({
      message: "Test created successfully",
      testId: test.testId,
    });
  } catch (err) {
    console.error("Test creation error:", err);
    res.status(500).json({
      message: "Failed to create test",
    });
  }
});

/**
 * ===============================
 * GET ALL TESTS CREATED BY ADMIN
 * ===============================
 */
router.get("/my-tests", authenticate, authorize("admin"), async (req, res) => {
  try {
    const now = new Date();

    const tests = await Test.find({ createdBy: req.user.id })
      .populate("questions", "-coding.hiddenTestCases")
      .select("-allowedCandidates.passcodeHash")
      .sort({ createdAt: -1 });

    const categorized = {
      live: [],
      expired: [],
    };

    tests.forEach((test) => {
      if (test.activeTill >= now) {
        categorized.live.push(test);
      } else {
        categorized.expired.push(test);
      }
    });

    res.json(categorized);
  } catch (err) {
    console.error("Fetch tests error:", err);
    res.status(500).json({ message: "Failed to fetch tests" });
  }
});

router.get("/:id", authenticate, authorize("admin"), async (req, res) => {
  const test = await Test.findOne({
    _id: req.params.id,
    createdBy: req.user.id,
  }).populate("questions");

  if (!test) {
    return res.status(404).json({ message: "Test not found" });
  }

  res.json(test);
});

export default router;
