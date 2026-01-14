import { useEffect, useState } from "react";
import useBlockBackNavigation from "../../hooks/useBlockBackNavigation";

const AdminDashboard = () => {
  const [admin, setAdmin] = useState(null);
  useBlockBackNavigation(true);
  // Pull admin details from login payload stored in localStorage.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("admin_user");
      if (stored) {
        setAdmin(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to read admin profile", err);
    }
  }, []);

  const avatarUrl =
    admin?.photoUrl || admin?.avatar || admin?.picture || admin?.image;

  const avatarFallback =
    admin?.name?.[0]?.toUpperCase() || admin?.email?.[0]?.toUpperCase() || "A";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 shadow-lg w-full max-w-md">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={admin?.name || "Admin avatar"}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-lg">
                {avatarFallback}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 font-black">
                Admin Profile
              </p>
              <p className="text-lg font-bold truncate">
                {admin?.name || "Admin"}
              </p>
              <p className="text-sm text-slate-400 truncate">
                {admin?.email || "No email available"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400">
          <p>Welcome to the Admin Dashboard.</p>
          <p className="text-sm mt-2">
            Add your dashboard widgets and analytics here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
