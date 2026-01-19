import { useEffect } from "react";
import { reportViolation } from "../services/violations";
import { captureSnapshot } from "../utils/camera";
import { verifyFace } from "../services/candidateApi";
import { toast } from "react-toastify";

const useProctoring = (attemptId, testId, videoRef, isSubmitted = false) => {
  useEffect(() => {
    if (!attemptId || !testId || isSubmitted) return;

    const handleViolation = (type) => {
      console.log(`Violation detected: ${type}`);
      const image = videoRef?.current
        ? captureSnapshot(videoRef.current)
        : null;
      reportViolation(attemptId, testId, type, image);

      let warningMsg = "Proctoring violation detected!";
      if (type === "tab_switch") {
        warningMsg =
          "Tab switching detected! Repeated violations will lead to termination.";
      } else if (type === "fullscreen_exit") {
        warningMsg =
          "You exited fullscreen! Repeated violations will lead to termination.";
      } else if (type === "window_blur") {
        warningMsg = "Window focus lost! Please stay on the test window.";
      } else if (type === "copy_attempt" || type === "paste_attempt") {
        warningMsg = "Copy/Paste is disabled during the exam.";
      } else if (type === "devtools_detected") {
        warningMsg = "Developer tools detected! This is a severe violation.";
      } else if (type === "face_mismatch") {
        warningMsg = "Face verification failed! Please match your ID card.";
      }

      toast.warning(warningMsg, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleViolation("fullscreen_exit");
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("tab_switch");
      }
    };

    const onBlur = () => {
      handleViolation("window_blur");
    };

    const onCopy = (e) => {
      e.preventDefault();
      handleViolation("copy_attempt");
    };

    const onPaste = (e) => {
      e.preventDefault();
      handleViolation("paste_attempt");
    };

    const devToolsInterval = setInterval(() => {
      const start = performance.now();

      const end = performance.now();
      if (end - start > 100) {
        handleViolation("devtools_detected");
      }
    }, 2000);

    const faceCheckInterval = setInterval(async () => {
      if (videoRef.current) {
        const image = captureSnapshot(videoRef.current);
        if (image) {
          try {
            const res = await verifyFace(attemptId, image);
            if (res.data && res.data.match === false) {
              handleViolation("face_mismatch");
              clearInterval(faceCheckInterval);
            }
          } catch (err) {
            console.error("Face check error", err);
          }
        }
      }
    }, 15000);

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);

    return () => {
      clearInterval(devToolsInterval);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, [attemptId, testId, isSubmitted, videoRef]);
};

export default useProctoring;
