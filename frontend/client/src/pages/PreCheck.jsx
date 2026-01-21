import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/UI";
import { useExam } from "../context/ExamContext";
import useFaceDetection from "../hooks/useFaceDetection.jsx";
import api from "../services/api";
import { toast } from "react-toastify";
import useBlockBackNavigation from "../hooks/useBlockBackNavigation.js";
import FaceAlignmentOverlay from "../components/FaceAlignmentOverlay";

const PreCheck = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { examState, setExamState } = useExam();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [idCard, setIdCard] = useState(
    examState?.candidate?.idCardImage || null
  );
  const [isUploading, setIsUploading] = useState(false);

  const [checks, setChecks] = useState({
    idCard: !!examState?.candidate?.idCardImage,
    camera: false,
    face: false,
    match: false, // track face match
    microphone: false,
    screen: false,
    network: false,
    fullscreen: false,
  });

  const [micLevel, setMicLevel] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  useBlockBackNavigation(true);

  // Construct URL. Adjust port/host if needed based on environment
  const idCardUrl = idCard ? `http://localhost:5000/${idCard}` : null;

  const faceStatus = useFaceDetection(videoRef, null, null, idCardUrl);
  const {
    isDetected: isFaceDetected,
    isCentered,
    isAligned,
    isMultiple,
    isMatch,
  } = faceStatus;

  // Update idCard check status
  useEffect(() => {
    setChecks((prev) => ({ ...prev, idCard: !!idCard }));
  }, [idCard]);

  // Update match check status
  useEffect(() => {
    // Only pass match if detected, single face, and matched
    if (isFaceDetected && !isMultiple && isMatch) {
      setChecks((prev) => ({ ...prev, match: true }));
    } else {
      setChecks((prev) => ({ ...prev, match: false }));
    }
  }, [isFaceDetected, isMultiple, isMatch]);

  /* ================= FULLSCREEN MONITOR ================= */
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      setChecks((prev) => ({ ...prev, fullscreen: isFullscreen }));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  /* ================= CAMERA ================= */
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setChecks((c) => ({ ...c, camera: true }));
      })
      .catch(() => {});
  }, []);

  const handleIdUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("idCard", file);

    setIsUploading(true);
    try {
      const res = await api.post(
        `/attempts/upload-id/${examState.attemptId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setIdCard(res.data.idCardImage);
      setExamState((prev) => ({
        ...prev,
        candidate: { ...prev.candidate, idCardImage: res.data.idCardImage },
      }));
      toast.success("ID Card uploaded!");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const verifyAndStartExam = async () => {
    try {
      if (!capturedImage) {
        toast.error("Please capture your face first!");
        return;
      }

      if (!checks.match) {
        toast.error("Face does not match ID Card. Cannot proceed.");
        return;
      }

      // STEP 1: VERIFY
      const verifyRes = await api.post(
        `/attempts/verify/${examState.attemptId}`,
        { referenceImage: capturedImage },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (verifyRes.data.message !== "Candidate verified successfully") {
        alert("Verification failed");
        return;
      }

      // STEP 2: START
      const startRes = await api.post(`/attempts/start/${examState.attemptId}`);

      if (startRes.data.message !== "Test started successfully") {
        alert("Failed to start exam");
        return;
      }

      setExamState((prev) => ({
        ...prev,
        status: "in_progress",
        startedAt: new Date().toISOString(),
        referenceImage: capturedImage,
      }));

      // STEP 3: NAVIGATE
      navigate(`/exam/${examState.attemptId}`);
    } catch (err) {
      console.error(err);
      toast.error("Network error while starting the exam");
    }
  };

  const captureFace = () => {
    if (!isFaceDetected) return toast.warning("No face detected!");
    if (isMultiple) return toast.warning("Multiple faces detected!");
    if (!isMatch)
      return toast.warning("Face does not match ID Card! Cannot capture.");
    if (!isCentered)
      return toast.warning("Please center your face in the frame.");
    if (!isAligned) return toast.warning("Please move closer to the camera.");

    const canvas = canvasRef.current;
    if (!videoRef.current || !canvas) return;

    // Ensure canvas dimensions match video
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const image = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(image);
    setChecks((c) => ({ ...c, face: true }));
    toast.success("Photo captured & Verified!");
  };

  /* ================= MICROPHONE ================= */
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const audioCtx = new AudioContext();
        const analyser = audioCtx.createAnalyser();
        const mic = audioCtx.createMediaStreamSource(stream);
        mic.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
          setMicLevel(avg);

          if (avg > 5) {
            setChecks((c) => ({ ...c, microphone: true }));
          }
          requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => {});
  }, []);

  /* ================= SCREEN CHECK ================= */
  /* ================= SCREEN CONFIGURATION ================= */
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();

    const isMobileUA =
      /android|iphone|ipad|ipod|opera mini|iemobile|mobile/.test(ua);

    const isSmallScreen = window.screen.width < 1024;

    const isDesktop = !isMobileUA && !isSmallScreen;

    setChecks((c) => ({ ...c, screen: isDesktop }));
  }, []);

  /* ================= NETWORK ================= */
  useEffect(() => {
    const start = performance.now();
    fetch("/api/health")
      .then(() => {
        const latency = performance.now() - start;
        if (latency < 1000) {
          setChecks((c) => ({ ...c, network: true }));
        }
      })
      .catch(() => {});
  }, []);

  /* ================= FULLSCREEN REQUEST ================= */
  const enableFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  };

  const allPassed = Object.values(checks).every(Boolean) && agreed;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-4 sm:px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black text-white mb-2">
          System Compatibility Check
        </h1>
        <p className="text-slate-400 mb-8">
          We are verifying your hardware and connection stability before
          initiating the secure examination environment.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT */}
          <div className="lg:col-span-5 space-y-6">
            {/* ID Card Upload Section */}
            {!idCard ? (
              <div className="bg-amber-900/20 border border-amber-500/50 rounded-2xl p-6 text-center">
                <h3 className="text-xl font-bold text-amber-500 mb-2">
                  ID Card Required
                </h3>
                <p className="text-sm text-slate-300 mb-4">
                  Please upload your ID card to proceed with face verification.
                </p>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIdUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <Button disabled={isUploading}>
                    {isUploading ? "Uploading..." : "Click to Upload ID"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-900/20 border border-emerald-500/50 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-6 h-6 text-emerald-500"
                    >
                      <path
                        fillRule="evenodd"
                        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-400">
                      ID Card Configured
                    </h3>
                    <p className="text-xs text-emerald-300/70">
                      We found your saved ID photo.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIdUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition">
                    {isUploading ? "Updating..." : "Update ID"}
                  </button>
                </div>
              </div>
            )}

            {/* Camera with ID Check Overlay */}
            {idCard && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                  Camera Preview
                </p>

                <div className="mx-auto w-[340px] aspect-[5/3] bg-black rounded-xl overflow-hidden border border-slate-800 relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  <FaceAlignmentOverlay status={faceStatus} />
                </div>

                <canvas
                  ref={canvasRef}
                  width="320"
                  height="240"
                  className="hidden"
                />

                <Button
                  className="mt-4 w-full"
                  disabled={!checks.camera || !isMatch || checks.face}
                  onClick={captureFace}
                >
                  Capture & Verify Face
                </Button>
              </div>
            )}

            {/* Microphone */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                Microphone Test
              </p>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(micLevel * 2, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Speak normally to activate microphone
              </p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-7 space-y-4">
            {!checks.screen && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm">
                This assessment cannot be taken on mobile devices. Please switch
                to a desktop or laptop computer.
              </div>
            )}

            {[
              ["idCard", "ID Card", "ID Card uploaded successfully"],
              ["camera", "Camera Access", " Make sure Webcam is accessible"],
              ["match", "Face Verification", "Face matches uploaded ID card"],
              [
                "face",
                "Face Capture",
                "After aligning your face, click Capture",
              ],
              ["microphone", "Microphone", "Make sure Mic is picking up sound"],
              [
                "screen",
                "Screen Configuration",
                "Use a desktop/laptop device.",
              ],
              [
                "network",
                "Network Stability",
                "Stable internet connection required",
              ],
              [
                "fullscreen",
                "Fullscreen Mode",
                "After passing all checks, enable fullscreen",
              ],
            ].map(([key, title, desc]) => (
              <div
                key={key}
                className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl p-4"
              >
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>

                <div
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    checks[key]
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {checks[key] ? "Passed" : "Pending"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-10 pt-6 border-t border-slate-900 space-y-6">
          <label className="flex gap-4 text-sm text-slate-400 max-w-3xl">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            I confirm that I am alone, in a quiet environment, and agree to
            monitoring during this assessment.
          </label>

          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <Button variant="ghost" onClick={enableFullscreen}>
              Enable Fullscreen
            </Button>

            <Button
              size="lg"
              disabled={!allPassed}
              onClick={verifyAndStartExam}
            >
              Start Exam
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreCheck;
