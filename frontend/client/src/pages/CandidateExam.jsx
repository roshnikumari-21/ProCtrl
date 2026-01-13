import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Badge } from "../components/UI";
import { useExam } from "../context/ExamContext";
import useProctoring from "../hooks/useProctoring";
import useFaceDetection from "../hooks/useFaceDetection.jsx";
import candidateApi from "../services/candidateApi.js";
import socket from "../services/socket";
import Editor from "@monaco-editor/react";
import { toast } from "react-toastify";
import { exitFullscreen } from "../utils/fullscreen";

const CandidateExam = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { examState, setExamState } = useExam();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("cpp");
  const [runOutput, setRunOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const test = examState.test;
  const questions = test?.questions || [];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);
  const autoSaveFailedRef = useRef(false);

  /* ================= AUTO SAVE (DEBOUNCED) ================= */
  useEffect(() => {
    if (!attemptId || examState.status !== "in_progress") {
      autoSaveFailedRef.current = false;
      return;
    }

    // Don't retry if auto-save already failed (attempt likely ended)
    if (autoSaveFailedRef.current) return;

    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout to save after 2 seconds of no changes
    autoSaveTimeoutRef.current = setTimeout(() => {
      candidateApi
        .post(`/attempts/save/${attemptId}`, {
          answers: Object.entries(answers).map(([q, a]) => ({
            question: q,
            ...a,
          })),
        })
        .catch((err) => {
          const errorMsg = err.response?.data?.message || err.message;
          console.error("Auto-save failed:", errorMsg);

          // If attempt is invalid, mark to stop retrying
          if (
            errorMsg === "Invalid attempt" ||
            errorMsg === "Test is not in progress"
          ) {
            autoSaveFailedRef.current = true;
          }
        });
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [answers, attemptId, examState.status]);

  /* ================= SAFETY GUARD ================= */
  useEffect(() => {
    if (!attemptId) {
      toast.error("Invalid exam session. Please rejoin the test.");
      navigate("/");
      return;
    }

    if (!test) {
      toast.error("Exam data not found. Please rejoin the test.");
      navigate("/");
    }
  }, [attemptId, test, navigate]);

  /* ================= SOCKET JOIN ================= */
  useEffect(() => {
    if (!attemptId || !test) return;

    socket.emit("candidate:join", {
      attemptId,
      testId: test.testId,
    });

    return () => socket.disconnect();
  }, [attemptId, test]);

  /* ================= PROCTORING ================= */
  useProctoring(attemptId, test?.testId, videoRef, isSubmitted);
  useFaceDetection(videoRef, attemptId, test?.testId);

  /* ================= FULLSCREEN ================= */
  useEffect(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        toast.error(
          "Fullscreen mode is required for this exam. Please enable fullscreen."
        );
      });
    }
  }, []);

  /* ================= CAMERA PREVIEW ================= */
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        toast.error(
          "Camera access denied. This may be recorded as a violation."
        );
      });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /* ================= TIMER INIT ================= */
  useEffect(() => {
    if (!test || !examState.startedAt) return;

    const startTime = new Date(examState.startedAt).getTime();
    const durationMs = test.duration * 60 * 1000;
    const endTime = startTime + durationMs;

    setTimeLeft(Math.floor((endTime - Date.now()) / 1000));
  }, [test, examState.startedAt]);

  const runCode = async () => {
    try {
      setIsRunning(true);
      setRunOutput("");

      const res = await candidateApi.post("/code/run", {
        questionId: currentQuestion._id,
        code,
        language,
      });

      const formatted = res.data.results
        .map(
          (r) =>
            `Testcase ${r.testCase}: ${
              r.passed ? "✅ Passed" : "❌ Failed"
            }\n` +
            `Expected: ${r.expectedOutput}\n` +
            `Actual: ${r.actualOutput}\n`
        )
        .join("\n");

      setRunOutput(formatted);
    } catch (err) {
      const msg =
        err.response?.data?.message || "System error while running code";

      setRunOutput(msg);
      toast.error(msg);
    } finally {
      setIsRunning(false);
    }
  };

  const submitCode = async () => {
    try {
      setIsSubmittingCode(true);

      const res = await candidateApi.post("/code/submit", {
        attemptId,
        questionId: currentQuestion._id,
        code,
        language,
      });

      const result = res.data;

      setAnswers((prev) => ({
        ...prev,
        [currentQuestion._id]: {
          ...prev[currentQuestion._id],
          codingAnswer: {
            code,
            language,
            verdict: result.verdict,
            passedTestCases: result.passedTestCases,
            totalTestCases: result.totalTestCases,
            executionTimeMs: result.executionTimeMs,
          },
        },
      }));

      toast.success(
        result.verdict === "Accepted"
          ? "All test cases passed!"
          : `Submission result: ${result.verdict}`
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed");
    } finally {
      setIsSubmittingCode(false);
    }
  };

  /* ================= TIMER ================= */
  useEffect(() => {
    if (timeLeft === null) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft]);

  /* ================= ANSWERS ================= */
  const handleAnswerChange = (value) => {
    const q = questions[currentIdx];

    setAnswers((prev) => ({
      ...prev,
      [q._id]: {
        ...prev[q._id],
        ...(q.type === "mcq" && { mcqAnswer: value }),
        ...(q.type === "descriptive" && { descriptiveAnswer: value }),
        ...(q.type === "coding" && {
          codingAnswer: {
            ...(prev[q._id]?.codingAnswer || {}),
            code: value,
            language,
          },
        }),
      },
    }));
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (auto = false) => {
    try {
      await candidateApi.post(`/attempts/submit/${attemptId}`, {
        answers: Object.entries(answers).map(([q, a]) => ({
          question: q,
          answer: a,
        })),
      });

      // Stop Camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Exit Fullscreen
      await exitFullscreen();

      socket.emit("candidate:submit", {
        attemptId,
        testId: test.testId,
      });

      localStorage.removeItem("examState");

      setExamState((prev) => ({ ...prev, status: "submitted" }));

      toast.success(auto ? "Time up. Exam submitted." : "Exam submitted.");
      navigate("/thank-you");
    } catch (err) {
      setIsSubmitted(false);
      console.error("Submit failed:", err);
      const errorMsg = err.response?.data?.message || "Failed to submit exam";
      toast.error(errorMsg);
    }
  };

  const currentQuestion = questions[currentIdx];
  useEffect(() => {
    if (currentQuestion?.type !== "coding") return;

    const savedCoding = answers[currentQuestion._id]?.codingAnswer;

    const resolvedLanguage = savedCoding?.language || language;

    const resolvedCode =
      savedCoding?.code ??
      currentQuestion.coding?.boilerplateCode?.[resolvedLanguage] ??
      "";

    // Important: update language first, then code
    setLanguage(resolvedLanguage);
    setCode(resolvedCode);
  }, [currentIdx]);

  const formatTime = (sec) =>
    `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(
      sec % 60
    ).padStart(2, "0")}`;

  if (!test) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        <p className="text-slate-400 text-sm">
          Initializing secure exam environment…
        </p>
      </div>
    );
  }

  /* ================= RENDER ================= */
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
      {/* TOP BAR */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Badge risk="active" className="text-[9px] px-2">
            LIVE
          </Badge>
          <span className="font-bold">{test.title}</span>
        </div>

        <div className="flex items-center gap-6">
          <span
            className={`font-mono text-xl font-bold ${
              timeLeft < 300 ? "text-red-500 animate-pulse" : "text-white"
            }`}
          >
            {formatTime(timeLeft || 0)}
          </span>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleSubmit(false)}
          >
            Finish
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* MAIN */}
        <main className="flex-1 overflow-y-auto p-10 pb-24">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between text-xs uppercase text-slate-500 font-black">
              <span>
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="bg-slate-900 px-3 py-1 rounded border border-slate-800">
                {currentQuestion.type}
              </span>
            </div>

            <h2 className="text-2xl font-bold">
              {currentQuestion.questionText}
            </h2>

            {currentQuestion.type === "mcq" &&
              currentQuestion.mcq.options.map((opt, i) => (
                <label
                  key={i}
                  className={`flex items-center p-4 border rounded-xl cursor-pointer ${
                    answers[currentQuestion._id] === i
                      ? "border-white bg-slate-900"
                      : "border-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    checked={answers[currentQuestion._id]?.mcqAnswer === i}
                    onChange={() => handleAnswerChange(i)}
                  />
                  <span className="ml-4">{opt}</span>
                </label>
              ))}

            {currentQuestion.type === "descriptive" && (
              <textarea
                className="w-full h-72 bg-slate-900 border border-slate-800 rounded-xl p-5"
                value={answers[currentQuestion._id]?.descriptiveAnswer || ""}
                onChange={(e) => handleAnswerChange(e.target.value)}
              />
            )}

            {currentQuestion.type === "coding" && (
              <div className="space-y-4">
                {/* Language + Actions */}
                <div className="flex justify-between items-center">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-slate-900 border border-slate-700 px-3 py-2 rounded"
                  >
                    {currentQuestion.coding.supportedLanguages.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang.toUpperCase()}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isRunning}
                      onClick={runCode}
                    >
                      {isRunning ? "Running..." : "Run Code"}
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isSubmittingCode}
                      onClick={submitCode}
                    >
                      {isSubmittingCode ? "Submitting..." : "Submit Code"}
                    </Button>
                  </div>
                </div>

                {/* Monaco Editor */}
                <Editor
                  height="420px"
                  language={language === "cpp" ? "cpp" : language}
                  value={code}
                  theme="vs-dark"
                  onChange={(val) => {
                    const newCode = val || "";
                    setCode(newCode);
                    handleAnswerChange(newCode);
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                  }}
                />

                {/* Output */}
                <div className="bg-black text-green-400 p-4 rounded-xl text-sm font-mono min-h-[120px]">
                  {runOutput || "Output will appear here..."}
                </div>
                {answers[currentQuestion._id]?.codingAnswer && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-400">Verdict</span>
                      <span
                        className={`font-bold ${
                          answers[currentQuestion._id].codingAnswer.verdict ===
                          "Accepted"
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {answers[currentQuestion._id].codingAnswer.verdict}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Hidden Test Cases</span>
                      <span className="font-mono">
                        {
                          answers[currentQuestion._id].codingAnswer
                            .passedTestCases
                        }{" "}
                        /{" "}
                        {
                          answers[currentQuestion._id].codingAnswer
                            .totalTestCases
                        }
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Execution Time</span>
                      <span className="font-mono">
                        {
                          answers[currentQuestion._id].codingAnswer
                            .executionTimeMs
                        }{" "}
                        ms
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-8">
              <Button
                variant="secondary"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(currentIdx - 1)}
              >
                Previous
              </Button>
              <Button
                disabled={currentIdx === questions.length - 1}
                onClick={() => setCurrentIdx(currentIdx + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </main>

        {/* SIDE PANEL */}
        <aside className="hidden lg:flex w-96 border-l border-slate-900 p-6 flex-col gap-6">
          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase mb-3">
              Proctor Feed
            </h3>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="rounded-xl opacity-70"
            />
          </div>

          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase mb-3">
              Question Map
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={`h-10 rounded-lg font-bold ${
                    currentIdx === i
                      ? "bg-white text-black"
                      : answers[questions[i]._id]
                      ? "bg-slate-800"
                      : "bg-slate-900 text-slate-500"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CandidateExam;
