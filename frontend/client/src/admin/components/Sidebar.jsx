import { Link, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Eye,
  BarChart2,
} from "lucide-react";

const Sidebar = ({ onLogout }) => {
  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition
     ${
       isActive
         ? "bg-white text-black"
         : "text-slate-400 hover:bg-slate-900 hover:text-white"
     }`;

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center px-6 border-b border-slate-800">
        <div className="w-9 h-9 bg-white text-black rounded-lg flex items-center justify-center font-black">
          <Link to="/">P</Link>
        </div>
        <span className="ml-3 font-black text-sm tracking-widest">
          ProCtrl
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <NavLink to="/admin/dashboard" className={navItemClass}>
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>

        <NavLink to="/admin/questions" className={navItemClass}>
          <FileText size={16} />
          Question Bank
        </NavLink>

        <NavLink to="/admin/tests" className={navItemClass}>
          <ClipboardList size={16} />
          Tests
        </NavLink>

        <NavLink to="/admin/monitoring" className={navItemClass}>
          <Eye size={16} />
          Live Monitoring
        </NavLink>

        <NavLink to="/admin/results" className={navItemClass}>
          <BarChart2 size={16} />
          Results
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full text-left px-4 py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-slate-900"
        >
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
