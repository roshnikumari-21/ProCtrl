import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import api from "../../services/api";
import { Button, Card, Input } from "../../components/UI";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AdminLogin = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("admin_token")) {
      navigate("/admin/dashboard");
    }
  }, [navigate]);

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  /* ===============================
     LOCAL LOGIN / REGISTER
  =============================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Email and password are required");
      return;
    }

    if (!isLogin && !formData.name) {
      toast.error("Name is required for registration");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? "/auth/admin/login" : "/auth/admin/register";

      const payload = isLogin
        ? {
            email: formData.email,
            password: formData.password,
          }
        : {
            name: formData.name,
            email: formData.email,
            password: formData.password,
          };

      const res = await api.post(endpoint, payload);

      // ✅ store admin auth
      sessionStorage.setItem("admin_token", res.data.token);
      sessionStorage.setItem("admin_user", JSON.stringify(res.data.user));

      toast.success(
        isLogin ? "Admin login successful" : "Admin registered successfully"
      );

      navigate("/admin/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     GOOGLE LOGIN (ADMIN)
  =============================== */
  const handleGoogleSuccess = async (response) => {
    const googleToken = response.credential;
    setLoading(true);

    try {
      const res = await api.post("/auth/google", {
        token: googleToken,
      });

      sessionStorage.setItem("admin_token", res.data.token);
      sessionStorage.setItem("admin_user", JSON.stringify(res.data.user));

      toast.success("Google admin login successful");
      navigate("/admin/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error("Google login failed");
  };

  /* ===============================
     UI
  =============================== */
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <Card className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 bg-white text-slate-950 rounded-xl flex items-center justify-center font-black text-xl">
            A
          </div>
          <h2 className="text-2xl font-black text-white">
            {isLogin ? "Admin Login" : "Admin Registration"}
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            {isLogin
              ? "Access the admin dashboard"
              : "Create a new admin account"}
          </p>
        </div>

        {/* GOOGLE LOGIN */}
        <div className="mb-6 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
            theme="filled_black"
            shape="pill"
            size="large"
            width={320}
          />
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-900 px-3 text-slate-500">OR</span>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <Input
              label="Admin Name"
              placeholder="Your full name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          )}

          <Input
            label="Email"
            type="email"
            placeholder="admin@company.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) =>
              setFormData({
                ...formData,
                password: e.target.value,
              })
            }
            required
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={loading}
            className="h-12 font-black uppercase tracking-widest text-xs"
          >
            {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
          </Button>
        </form>

        {/* TOGGLE */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs font-bold text-slate-500 hover:text-white"
          >
            {isLogin
              ? "New admin? Create account"
              : "Already registered? Login"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default AdminLogin;
