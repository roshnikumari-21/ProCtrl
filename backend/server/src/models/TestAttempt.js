import mongoose from "mongoose";
import { evaluateDescriptiveAnswer } from "../utils/nlpEvaluation.js";

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
    required: true,
  },

  mcqAnswer: Number,
  descriptiveAnswer: String,

  codingAnswer: {
    code: String,
    language: String,

    verdict: {
      type: String, // Accepted, Wrong Answer, TLE, Runtime Error, etc.
    },

    passedTestCases: {
      type: Number,
      default: 0,
    },

    totalTestCases: {
      type: Number,
      default: 0,
    },

    executionTimeMs: {
      type: Number,
      default: 0,
    },

    errorMessage: {
      type: String, // compilation/runtime error (optional)
    },
  },
});

const violationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "multiple_faces",
      "face_not_detected",
      "fullscreen_exit",
      "tab_switch",
      "window_blur",
      "copy_attempt",
      "paste_attempt",
      "devtools_detected",
      "audio_detected",
    ],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: Object,
});

const testAttemptSchema = new mongoose.Schema(
  {
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },

    candidateName: {
      type: String,
      required: true,
    },

    candidateEmail: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["joined", "verified", "in_progress", "submitted", "terminated"],
      default: "joined",
    },

    terminationReason: {
      type: String,
      default: null,
    },

    answers: [answerSchema],

    violations: [violationSchema],

    startedAt: Date,
    submittedAt: Date,

    systemInfo: {
      browser: String,
      os: String,
      screenResolution: String,
    },

    feedback: [
      {
        rating: Number,
        summary: String,
        additionalComment: String,
        submittedAt: { type: Date, default: Date.now },
      },
    ],

    score: {
      type: Number,
      default: 0,
    },

    totalMarks: {
      type: Number,
      default: 0,
    },

    confidenceScore: {
      type: Number,
      default: 0,
    },

    integrityScore: {
      type: Number,
      default: 100,
    },
  },
  { timestamps: true }
);

testAttemptSchema.methods.calculateScore = async function () {
  const Test = mongoose.model("Test");
  // Fetch the test with questions populated
  const test = await Test.findById(this.test).populate("questions");
  if (!test) return 0;

  let totalScore = 0;

  // Create a map for quick question lookup
  const questionMap = new Map();
  for (const q of test.questions) {
    questionMap.set(q._id.toString(), q);
  }

  for (const ans of this.answers) {
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
        ans.codingAnswer.passedTestCases === ans.codingAnswer.totalTestCases &&
        ans.codingAnswer.totalTestCases > 0
      ) {
        totalScore += q.marks;
      }
    }
  }

  this.score = totalScore;
  return this.score;
};

testAttemptSchema.methods.calculateTotalMarks = async function () {
  const Test = mongoose.model("Test");

  const test = await Test.findById(this.test).populate("questions");
  if (!test) return 0;

  const totalMarks = test.questions.reduce(
    (sum, q) => sum + (q.marks || 0),
    0
  );

  this.totalMarks = totalMarks;
  return this.totalMarks;
};


export default mongoose.model("TestAttempt", testAttemptSchema);
