import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import googleAuthRoutes from "./routes/googleAuth.routes.js";
import questionRoutes from "./routes/question.routes.js";
import testRoutes from "./routes/test.routes.js";
import attemptRoutes from "./routes/attempt.routes.js";
import codeRoutes from "./routes/code.routes.js";
import adminMonitoringRoutes from "./routes/adminMonitoring.routes.js";


// 1. Change Import: Import the unified worker initializer
import { initWorkers } from "./services/codeRunner/initWorkers.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 2. Setup Middleware (Move this BEFORE starting server)
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));


// 3. Register Routes
app.get("/test-route", (req, res) => {
  res.send("Test route working");
});
app.use("/api/auth", googleAuthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/code", codeRoutes);
app.use("/api/admin/monitoring", adminMonitoringRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// 4. Initialize Containers & Start Server
// This now starts C++, Python, AND Java containers
initWorkers()
  .then(() => {
    // Only listen after containers are ready
    app.listen(3000, () => {
      console.log("Server running on port 3000");
    });
  })
  .catch((err) => {
    console.error("Failed to initialize code runners:", err);
    process.exit(1);
  });

export default app;
