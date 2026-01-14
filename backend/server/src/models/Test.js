import mongoose from "mongoose";

const testSchema = new mongoose.Schema(
  {
    testId: {
      type: String,
      required: true,
      unique: true,
    },

    title: {
      type: String,
      required: true,
    },

    duration: {
      type: Number,
      required: true,
    },

    activeTill: {
      type: Date,
      required: true,
    },

    supportedLanguages: {
      type: [String],
      enum: ["cpp", "python", "java"],
      default: ["cpp", "python", "java"], // Default to all
    },

    totalScore: {
      type: Number,
      default: 0,
    },

    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /**
     * 🔐 Access Control List
     */
    allowedCandidates: [
      {
        email: {
          type: String,
          required: true,
          lowercase: true,
          trim: true,
        },

        passcodeHash: {
          type: String,
          required: true,
        },

        hasAttempted: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  { timestamps: true }
);

// Method to calculate total score
testSchema.methods.calculateTotalScore = async function () {
  await this.populate("questions");
  this.totalScore = this.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  this.depopulate("questions");
  await this.save();
  return this.totalScore;
};

export default mongoose.model("Test", testSchema);
