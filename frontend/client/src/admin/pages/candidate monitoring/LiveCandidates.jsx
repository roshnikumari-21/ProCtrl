import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../../components/UI";
import { getLiveCandidates } from "../../services/monitoringApi";
import LiveCandidateCard from "./LiveCandidateCard";

const LiveCandidates = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveCandidates = async () => {
      try {
        const res = await getLiveCandidates();
        setCandidates(res.data || []);
      } catch (err) {
        console.error("Failed to load live candidates", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveCandidates();

    // 🔄 Auto refresh metadata (NOT video)
    const interval = setInterval(fetchLiveCandidates, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-400">
        Loading live candidates…
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <Card className="p-12 text-center text-slate-400">
        No candidates are currently taking a test
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-2xl font-black mb-6">
        Live Candidates
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {candidates.map((candidate) => (
          <LiveCandidateCard
            key={candidate.attemptId}
            candidate={candidate}
            onClick={() =>
              navigate(
                `/admin/monitoring/attempts/${candidate.attemptId}`
              )
            }
          />
        ))}
      </div>
    </div>
  );
};

export default LiveCandidates;

