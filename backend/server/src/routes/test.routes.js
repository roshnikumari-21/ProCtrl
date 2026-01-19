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

/**
 * ===============================
 * UPDATE TEST METADATA
 * ===============================
 */
router.put("/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { title, duration, activeTill } = req.body;
    const updateData = {};

    if (title) updateData.title = title;
    if (duration) updateData.duration = duration;
    if (activeTill) {
      const expiryDate = new Date(activeTill);
      if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        return res
          .status(400)
          .json({ message: "Invalid or past activeTill date" });
      }
      updateData.activeTill = expiryDate;
    }

    const test = await Test.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      updateData,
      { new: true }
    );

    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    res.json({ message: "Test updated successfully", test });
  } catch (err) {
    console.error("Update test error:", err);
    res.status(500).json({ message: "Failed to update test" });
  }
});

/**
 * ===============================
 * ADD CANDIDATES
 * ===============================
 */
router.post(
  "/:id/candidates",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const { candidates } = req.body; // Array of { email, passcode }

      if (!Array.isArray(candidates) || candidates.length === 0) {
        return res.status(400).json({ message: "No candidates provided" });
      }

      const test = await Test.findOne({
        _id: req.params.id,
        createdBy: req.user.id,
      });

      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }

      const existingEmails = new Set(
        test.allowedCandidates.map((c) => c.email)
      );
      const newCandidates = [];

      for (const entry of candidates) {
        const { email, passcode } = entry;
        if (!email || !passcode) continue;

        const normalizedEmail = email.toLowerCase().trim();
        if (existingEmails.has(normalizedEmail)) continue;

        if (!validateEmail(normalizedEmail)) {
          continue; // Skip invalid emails or handle error
        }

        const passcodeHash = await bcrypt.hash(passcode, 10);
        newCandidates.push({
          email: normalizedEmail,
          passcodeHash,
          hasAttempted: false,
        });
      }

      if (newCandidates.length > 0) {
        test.allowedCandidates.push(...newCandidates);
        await test.save();
      }

      res.json({
        message: `Added ${newCandidates.length} candidates`,
        test,
      });
    } catch (err) {
      console.error("Add candidates error:", err);
      res.status(500).json({ message: "Failed to add candidates" });
    }
  }
);

/**
 * ===============================
 * REMOVE CANDIDATE
 * ===============================
 */
router.delete(
  "/:id/candidates",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const test = await Test.findOne({
        _id: req.params.id,
        createdBy: req.user.id,
      });

      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }

      const initialLength = test.allowedCandidates.length;
      test.allowedCandidates = test.allowedCandidates.filter(
        (c) => c.email !== email.toLowerCase().trim()
      );

      if (test.allowedCandidates.length === initialLength) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      await test.save();

      res.json({ message: "Candidate removed successfully", test });
    } catch (err) {
      console.error("Remove candidate error:", err);
      res.status(500).json({ message: "Failed to remove candidate" });
    }
  }
);

/**
 * ===============================
 * ADD QUESTIONS
 * ===============================
 */
router.post(
  "/:id/questions",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const { questionIds } = req.body;

      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        return res.status(400).json({ message: "No questions provided" });
      }

      const test = await Test.findOne({
        _id: req.params.id,
        createdBy: req.user.id,
      });

      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }

      // Add unique
      const existingIds = new Set(test.questions.map((q) => q.toString()));
      questionIds.forEach((id) => existingIds.add(id));
      test.questions = Array.from(existingIds);

      await test.save();
      await test.calculateTotalScore();

      // Repopulate for frontend
      const updatedTest = await Test.findById(req.params.id).populate(
        "questions"
      );

      res.json({
        message: "Questions added successfully",
        test: updatedTest,
      });
    } catch (err) {
      console.error("Add questions error:", err);
      res.status(500).json({ message: "Failed to add questions" });
    }
  }
);

/**
 * ===============================
 * REMOVE QUESTION
 * ===============================
 */
router.delete(
  "/:id/questions/:questionId",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const { questionId } = req.params;

      const test = await Test.findOne({
        _id: req.params.id,
        createdBy: req.user.id,
      });

      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }

      test.questions = test.questions.filter(
        (q) => q.toString() !== questionId
      );

      await test.save();
      await test.calculateTotalScore();

      // Repopulate for frontend
      const updatedTest = await Test.findById(req.params.id).populate(
        "questions"
      );

      res.json({
        message: "Question removed successfully",
        test: updatedTest,
      });
    } catch (err) {
      console.error("Remove question error:", err);
      res.status(500).json({ message: "Failed to remove question" });
    }
  }
);

export default router;
