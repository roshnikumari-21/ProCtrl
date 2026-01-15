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

      {/* CHILD VIEW */}
      <Outlet />
    </div>
  );
};

export default MonitoringHome;

