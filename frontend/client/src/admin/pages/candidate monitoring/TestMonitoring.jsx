import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTestById } from "../../services/testApi";
import { getAttemptsByTest } from "../../services/monitoringApi";
import { Card, Button } from "../../../components/UI";

const TestMonitoring = () => {
  const { id: testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("not_started");

  /* ===============================
     FETCH TEST + ATTEMPTS
  =============================== */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [testRes, attemptRes] = await Promise.all([
          getTestById(testId),
          getAttemptsByTest(testId),
        ]);

        setTest(testRes.data);
        setAttempts(attemptRes.data);
      } catch (err) {
        console.error("Failed to load monitoring data", err);
        navigate("/admin/monitoring");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [testId, navigate]);

  const isActiveTest = useMemo(() => {
    if (!test) return false;
    return new Date(test.activeTill) > new Date();
  }, [test]);

  /* ===============================
     GROUP ATTEMPTS
  =============================== */
  const { notStarted, active, submitted } = useMemo(() => {
    if (!test) return { notStarted: [], active: [], submitted: [] };

    const startedEmails = new Set(
      attempts.map((a) => a.candidateEmail)
    );

    const ns = test.allowedCandidates.filter(
      (c) => !startedEmails.has(c.email)
    );

    const act = attempts.filter(
      (a) => a.status === "in_progress"
    );

    const sub = attempts.filter(
      (a) => a.status === "submitted"
    );

    return { notStarted: ns, active: act, submitted: sub };
  }, [test, attempts]);

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-400">
        Loading test monitoring…
      </div>
    );
  }

  if (!test) return null;

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black">
            {test.title}
          </h1>
          <p className="text-sm text-slate-400">
            Test ID: {test.testId}
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => navigate("/admin/monitoring")}
        >
          ← Back
        </Button>
      </div>

      {/* TEST META */}
      <Card className="p-4 flex gap-6 text-sm text-slate-400">
        <span>Duration: {test.duration} min</span>
        <span>
          {isActiveTest ? "Active till" : "Ended at"}:{" "}
          {new Date(test.activeTill).toLocaleString()}
        </span>
        <span>
          Total Candidates: {test.allowedCandidates.length}
        </span>
      </Card>

      {/* TABS */}
      <Card className="p-4 flex gap-4">
        <Button
          variant={tab === "not_started" ? "primary" : "ghost"}
          onClick={() => setTab("not_started")}
        >
          {isActiveTest ? "Not Started" : "Unattempted"} (
          {notStarted.length})
        </Button>

        {isActiveTest && (
          <Button
            variant={tab === "active" ? "primary" : "ghost"}
            onClick={() => setTab("active")}
          >
            Active ({active.length})
          </Button>
        )}

        <Button
          variant={tab === "submitted" ? "primary" : "ghost"}
          onClick={() => setTab("submitted")}
        >
          Submitted ({submitted.length})
        </Button>
      </Card>

      {/* CANDIDATE LIST */}
      <div className="grid grid-cols-2 gap-6">
        {/* NOT STARTED */}
        {tab === "not_started" &&
          notStarted.map((c, i) => (
            <Card key={i} className="p-5">
              <p className="font-semibold">{c.email}</p>
              <p className="text-sm text-slate-400 mt-1">
                Status:{" "}
                {isActiveTest
                  ? "Not Started"
                  : "Unattempted"}
              </p>
            </Card>
          ))}

        {/* ACTIVE */}
        {tab === "active" &&
          active.map((a) => (
            <Card
              key={a._id}
              className="p-5 cursor-pointer hover:border-blue-500 transition"
              onClick={() =>
                navigate(
                  `/admin/monitoring/attempts/${a._id}`
                )
              }
            >
              <p className="font-semibold">
                {a.candidateEmail}
              </p>
              <p className="text-sm text-blue-400 mt-1">
                In Progress
              </p>
            </Card>
          ))}

        {/* SUBMITTED */}
        {tab === "submitted" &&
          submitted.map((a) => (
            <Card
              key={a._id}
              className="p-5 cursor-pointer hover:border-green-500 transition"
              onClick={() =>
                navigate(
                  `/admin/monitoring/attempts/${a._id}`
                )
              }
            >
              <p className="font-semibold">
                {a.candidateEmail}
              </p>
              <p className="text-sm text-green-400 mt-1">
                Submitted
              </p>
            </Card>
          ))}
      </div>
    </div>
  );
};

export default TestMonitoring;

