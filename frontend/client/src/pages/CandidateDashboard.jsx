import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../components/UI";

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("candidate_user");
    if (!stored) {
      navigate("/candidate-login");
      return;
    }
    setCandidate(JSON.parse(stored));
  }, [navigate]);

  const handleJoinTest = () => navigate("/join");
  const handleViewScores = () => navigate("/candidate/results");

  const handleLogout = () => {
    localStorage.removeItem("candidate_token");
    localStorage.removeItem("candidate_user");
    localStorage.removeItem("examState");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3 p-8 bg-slate-900 border border-slate-800 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                Candidate Dashboard
              </p>
              <h1 className="text-3xl font-black text-white mt-2">
                {candidate
                  ? `Welcome, ${candidate.name || "Candidate"}`
                  : "Welcome"}
              </h1>
              <p className="text-slate-500 mt-2">
                Access your exam actions and review your history.
              </p>
            </div>
            {candidate && (
              <div className="text-right text-sm text-slate-400">
                <div className="font-bold text-white">{candidate.name}</div>
                <div>{candidate.email}</div>
                <button
                  onClick={handleLogout}
                  className="mt-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                Start
              </p>
              <h2 className="text-xl font-black text-white">Join a Test</h2>
              <p className="text-slate-500 text-sm mt-1">
                Enter your secure test ID and passcode to begin.
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-300 font-black">
              ▶
            </div>
          </div>
          <Button
            fullWidth
            size="lg"
            className="h-12 font-black"
            onClick={handleJoinTest}
          >
            Go to Join Test
          </Button>
        </Card>

        <Card className="p-6 bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                History
              </p>
              <h2 className="text-xl font-black text-white">Past Scores</h2>
              <p className="text-slate-500 text-sm mt-1">
                Review your previous attempts and scores.
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 font-black">
              ★
            </div>
          </div>
          <Button
            fullWidth
            size="lg"
            variant="ghost"
            className="h-12 font-black border border-amber-500/50 text-amber-200 hover:bg-amber-500/10"
            onClick={handleViewScores}
          >
            View Past Scores
          </Button>
        </Card>

        <Card className="lg:col-span-3 p-6 bg-slate-900 border border-slate-800 shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-4">
            Session Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
            {[
              "Keep your ID ready for verification.",
              "Use a quiet, well-lit environment.",
              "Stay on this tab during the exam.",
            ].map((tip, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg bg-slate-950 border border-slate-800"
              >
                {tip}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CandidateDashboard;
