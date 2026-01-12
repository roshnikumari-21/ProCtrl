import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Button } from "../../../components/UI";
import CandidateCard from "./CandidateCard";
import ViolationTimeline from "./ViolationTimeline";
import { getAttemptById } from "../../services/monitoringApi";

const CandidateDetails = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    console.log("FETCHING ATTEMPT", attemptId);
    getAttemptById(attemptId)
      .then((res) => setAttempt(res.data))
      .catch(() => alert("Failed to load attempt"))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-400">
        Loading candidate details…
      </div>
    );
  }

  if (!attempt) return null;

  const durationUsed =
    attempt.startedAt && attempt.submittedAt
      ? Math.round(
          (new Date(attempt.submittedAt) -
            new Date(attempt.startedAt)) /
            60000
        )
      : null;

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black">
          Candidate Attempt Details
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
          integrityScore: attempt.integrityScore ?? 100,
        }}
      />

      {/* TIME INFO */}
      <Card className="p-4 text-sm text-slate-400 flex gap-6">
        {attempt.startedAt && (
          <span>
            Started:{" "}
            {new Date(attempt.startedAt).toLocaleString()}
          </span>
        )}
        {attempt.submittedAt && (
          <span>
            Submitted:{" "}
            {new Date(attempt.submittedAt).toLocaleString()}
          </span>
        )}
        {durationUsed !== null && (
          <span>
            Duration Used: {durationUsed} / {attempt.test.duration} min
          </span>
        )}
      </Card>

      {/* LIVE MONITORING */}
      {attempt.status === "in_progress" && (
        <Card className="p-6 text-center text-slate-400">
          Live monitoring feed will appear here
        </Card>
      )}

      {/* VIOLATIONS */}
      <ViolationTimeline
        violations={attempt.violations.map((v) => ({
          type: v.type,
          severity: v.metadata?.severity || "medium",
          confidence: v.metadata?.confidence || 0.8,
          timestamp: v.timestamp,
          details: v.metadata?.details,
          snapshot: v.metadata?.snapshotUrl,
        }))}
      />

      {/* ADMIN ACTIONS */}
      <Card className="p-6 space-y-3">
        <h3 className="font-bold">Admin Actions</h3>

        <div className="flex gap-3">
          <Button variant="ghost">Warn Candidate</Button>
          <Button variant="ghost">Add Manual Flag</Button>
          <Button variant="danger">Terminate Attempt</Button>
        </div>
      </Card>
    </div>
  );
};

export default CandidateDetails;
