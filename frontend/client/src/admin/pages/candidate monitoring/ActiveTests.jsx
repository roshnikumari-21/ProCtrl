import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyTests } from "../../services/testApi";
import { getAttemptStatsByTest } from "../../services/monitoringApi";
import { Card } from "../../../components/UI";

const ActiveTests = () => {
  const navigate = useNavigate();

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ===============================
     FETCH ACTIVE TESTS + ATTEMPT STATS
  =============================== */
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await getMyTests();
        const liveTests = res.data.live || [];

        const enrichedTests = await Promise.all(
          liveTests.map(async (test) => {
            const statsRes = await getAttemptStatsByTest(test._id);

            return {
              ...test,
              attemptStats: statsRes.data.attemptStats,
            };
          })
        );

        setTests(enrichedTests);
      } catch (err) {
        console.error("Failed to load active tests", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  /* ===============================
     LOADING / EMPTY STATES
  =============================== */
  if (loading) {
    return (
      <div className="p-10 text-center text-slate-400">
        Loading active tests…
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <Card className="p-12 text-center text-slate-400">
        No active tests right now
      </Card>
    );
  }

  /* ===============================
     RENDER
  =============================== */
  return (
    <div className="grid grid-cols-2 gap-6">
      {tests.map((test) => {
        const {
          not_started = 0,
          in_progress = 0,
          submitted = 0,
          terminated = 0,
        } = test.attemptStats || {};

        return (
          <Card
            key={test._id}
            className="p-6 cursor-pointer hover:border-blue-500 transition"
            onClick={() =>
              navigate(`/admin/monitoring/tests/${test._id}`)
            }
          >
            {/* HEADER */}
            <div className="mb-4">
              <h3 className="text-lg font-bold">{test.title}</h3>
              <p className="text-xs text-slate-400">
                Test ID: {test.testId}
              </p>
            </div>

            {/* META */}
            <div className="text-sm text-slate-400 space-y-1">
              <p>Duration: {test.duration} min</p>
              <p>
                Active till:{" "}
                {new Date(test.activeTill).toLocaleString()}
              </p>
            </div>

            {/* CANDIDATE STATS */}
            <div className="mt-4 grid grid-cols-4 gap-3 text-center">
              <div className="bg-slate-900 rounded p-2">
                <p className="text-xs text-slate-400">
                  Not Started
                </p>
                <p className="text-lg font-bold text-slate-200">
                  {not_started}
                </p>
              </div>

              <div className="bg-slate-900 rounded p-2">
                <p className="text-xs text-slate-400">
                  Active
                </p>
                <p className="text-lg font-bold text-blue-400">
                  {in_progress}
                </p>
              </div>

              <div className="bg-slate-900 rounded p-2">
                <p className="text-xs text-slate-400">
                  Submitted
                </p>
                <p className="text-lg font-bold text-green-400">
                  {submitted}
                </p>
              </div>

              <div className="bg-slate-900 rounded p-2">
                <p className="text-xs text-slate-400">
                  Terminated
                </p>
                <p className="text-lg font-bold text-red-400">
                  {terminated}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default ActiveTests;

