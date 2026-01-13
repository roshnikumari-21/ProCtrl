import { useEffect } from "react";
import { reportViolation } from "../services/violations";
import { captureSnapshot } from "../utils/camera";

const useProctoring = (attemptId, testId, videoRef, isSubmitted = false) => {
  useEffect(() => {
    if (!attemptId || !testId || isSubmitted) return;

    const handleViolation = (type) => {
      console.log(`Violation detected: ${type}`);
      const image = videoRef?.current
        ? captureSnapshot(videoRef.current)
        : null;
      reportViolation(attemptId, testId, type, image);
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
