import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const AdminLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_user");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <Sidebar onLogout={handleLogout} />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900">
          <h1 className="text-sm font-black uppercase tracking-widest">
            Admin Control Center
          </h1>

          <button
            onClick={handleLogout}
            className="text-xs font-bold text-red-400 hover:text-red-300"
          >
            Logout
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
