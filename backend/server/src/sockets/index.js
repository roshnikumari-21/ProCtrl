import TestAttempt from "../models/TestAttempt.js";

export default function initSockets(io) {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    /**
     * Admin joins a test room
     */
    socket.on("admin:join", ({ testId }) => {
      socket.join(testId);
      console.log(`Admin joined test room ${testId}`);
    });

    /**
     * Candidate joins test
     */
    socket.on("candidate:join", async ({ attemptId, testId }) => {
      socket.join(testId);

      // Removed overwriting status to "joined" to prevent resetting "in_progress"
      // await TestAttempt.findByIdAndUpdate(attemptId, {
      //   status: "joined",
      // });

      // Optionally notify admin that candidate is online
      io.to(testId).emit("candidate:update", {
        attemptId,
        status: "online",
      });
    });

    /**
     * Candidate verified
     */
    socket.on("candidate:verified", async ({ attemptId, testId }) => {
      await TestAttempt.findByIdAndUpdate(attemptId, {
        status: "verified",
      });

      io.to(testId).emit("candidate:update", {
        attemptId,
        status: "verified",
      });
    });

    /**
     * Candidate started test
     */
    socket.on("candidate:start", async ({ attemptId, testId }) => {
      await TestAttempt.findByIdAndUpdate(attemptId, {
        status: "in_progress",
        startedAt: new Date(),
      });

      io.to(testId).emit("candidate:update", {
        attemptId,
        status: "in_progress",
      });
    });

    /**
     * Candidate heartbeat
     */
    socket.on("candidate:heartbeat", ({ attemptId, testId }) => {
      io.to(testId).emit("candidate:heartbeat", {
        attemptId,
        timestamp: new Date(),
      });
    });

    /**
     * Candidate submitted test
     */
    socket.on("candidate:submit", async ({ attemptId, testId }) => {
      await TestAttempt.findByIdAndUpdate(attemptId, {
        status: "submitted",
        submittedAt: new Date(),
      });

      io.to(testId).emit("candidate:update", {
        attemptId,
        status: "submitted",
      });
    });

    /**
     * Candidate violation
     */
    socket.on(
      "candidate:violation",
      async ({ attemptId, testId, type, image, timestamp }) => {
        try {
          console.log(
            `[Socket] Violation reported: ${type} for attempt ${attemptId}. Image present: ${!!image}`
          );

          const violation = {
            type,
            timestamp: timestamp || new Date(),
            metadata: { image },
          };

          const attempt = await TestAttempt.findById(attemptId);
          if (!attempt) {
            console.error(`[Socket] Failed to find attempt ${attemptId}`);
            return;
          }

          console.log(
            `[Socket] pushing violation to attempt ${attemptId}. Current count: ${attempt.violations.length}`
          );
          attempt.violations.push(violation);

          const savedAttempt = await attempt.save();
          console.log(
            `[Socket] Violation saved successfully. New count: ${savedAttempt.violations.length}`
          );

          // Notify admin immediately
          io.to(testId).emit("admin:violation", {
            attemptId,
            violation,
          });
        } catch (err) {
          console.error("[Socket] Error saving violation:", err);
          if (err.name === "ValidationError") {
            for (let field in err.errors) {
              console.error(
                `[Socket] Validation Error Field: ${field}, Message: ${err.errors[field].message}`
              );
            }
          }
        }
      }
    );

    /**
     * Disconnect handling
     */
    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
}
