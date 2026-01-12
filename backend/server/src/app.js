import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import googleAuthRoutes from "./routes/googleAuth.routes.js";
import questionRoutes from "./routes/question.routes.js";
import testRoutes from "./routes/test.routes.js";
import attemptRoutes from "./routes/attempt.routes.js";
import codeRoutes from "./routes/code.routes.js";
import adminMonitoringRoutes from "./routes/adminMonitoring.routes.js";
import { initCppWorker } from './services/codeRunner/evaluateCpp.js'; // Adjust path


initCppWorker().then(() => {
    app.listen(3000, () => {
        console.log("Server running on port 3000");
    });
});


const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

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

export default app;

