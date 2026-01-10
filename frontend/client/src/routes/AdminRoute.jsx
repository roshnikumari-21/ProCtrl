//security wrapper: authenticated users with admin privileges can access the admin dashboard and related pages.

import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";


const AdminRoute = () => {
  const token = localStorage.getItem("admin_token");

  // ❌ Not logged in
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);

    // ❌ Token exists but not admin
    if (decoded.role !== "admin") {
      return <Navigate to="/admin/login" replace />;
    }

    // ✅ Authorized
    return <Outlet />;
  } catch (err) {
    // ❌ Invalid / expired token
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    return <Navigate to="/admin/login" replace />;
  }
};

export default AdminRoute;
