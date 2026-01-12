import { Card } from "../../../components/UI";

const getRiskColor = (score) => {
  if (score >= 85) return "text-green-400";
  if (score >= 65) return "text-yellow-400";
  return "text-red-400";
};

const CandidateCard = ({ candidate }) => {
  return (
    <Card className="p-6 flex justify-between items-center">
      <div>
        <h2 className="text-xl font-bold">
          {candidate.name}
        </h2>
        <p className="text-sm text-slate-400">
          {candidate.email}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Attempt ID: {candidate.attemptId}
        </p>
      </div>

      <div className="text-right">
        <p className="text-xs text-slate-400">Status</p>
        <p className="font-semibold">
          {candidate.status}
        </p>

        <p className="text-xs text-slate-400 mt-2">
          Integrity Score
        </p>
        <p
          className={`text-2xl font-bold ${getRiskColor(
            candidate.integrityScore
          )}`}
        >
          {candidate.integrityScore}%
        </p>
      </div>
    </Card>
  );
};

export default CandidateCard;
