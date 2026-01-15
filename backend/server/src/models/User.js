import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },

    role: {
      type: String,
      enum: ["admin", "candidate"],
      required: true,
    },

    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      },
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    googleId: {
      type: String,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    idCardImage: {
      type: String, // Path to the stored ID card image
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
