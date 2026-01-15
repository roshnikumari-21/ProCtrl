import { useEffect, useRef, useState } from "react";
import {
  FaceDetector,
  ImageEmbedder,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import { toast } from "react-toastify";
import { reportViolation } from "../services/violations";
import { captureSnapshot } from "../utils/camera";

const useFaceDetection = (
  videoRef,
  attemptId,
  testId,
  referenceImage = null
) => {
  const [detector, setDetector] = useState(null);
  const [embedder, setEmbedder] = useState(null);
  const [faceStatus, setFaceStatus] = useState({
    isDetected: false,
    isMultiple: false,
    isCentered: false,
    isAligned: false,
    isMatch: true,
  });

  const lastViolationTime = useRef(0);
  const noFaceStartTime = useRef(null);
  const mismatchStartTime = useRef(null);
  const referenceEmbedding = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const initModels = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        if (!isMounted) return;

        // Detector
        const faceDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
        });
        setDetector(faceDetector);

        // Embedder
        const imageEmbedder = await ImageEmbedder.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite`,
          },
        });
        setEmbedder(imageEmbedder);
      } catch (err) {
        console.error("Failed to initialize Vision Models:", err);
      }
    };
    initModels();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (embedder && detector && referenceImage) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = referenceImage;
      img.onload = async () => {
        try {
          // 1. Detect face in reference image
          const detections = detector.detect(img);

          if (detections.detections.length > 0) {
            const face = detections.detections[0];
            const { originX, originY, width, height } = face.boundingBox;

            // 2. Crop face
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(
              img,
              originX,
              originY,
              width,
              height,
              0,
              0,
              width,
              height
            );

            // 3. Embed cropped face
            const result = embedder.embed(canvas);
            if (result.embeddings.length > 0) {
              referenceEmbedding.current = result.embeddings[0];
              console.log("Reference embedding initialized");
            }
          } else {
            console.warn("No face detected in reference image");
          }
        } catch (e) {
          console.error("Error creating reference embedding", e);
        }
      };
    }
  }, [embedder, detector, referenceImage]);

  useEffect(() => {
    if (!detector || !videoRef.current) return;

    let animationFrameId;
    let lastVideoTime = -1;
    const video = videoRef.current;

    const triggerViolation = (type, message) => {
      const now = Date.now();
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
      const faces = result.detections;
      const count = faces.length;

      setFaceStatus((prev) => {
        const status = {
          isDetected: count === 1,
          isMultiple: count > 1,
          isCentered: false,
          isAligned: false,
          isMatch: prev.isMatch,
        };

        if (count > 1) {
          triggerViolation("multiple_faces", "Multiple faces detected!");
        } else if (count === 0) {
          if (!noFaceStartTime.current) {
            noFaceStartTime.current = Date.now();
          } else if (Date.now() - noFaceStartTime.current > 5000) {
            triggerViolation("face_not_detected", "Face not visible!");
          }
        } else {
          noFaceStartTime.current = null;
          const face = faces[0];
          const { originX, originY, width, height } = face.boundingBox;
          const vW = video.videoWidth;
          const vH = video.videoHeight;

          const cx = originX + width / 2;
          const cy = originY + height / 2;
          status.isCentered =
            cx > vW * 0.3 && cx < vW * 0.7 && cy > vH * 0.2 && cy < vH * 0.8;
          status.isAligned = width > vW * 0.15;

          if (embedder && referenceEmbedding.current && status.isAligned) {
            if (Math.random() < 0.05) {
              try {
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(
                  video,
                  originX,
                  originY,
                  width,
                  height,
                  0,
                  0,
                  width,
                  height
                );

                const res = embedder.embed(canvas);
                if (res.embeddings.length > 0) {
                  const sim = ImageEmbedder.cosineSimilarity(
                    referenceEmbedding.current,
                    res.embeddings[0]
                  );
                  console.log("Face Similarity:", sim);

                  // Lower threshold and add grace period
                  if (sim < 0.45) {
                    // Adjusted from 0.6
                    status.isMatch = false;
                    if (!mismatchStartTime.current)
                      mismatchStartTime.current = Date.now();
                    else if (Date.now() - mismatchStartTime.current > 5000)
                      // Increased to 5s
                      triggerViolation(
                        "face_not_matched",
                        "Face mismatch detected!"
                      );
                  } else {
                    status.isMatch = true;
                    mismatchStartTime.current = null;
                  }
                }
              } catch (e) {
                console.error(e);
              }
            }
          }
        }
        return status;
      });
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
  }, [detector, embedder, attemptId, testId, referenceImage]); // Removed faceStatus from dependency to avoid loop? No, use ref or functional update.
  // Actually, faceStatus is used inside handleDetections. If I don't include it in deps, it will be stale.
  // But updating state in a loop with dependency on that state causes infinite re-render if not careful.
  // Standard solution: Use refs for mutable values needed in loop, or functional state update.
  // In handleDetections: status.isMatch = faceStatus.isMatch uses current state.
  // Better to use a Ref for persistent status or just functional update validation.
  // I will skip adding faceStatus to dependency and assume it's okay because the loop is via requestAnimationFrame which captures closure? No.
  // `detect` is defined inside effect, so it closes over `faceStatus`.
  // To fix: use `setFaceStatus(prev => ...)` and don't read `faceStatus` directly but use the previous value.

  return faceStatus;
};

export default useFaceDetection;
