import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../components/UI";
import api from "../services/api";
import { toast } from "react-toastify";

const Results = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("candidate_user");
    if (!stored) {
      navigate("/candidate-login");
      return;
    }
    setCandidate(JSON.parse(stored));
    fetchAttempts();
  }, [navigate]);

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/attempts/my-attempts");
      setAttempts(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch results");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getScoreColor = (score, total) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return "text-emerald-400";
    if (percentage >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
      case "in_progress":
        return "bg-blue-500/10 text-blue-300 border-blue-500/30";
      case "abandoned":
        return "bg-red-500/10 text-red-300 border-red-500/30";
      default:
        return "bg-slate-500/10 text-slate-300 border-slate-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Card className="mb-8 p-8 bg-slate-900 border border-slate-800 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                Your Performance
              </p>
              <h1 className="text-3xl font-black text-white mt-2">
                Past Test Results
              </h1>
              <p className="text-slate-500 mt-2">
                Review your exam attempts and scores
              </p>
            </div>
            {candidate && (
              <div className="text-right text-sm text-slate-400">
                <div className="font-bold text-white">{candidate.name}</div>
                <div>{candidate.email}</div>
              </div>
            )}
          </div>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-slate-400">Loading your results...</p>
            </div>
          </div>
        )}

        {/* No Results State */}
        {!loading && attempts.length === 0 && (
          <Card className="p-12 bg-slate-900 border border-slate-800 shadow-2xl text-center">
            <div className="mb-4 text-4xl">📋</div>
            <h2 className="text-xl font-black text-white mb-2">
              No Test Results Yet
            </h2>
            <p className="text-slate-400 mb-6">
              You haven't completed any tests yet. Start by joining a test from
              your dashboard.
            </p>
            <Button
              onClick={() => navigate("/candidate/dashboard")}
              className="mx-auto"
            >
              Go to Dashboard
            </Button>
          </Card>
        )}

        {/* Results Table */}
        {!loading && attempts.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm text-slate-400 mb-4">
              Total Attempts:{" "}
              <span className="font-bold text-white">{attempts.length}</span>
            </div>

            {attempts.map((attempt) => (
              <Card
                key={attempt._id}
                className="p-6 bg-slate-900 border border-slate-800 shadow-xl hover:border-slate-700 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  {/* Test Info */}
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                      Test
                    </p>
                    <h3 className="text-lg font-black text-white mt-1">
                      {attempt.testId?.name || "Test"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDate(attempt.startedAt)}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeColor(
                        attempt.status
                      )}`}
                    >
                      {attempt.status.charAt(0).toUpperCase() +
                        attempt.status.slice(1).replace("_", " ")}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                      Score
                    </p>
                    <div className="flex items-baseline justify-center gap-1 mt-1">
                      <span
                        className={`text-3xl font-black ${getScoreColor(
                          attempt.score || 0,
                          attempt.totalMarks || 1
                        )}`}
                      >
                        {attempt.score || 0}
                      </span>
                      <span className="text-slate-500 text-sm">
                        / {attempt.totalMarks || 0}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {attempt.totalMarks
                        ? Math.round((attempt.score / attempt.totalMarks) * 100)
                        : 0}
                      %
                    </p>
                  </div>

                  {/* Action */}
                  <div className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white"
                      onClick={() =>
                        navigate(`/attempt/${attempt._id}`, {
                          state: { attempt },
                        })
                      }
                    >
                      View Details
                    </Button>
                  </div>
                </div>

                {/* Additional Info */}
                {attempt.submittedAt && (
                  <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-6 text-sm text-slate-500">
                    <div>
                      <span className="font-bold text-white">Duration:</span>{" "}
                      {attempt.timeSpent || "N/A"}
                    </div>
                    <div>
                      <span className="font-bold text-white">Submitted:</span>{" "}
                      {formatDate(attempt.submittedAt)}
                    </div>
                    {attempt.violations && attempt.violations > 0 && (
                      <div>
                        <span className="font-bold text-red-400">
                          ⚠️ Violations:
                        </span>{" "}
                        {attempt.violations}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => navigate("/candidatedash")}
            variant="ghost"
            className="border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Back to Dashboard
          </Button>
          <Button
            onClick={() => navigate("/join")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Join Another Test
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
