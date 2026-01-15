import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Button } from "../components/UI";
import CandidateCard from "../admin/pages/candidate monitoring/CandidateCard";
import ViolationTimeline from "../admin/pages/candidate monitoring/ViolationTimeline";
import { getAttemptById } from "../admin/services/monitoringApi";
import ViolationSummary from "../admin/pages/candidate monitoring/ViolationSummary";
import AttemptEvaluation from "../admin/pages/candidate monitoring/AttemptEvaluation";


const AttemptDetails = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);

  useEffect(() => {
    getAttemptById(attemptId).then((res) => setAttempt(res.data));
  }, [attemptId]);

  if (!attempt) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading candidate details…
      </div>
    );
  }

  const duration =
    attempt.startedAt && attempt.submittedAt
      ? Math.round(
          (new Date(attempt.submittedAt) - new Date(attempt.startedAt)) / 60000
        )
      : null;

  return (
    // 🔥 DARK THEME ROOT
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black">
            Attempt Details
          </h1>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            ← Back
          </Button>
        </div>

        {/* SUMMARY */}
        <CandidateCard
          candidate={{
            name: attempt.candidateName,
            email: attempt.candidateEmail,
            attemptId: attempt._id,
            status: attempt.status,
            score: `${attempt.score}/${attempt.totalMarks}`,
            integrityScore: attempt.integrityScore,
          }}
        />

        {/* META */}
        <Card className="p-4 flex gap-6 text-sm text-slate-400">
          <span>
            Started:{" "}
            {attempt.startedAt &&
              new Date(attempt.startedAt).toLocaleString()}
          </span>
          <span>
            Submitted:{" "}
            {attempt.submittedAt &&
              new Date(attempt.submittedAt).toLocaleString()}
          </span>
          {duration !== null && (
            <span>Duration Used: {duration} min</span>
          )}
        </Card>

        {/* VIOLATIONS */}
        <ViolationTimeline violations={attempt.violations} />

        {attempt.status !== "in_progress" && (
          <ViolationSummary violations={attempt.violations} />
        )}

        {/* ANSWER EVALUATION */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">
            Answer Evaluation
          </h2>
          <AttemptEvaluation attempt={attempt} />
        </Card>
      </div>
    </div>
  );
};


export default AttemptDetails;