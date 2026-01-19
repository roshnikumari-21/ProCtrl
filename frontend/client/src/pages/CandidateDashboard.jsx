import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../components/UI";
import { toastInfo, toastSuccess } from "../utils/toast";
import useBlockBackNavigation from "../hooks/useBlockBackNavigation.js";
import { uploadIDCard, getProfile } from "../services/candidateApi";

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  useBlockBackNavigation(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("candidate_token");
    if (!storedToken) {
      toastInfo("Please login to access your dashboard");
      navigate("/candidate-login");
      return;
    }

    // Load initial state from local storage
    const storedUser = localStorage.getItem("candidate_user");
    if (storedUser) {
      setCandidate(JSON.parse(storedUser));
    }

    // Fetch latest profile from API to sync ID card etc.
    getProfile()
      .then((res) => {
        setCandidate(res.data);
        localStorage.setItem("candidate_user", JSON.stringify(res.data));
      })
      .catch((err) => {
        console.error("Profile sync failed", err);
        // If auth fails, redirect
        if (err.response && err.response.status === 401) {
          localStorage.removeItem("candidate_token");
          localStorage.removeItem("candidate_user");
          navigate("/candidate-login");
        }
      });
  }, [navigate]);

  const [uploading, setUploading] = useState(false);

  const handleJoinTest = () => navigate("/join");
  const handleViewScores = () => navigate("/candidateresult");

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("idCard", file);

    setUploading(true);
    try {
      const response = await uploadIDCard(formData);
      toastSuccess("ID Card uploaded successfully");

      const updatedCandidate = {
        ...candidate,
        idCardImage: response.data.filePath,
      };
      setCandidate(updatedCandidate);
      localStorage.setItem("candidate_user", JSON.stringify(updatedCandidate));
    } catch (error) {
      console.error(error);
      toastInfo(error.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("candidate_token");
    localStorage.removeItem("candidate_user");
    localStorage.removeItem("examState");

    toastSuccess("Logged out successfully");
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

        {/* JOIN TEST */}
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

        {/* PAST SCORES */}
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

        {/* ID VERIFICATION */}
        <Card className="p-6 bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                Verification
              </p>
              <h2 className="text-xl font-black text-white">ID Card</h2>
              <p className="text-slate-500 text-sm mt-1">
                Upload your ID for face matching.
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300 font-black">
              🪪
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {candidate?.idCardImage ? (
              <div className="relative w-full h-32 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 group">
                <img
                  src={
                    candidate.idCardImage.startsWith("http")
                      ? candidate.idCardImage
                      : `http://localhost:5000/${candidate.idCardImage}`
                  }
                  alt="ID Card"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-white text-xs font-bold">Uploaded</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-32 bg-slate-800/50 rounded-lg border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500">
                <span>No ID Uploaded</span>
              </div>
            )}

            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="id-upload"
                disabled={uploading}
              />
              <label
                htmlFor="id-upload"
                className={`flex items-center justify-center w-full py-3 px-4 rounded-lg font-bold text-sm cursor-pointer transition-all ${
                  uploading
                    ? "bg-slate-800 text-slate-500"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20"
                }`}
              >
                {uploading
                  ? "Uploading..."
                  : candidate?.idCardImage
                  ? "Update ID Card"
                  : "Upload ID Card"}
              </label>
            </div>
          </div>
        </Card>

        {/* TIPS */}
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
