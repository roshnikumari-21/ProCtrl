import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Badge } from "../components/UI";
import { useExam } from "../context/ExamContext";
import { toastInfo, toastError } from "../utils/toast";

const Instructions = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const { examState } = useExam();
  const [agreed, setAgreed] = useState(false);

  const test = examState?.test;

  /* ---------------- Protect direct access / refresh ---------------- */
  useEffect(() => {
    if (!test || examState.status !== "joined") {
      toastError(
        null,
        "Exam session not found. Please rejoin the test."
      );
      navigate("/join");
    }
  }, [test, examState, navigate]);

  if (!test) return null;

  /* ---------------- Question breakdown ---------------- */
  const questionStats = test.questions.reduce(
    (acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    },
    {}
  );

  const handleProceed = () => {
    if (!agreed) {
      toastInfo(
        "Please acknowledge the monitoring and exam rules before proceeding"
      );
      return;
    }

    toastInfo("Proceeding to system checks");
    navigate(`/precheck/${testId}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-20 selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-16">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge risk="active">System Authenticated</Badge>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                ID: {testId}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              {test.title}
            </h1>
          </div>

          <div className="flex items-center gap-6 px-6 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl shadow-xl">
            <div className="text-center">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Time Limit
              </p>
              <p className="text-xl font-bold text-white">
                {test.duration}
                <span className="text-xs text-slate-500 ml-1">min</span>
              </p>
            </div>
          </div>
        </div>

        {/* STRUCTURE */}
        <section className="mb-12">
          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">
            Assessment Structure
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { type: "MCQ", count: questionStats.mcq || 0, icon: "📋" },
              { type: "Coding", count: questionStats.coding || 0, icon: "⚡" },
              {
                type: "Descriptive",
                count: questionStats.descriptive || 0,
                icon: "📝",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-slate-600 transition-all"
              >
                <div className="text-2xl mb-3">{item.icon}</div>
                <p className="text-sm font-bold text-white">
                  {item.count} Question{item.count !== 1 && "s"}
                </p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {item.type}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
          {/* PROTOCOLS */}
          <div className="md:col-span-3 space-y-8">
            <section>
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-5">
                Primary Protocols
              </h3>

              <ul className="space-y-4">
                {[
                  "Once started, the test must be completed in a single session.",
                  "Auto-submission occurs when the timer expires.",
                  "Do not resize, minimize, or exit the browser window.",
                  "Navigation is locked for the duration of the test.",
                ].map((rule, idx) => (
                  <li
                    key={idx}
                    className="flex gap-4 text-sm text-slate-400"
                  >
                    <span className="text-slate-700 font-bold">•</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-5">
                Hardware Checklist (Please ensure the following)
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {[
                  "Stable Internet",
                  "Active Webcam",
                  "Quiet Environment",
                  "Solo Presence",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                    <p className="text-[10px] font-bold text-slate-200 uppercase">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* MONITORING */}
          <div className="md:col-span-2">
            <div className="bg-red-500/[0.03] border border-red-500/10 rounded-2xl p-6 h-full">
              <h3 className="text-[10px] font-black text-red-500/70 uppercase tracking-[0.2em] mb-4">
                Monitoring System
              </h3>

              <p className="text-xs text-slate-400 mb-6">
                This examination will be under continuous AI-assisted
                supervision.
              </p>

              {[
                "Webcam & face presence",
                "Ambient audio analysis",
                "Tab and focus tracking",
              ].map((m, i) => (
                <div
                  key={i}
                  className="text-[11px] font-bold text-slate-300 uppercase mb-3"
                >
                  {m}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ACTION */}
        <div className="space-y-10">
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-900">
            <label className="flex gap-4 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-5 h-5 rounded-md border-slate-800 bg-slate-950"
              />
              <p className="text-sm text-slate-400">
                I acknowledge that my camera, microphone, and browser activity
                will be monitored for integrity audits.
              </p>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row justify-between">
            <Button variant="ghost" onClick={() => navigate("/join")}>
              Back to Join
            </Button>

            <Button size="lg" onClick={handleProceed}>
              Proceed
            </Button>
          </div>
        </div>

        <p className="text-center mt-12 text-[10px] text-slate-700 font-black uppercase tracking-[0.3em]">
          Powered by ProCtrl
        </p>
      </div>
    </div>
  );
};

export default Instructions;

