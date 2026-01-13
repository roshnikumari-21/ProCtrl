import mongoose from "mongoose";
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
  },
  { timestamps: true }
);

export default mongoose.model("TestAttempt", testAttemptSchema);
