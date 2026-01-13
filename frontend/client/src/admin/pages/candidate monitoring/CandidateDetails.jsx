import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Button } from "../../../components/UI";
import CandidateCard from "./CandidateCard";
import LiveMonitor from "./LiveMonitor";
import ViolationTimeline from "./ViolationTimeline";
import AdminActions from "./AdminActions";
import { getAttemptById } from "../../services/monitoringApi";

const CandidateDetails = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);

  useEffect(() => {
    getAttemptById(attemptId).then((res) => setAttempt(res.data));
  }, [attemptId]);

  if (!attempt) {
    return (
      <div className="p-10 text-center text-slate-400">
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
    <div className="max-w-7xl mx-auto p-8 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between">
        <h1 className="text-2xl font-black">Candidate Attempt Monitoring</h1>
        <Button onClick={() => navigate(-1)}>← Back</Button>
      </div>

      {/* SUMMARY */}
      <CandidateCard
        candidate={{
          name: attempt.candidateName,
          email: attempt.candidateEmail,
          attemptId: attempt._id,
          status: attempt.status,
          integrityScore: 100 - attempt.violations.length * 5,
        }}
      />

      {/* META */}
      <Card className="p-4 flex gap-6 text-sm text-slate-400">
        <span>
          Started:{" "}
          {attempt.startedAt && new Date(attempt.startedAt).toLocaleString()}
        </span>
        <span>
          Submitted:{" "}
          {attempt.submittedAt &&
            new Date(attempt.submittedAt).toLocaleString()}
        </span>
        {duration !== null && <span>Duration Used: {duration} min</span>}
      </Card>

      {/* MAIN GRID */}
      <div
        className={`grid grid-cols-1 gap-6 ${
          attempt.status === "in_progress" ? "lg:grid-cols-2" : ""
        }`}
      >
        {attempt.status === "in_progress" && (
          <LiveMonitor attemptId={attempt._id} />
        )}
        <ViolationTimeline violations={attempt.violations} />
      </div>

      {/* ADMIN ACTIONS */}
      <AdminActions attemptId={attempt._id} testId={attempt.test} />
    </div>
  );
};

export default CandidateDetails;
