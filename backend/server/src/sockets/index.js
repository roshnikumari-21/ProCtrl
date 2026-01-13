import TestAttempt from "../models/TestAttempt.js";

export default function initSockets(io) {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

   // Admin joins a specific attempt room to monitor
    socket.on("admin:join", ({ attemptId }) => {
      socket.join(attemptId);
      console.log(`Admin joined monitoring room: ${attemptId}`);
      // Notify candidate that admin is watching (so candidate can send offer)
      socket.to(attemptId).emit("admin:ready"); 
    });

   // Candidate joins
    socket.on("candidate:join", async ({ attemptId, testId }) => {
      socket.join(testId);   // For exam-wide broadcasts
      socket.join(attemptId); // For 1:1 WebRTC with Admin
      
      console.log(`Candidate joined rooms: ${testId} & ${attemptId}`);

      // Notify admin the candidate is online
      io.to(testId).emit("candidate:update", {
        attemptId,
        status: "online",
      });
    });

    socket.on("admin:warn", ({ attemptId, message }) => {
      // Emit directly to the candidate's room (using attemptId)
      io.to(attemptId).emit("candidate:warn", { message });
    });

    socket.on("admin:terminate", async ({ attemptId, reason }) => {
      try {
        // 1. Update DB immediately to stop further auto-saves/submissions
        const attempt = await TestAttempt.findByIdAndUpdate(
          attemptId,
          {
            status: "terminated",
            terminationReason: reason,
            submittedAt: new Date(), // Mark as ended now
          },
          { new: true }
        );

        if (attempt) {
          // 2. Notify the Candidate to block their screen
          io.to(attemptId).emit("candidate:terminated", { reason });
          
          // 3. Notify Admin (confirmation)
          // Using socket.emit sends back to the sender (Admin)
          socket.emit("admin:terminate_success", { 
             message: "Attempt terminated successfully." 
          });
        }
      } catch (err) {
        console.error("Termination error:", err);
      }
    });

    // --- WEBRTC SIGNALING (Relay between Admin & Candidate) ---

    // Candidate sends Offer -> Admin
    socket.on("webrtc:offer", ({ attemptId, offer }) => {
      socket.to(attemptId).emit("webrtc:offer", offer);
    });

    // Admin sends Answer -> Candidate
    socket.on("webrtc:answer", ({ attemptId, answer }) => {
      socket.to(attemptId).emit("webrtc:answer", answer);
    });

    // Exchange ICE Candidates
    socket.on("webrtc:ice", ({ attemptId, candidate }) => {
      socket.to(attemptId).emit("webrtc:ice", candidate);
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
