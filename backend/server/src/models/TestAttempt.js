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
  },
});


const violationSchema = new mongoose.Schema({
  type: String,          // tab-switch, face-not-detected, audio
  timestamp: Date,
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
  },
  { timestamps: true }
);

export default mongoose.model("TestAttempt", testAttemptSchema);
