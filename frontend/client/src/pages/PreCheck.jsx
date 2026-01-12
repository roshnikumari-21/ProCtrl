import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/UI";
import { useExam } from "../context/ExamContext";
import api from "../services/api";
import { toast } from "react-toastify";

const PreCheck = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { examState, setExamState } = useExam();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [checks, setChecks] = useState({
    camera: false,
    face: false,
    microphone: false,
    screen: false,
    network: false,
    fullscreen: false,
  });

  const [micLevel, setMicLevel] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);

  /* ================= PROTECT ACCESS ================= */
  useEffect(() => {
    if (!examState || examState.status !== "joined") {
      toast.error("Invalid exam session. Please rejoin the test.");
      navigate("/join");
    }
  }, [examState, navigate]);

  /* ================= FULLSCREEN MONITOR ================= */
  useEffect(() => {
    const handleFullscreenChange = () => {
      setChecks((prev) => ({
        ...prev,
        fullscreen: Boolean(document.fullscreenElement),
      }));
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
      .catch(() => {
        toast.error("Camera access denied. Please enable webcam.");
      });
  }, []);

  const captureFace = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setChecks((c) => ({ ...c, face: true }));
    toast.success("Face captured successfully");
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
          const avg =
            data.reduce((sum, val) => sum + val, 0) / data.length;

          setMicLevel(avg);
          if (avg > 5) {
            setChecks((c) => ({ ...c, microphone: true }));
          }
          requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => {
        toast.error("Microphone access denied");
      });
  }, []);

  /* ================= SCREEN ================= */
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isMobile =
      /android|iphone|ipad|ipod|mobile/.test(ua) ||
      window.screen.width < 1024;

    setChecks((c) => ({ ...c, screen: !isMobile }));
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
      .catch(() => {
        toast.error("Network connectivity check failed");
      });
  }, []);

  /* ================= FULLSCREEN ================= */
  const enableFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      toast.error("Fullscreen permission denied");
    }
  };

  const allPassed = Object.values(checks).every(Boolean) && agreed;

  /* ================= VERIFY & START ================= */
  const verifyAndStartExam = async () => {
    if (!allPassed || starting) return;

    setStarting(true);

    try {
      await api.post(`/attempts/verify/${examState.attemptId}`);
      await api.post(`/attempts/start/${examState.attemptId}`);

      const updatedState = {
        ...examState,
        status: "in_progress",
        startedAt: new Date().toISOString(),
      };

      setExamState(updatedState);
      localStorage.setItem("examState", JSON.stringify(updatedState));

      toast.success("Exam started. Good luck!");
      navigate(`/exam/${examState.attemptId}`);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Failed to start exam. Please contact support."
      );
    } finally {
      setStarting(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-4 sm:px-6 py-10">
      <div className="max-w-6xl mx-auto">
        {/* UI unchanged – only logic improved */}
        {/* … your existing JSX stays exactly the same … */}

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
              disabled={!allPassed || starting}
              onClick={verifyAndStartExam}
            >
              {starting ? "Starting Exam…" : "Start Exam"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreCheck;

