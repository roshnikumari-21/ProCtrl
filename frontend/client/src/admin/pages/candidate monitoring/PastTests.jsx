import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyTests } from "../../services/testApi";
import { getAttemptStatsByTest } from "../../services/monitoringApi";
import { Card, Button } from "../../../components/UI";

const PastTests = () => {
  const navigate = useNavigate();

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ===============================
     FETCH PAST TESTS + ATTEMPT STATS
  =============================== */
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await getMyTests();
        const expiredTests = res.data.expired || [];

        const enrichedTests = await Promise.all(
          expiredTests.map(async (test) => {
            const statsRes = await getAttemptStatsByTest(test._id);

            return {
              ...test,
              attemptStats: statsRes.data.attemptStats,
            };
          })
        );

        setTests(enrichedTests);
      } catch (err) {
        console.error("Failed to load past tests", err);
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
        Loading past tests…
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <Card className="p-12 text-center text-slate-400">
        No past tests found
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
          submitted = 0,
          terminated = 0,
        } = test.attemptStats || {};

        return (
          <Card
            key={test._id}
            className="p-6 hover:border-slate-600 transition"
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
                Ended at:{" "}
                {new Date(test.activeTill).toLocaleString()}
              </p>
            </div>

            {/* CANDIDATE STATS */}
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-900 rounded p-2">
                <p className="text-xs text-slate-400">
                  Unattempted
                </p>
                <p className="text-lg font-bold text-slate-300">
                  {not_started}
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

            {/* ACTIONS */}
            <div className="mt-5 flex gap-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  navigate(`/admin/monitoring/tests/${test._id}`)
                }
              >
                View Candidates
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  navigate(
                    `/admin/monitoring/tests/${test._id}/report`
                  )
                }
              >
                View Report
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default PastTests;

 