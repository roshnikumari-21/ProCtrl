import mongoose from "mongoose";

/* ================= MCQ ================= */
const mcqSchema = new mongoose.Schema({
  options: {
    type: [String],
    required: true,
  },
  correctAnswer: {
    type: Number,
    required: true,
  },
});

/* ================= DESCRIPTIVE ================= */
const descriptiveSchema = new mongoose.Schema({
  sampleAnswer: String,
});

/* ================= CODING ================= */
const codingSchema = new mongoose.Schema({
  problemStatement: {
    type: String,
    required: true,
  },

  constraints: String,
  inputFormat: String,
  outputFormat: String,

  /* ---------- Sample (Visible) ---------- */
  sampleTestCases: [
    {
      input: String,
      output: String,
      explanation: String,
    },
  ],

  /* ---------- Hidden (Evaluation) ---------- */
  hiddenTestCases: [
    {
      input: String,
      output: String,
    },
  ],

  /* ---------- Execution Limits ---------- */
  timeLimitMs: {
    type: Number,
    default: 2000, // 2 seconds
  },

  memoryLimitMb: {
    type: Number,
    default: 256,
  },

  /* ---------- Languages ---------- */
  supportedLanguages: {
    type: [String],
    default: ["cpp", "python", "java"],
  },

  /* ---------- Starter Code ---------- */
  boilerplateCode: {
    cpp: {
      type: String,
      default: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // write your code here
    return 0;
}`,
    },
    python: {
      type: String,
      default: `import sys

def solve():
    # Write your code here
    pass

if __name__ == "__main__":
    solve()`,
    },
    java: {
      type: String,
      default: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // write your code here
    }
}`,
    },
  },
});

/* ================= QUESTION ================= */
const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["mcq", "descriptive", "coding"],
      required: true,
    },

    marks: {
      type: Number,
      required: true,
    },

    mcq: mcqSchema,
    descriptive: descriptiveSchema,
    coding: codingSchema,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Question", questionSchema);
