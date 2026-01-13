import { useEffect, useRef, useState } from "react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { toast } from "react-toastify";
import { reportViolation } from "../services/violations";
import { captureSnapshot } from "../utils/camera";

const useFaceDetection = (videoRef, attemptId, testId) => {
  const [detector, setDetector] = useState(null);
  const [isFaceDetected, setIsFaceDetected] = useState(true);
  const lastViolationTime = useRef(0);
  const noFaceStartTime = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const initDetector = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        if (!isMounted) return;

        const faceDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
        });
        setDetector(faceDetector);
      } catch (err) {
        console.error("Failed to initialize Face Detector:", err);
      }
    };
    initDetector();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!detector || !videoRef.current) return;

    let animationFrameId;
    let lastVideoTime = -1;
    const video = videoRef.current;

    const triggerViolation = (type, message) => {
      // If no attemptId/testId, we might be in pre-check mode.
      // We can still show toast, but skip reporting.

      const now = Date.now();
      // Throttle violations: max 1 per 5 seconds
      if (now - lastViolationTime.current > 5000) {
        lastViolationTime.current = now;
        toast.warning(message);

        if (attemptId && testId) {
          const image = captureSnapshot(video);
          reportViolation(attemptId, testId, type, image);
        }
      }
    };

    const handleDetections = (result) => {
      const faces = result.detections.length;

      // 1. Multiple Faces
      if (faces > 1) {
        triggerViolation(
          "multiple_faces",
          "Multiple faces detected! Only you should be in the frame."
        );
        setIsFaceDetected(true);
        noFaceStartTime.current = null;
      }
      // 2. No Face
      else if (faces === 0) {
        setIsFaceDetected(false);
        if (!noFaceStartTime.current) {
          noFaceStartTime.current = Date.now();
        } else if (Date.now() - noFaceStartTime.current > 5000) {
          // Only report if absent for > 5 seconds
          triggerViolation(
            "face_not_detected",
            "Face not visible! Please stay in the frame."
          );
        }
      }
      // 3. One Face (Normal)
      else {
        if (!isFaceDetected) setIsFaceDetected(true);
        noFaceStartTime.current = null;
      }
    };

    const detect = () => {
      if (video.videoWidth > 0 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const detections = detector.detectForVideo(video, performance.now());
        handleDetections(detections);
      }
      animationFrameId = requestAnimationFrame(detect);
    };

    detect();
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [detector, attemptId, testId, isFaceDetected]);

  return { isFaceDetected };
};

export default useFaceDetection;
