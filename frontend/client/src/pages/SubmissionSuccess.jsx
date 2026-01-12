import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Textarea, Input } from "../components/UI";
import { toast } from "react-toastify";

const ratingOptions = [
  { value: 5, label: "Excellent" },
  { value: 4, label: "Good" },
  { value: 3, label: "Average" },
  { value: 2, label: "Below Average" },
  { value: 1, label: "Poor" },
];

const SubmissionSuccess = () => {
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [rating, setRating] = useState(null);
  const [headline, setHeadline] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* ===============================
     AUTH GUARD
  =============================== */
  useEffect(() => {
    const stored = localStorage.getItem("candidate_user");
    if (!stored) {
      toast.error("Session expired. Please login again.");
      navigate("/candidatelogin");
      return;
    }

    try {
      setCandidate(JSON.parse(stored));
    } catch {
      toast.error("Failed to load candidate information");
      navigate("/candidatelogin");
    }
  }, [navigate]);

  /* ===============================
     SUBMIT FEEDBACK
  =============================== */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!rating) {
      toast.error("Please select a rating before submitting");
      return;
    }

    setSubmitting(true);

    const feedbackPayload = {
      rating,
      headline: headline.trim(),
      comments: comments.trim(),
      candidate: candidate?.email || "anonymous",
      submittedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(
        "candidate_feedback",
        JSON.stringify(feedbackPayload)
      );

      toast.success("Thank you for your feedback!");

      // reset form
      setRating(null);
      setHeadline("");
      setComments("");
    } catch (err) {
      console.error("Feedback storage error:", err);
      toast.error("Unable to save feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ===============================
     UI
  =============================== */
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT */}
        <Card className="lg:col-span-3 p-8 bg-slate-900 border border-slate-800 shadow-2xl">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-2xl font-black">
              ✓
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">
                Submission Received
              </p>
              <h1 className="text-3xl font-black text-white mt-1">
                Thank you for completing your test!
              </h1>
              <p className="text-slate-400 mt-2">
                We would love to hear about your experience.
              </p>

              {candidate && (
                <p className="text-sm text-slate-500 mt-1">
                  Sharing as{" "}
                  <span className="text-white font-semibold">
                    {candidate.name || "Candidate"}
                  </span>{" "}
                  ({candidate.email})
                </p>
              )}
            </div>
          </div>

          {/* FEEDBACK FORM */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-3">
                Overall Rating
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {ratingOptions.map((option) => {
                  const isActive = rating === option.value;

                  return (
                    <Button
                      key={option.value}
                      type="button"
                      fullWidth
                      variant={isActive ? "primary" : "secondary"}
                      className={`h-12 font-bold ${
                        isActive ? "ring-2 ring-slate-200" : ""
                      }`}
                      onClick={() => setRating(option.value)}
                    >
                      <span className="text-lg">{option.value}</span>
                      <span className="text-xs uppercase tracking-wider">
                        {option.label}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <Input
              label="One-line summary"
              placeholder="e.g. Smooth flow and clear instructions"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />

            <Textarea
              label="Additional comments (optional)"
              placeholder="Tell us what worked well or what could improve."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />

            <Button
              type="submit"
              size="lg"
              fullWidth
              className="h-12 font-black uppercase tracking-widest"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </form>
        </Card>

        {/* RIGHT */}
        <Card className="lg:col-span-2 p-8 bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-xl bg-sky-500/10 border border-sky-500/40 flex items-center justify-center text-sky-300 text-2xl font-black">
              💬
            </div>

            <h2 className="text-2xl font-black text-white">
              We Appreciate You
            </h2>

            <p className="text-slate-400 leading-relaxed">
              Your feedback helps us improve the platform and maintain a secure,
              smooth testing experience for everyone.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => navigate("/candidatedash")}
            >
              Back to Dashboard
            </Button>

            <Button
              variant="ghost"
              fullWidth
              className="border border-slate-800"
              onClick={() => navigate("/join")}
            >
              Join Another Test
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SubmissionSuccess;

