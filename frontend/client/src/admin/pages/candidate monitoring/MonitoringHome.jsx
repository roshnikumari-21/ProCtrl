import { NavLink, Outlet } from "react-router-dom";
import { Card } from "../../../components/UI";

const MonitoringHome = () => {
  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-black">
          Candidate Monitoring
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl">
          Monitor candidate activity during live tests, review completed
          attempts, inspect violations, and generate integrity reports.
        </p>
      </div>

      {/* OVERVIEW STATS */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-400">Active Tests</p>
          <p className="text-2xl font-bold text-blue-400">—</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-slate-400">
            Active Candidates
          </p>
          <p className="text-2xl font-bold text-green-400">—</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-slate-400">
            Violations Today
          </p>
          <p className="text-2xl font-bold text-red-400">—</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-slate-400">
            Avg Integrity Score
          </p>
          <p className="text-2xl font-bold text-slate-200">—</p>
        </Card>
      </div>

      {/* SYSTEM STATUS */}
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-400">●</span>
          <span className="text-slate-300">
            Monitoring system active
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Live events only · No video or audio recordings stored
        </p>
      </Card>

      {/* TOP-LEVEL TABS */}
      <Card className="p-4 flex gap-4">
        <NavLink
          to="active"
          className={({ isActive }) =>
            `px-4 py-2 rounded font-medium transition ${
              isActive
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white"
            }`
          }
        >
          Active Tests
        </NavLink>

        <NavLink
          to="past"
          className={({ isActive }) =>
            `px-4 py-2 rounded font-medium transition ${
              isActive
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white"
            }`
          }
        >
          Past Tests
        </NavLink>
      </Card>

      {/* CONTEXT / GUIDANCE */}
      <div className="text-sm text-slate-400">
        <p>
          <strong className="text-slate-300">
            Active Tests:
          </strong>{" "}
          Monitor candidates in real time, view live status, and track
          violations as they occur.
        </p>
        <p className="mt-1">
          <strong className="text-slate-300">
            Past Tests:
          </strong>{" "}
          Review completed attempts, inspect violation timelines, and
          download test reports.
        </p>
      </div>

      {/* CHILD VIEW */}
      <Outlet />
    </div>
  );
};

export default MonitoringHome;

