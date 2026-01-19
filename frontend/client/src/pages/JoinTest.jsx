import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "../components/UI";
import api from "../services/api";
import { useExam } from "../context/ExamContext";
import { toast } from "react-toastify";

const JoinTest = () => {
  const navigate = useNavigate();
  const { setExamState } = useExam();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    testId: "",
    passcode: "",
  });

  const [loading, setLoading] = useState(false);

  /* ---------------- Auto-fill candidate data ---------------- */
  useEffect(() => {
    const stored = localStorage.getItem("candidate_user");
    if (stored) {
      const candidate = JSON.parse(stored);
      setFormData((prev) => ({
        ...prev,
        fullName: candidate.name || "",
        email: candidate.email || "",
      }));
    }
  }, []);

  const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isFormValid =
    formData.fullName.trim().length >= 3 &&
    isEmailValid(formData.email) &&
    formData.testId.trim().length >= 4 &&
    formData.passcode.trim().length >= 4;

  /* ---------------- Submit ---------------- */
  const handleJoin = async (e) => {
    e.preventDefault();

    if (!isFormValid || loading) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/attempts/join", {
        name: formData.fullName.trim(),
        email: formData.email.toLowerCase().trim(),
        testId: formData.testId.trim(),
        passcode: formData.passcode.trim(),
      });

      const { attemptId, test, idCardImage } = res.data;

      const examPayload = {
        candidate: {
          name: formData.fullName.trim(),
          email: formData.email.toLowerCase().trim(),
          idCardImage: idCardImage || null,
        },
        test,
        attemptId,
        status: "joined",
      };

      setExamState(examPayload);
      localStorage.setItem("examState", JSON.stringify(examPayload));

      toast.success("Access granted. Preparing instructions…");

      navigate(`/instructions/${formData.testId.trim()}`);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Unable to join the test. Please verify your details."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen flex items-center justify-center p-8 sm:p-10 md:p-12 bg-slate-950">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-5 overflow-hidden rounded-2xl border border-slate-800 shadow-2xl">
        {/* LEFT: FORM */}
        <div className="lg:col-span-3 bg-slate-900 p-6 sm:p-10 md:p-14">
          <div className="mb-10">
            <h1 className="text-3xl font-black text-white mb-2">Join Test</h1>
            <p className="text-slate-500 font-medium">
              Authentication required to access the secure room.
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-6" autoComplete="off">
            <Input label="Full Legal Name" value={formData.fullName} disabled/>

            <Input
              label="Official Email Address"
              type="email"
              value={formData.email}
              disabled
            />

            <Input
              label="Secure Test ID"
              placeholder="XXXX-XXXX"
              value={formData.testId}
              onChange={(e) =>
                setFormData({ ...formData, testId: e.target.value })
              }
              required
              autoComplete="off"
            />

            <Input
              label="Access Passcode"
              type="password"
              placeholder="Provided by the administrator"
              value={formData.passcode}
              onChange={(e) =>
                setFormData({ ...formData, passcode: e.target.value })
              }
              required
              autoComplete="new-password"
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              className="h-14 font-black uppercase tracking-widest text-sm"
              disabled={!isFormValid || loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Authenticating…
                </span>
              ) : (
                "Join Test"
              )}
            </Button>
          </form>
        </div>

        {/* RIGHT: GUIDELINES */}
        <div className="lg:col-span-2 bg-slate-950 p-6 sm:p-10 md:p-14 border-t lg:border-l border-slate-800">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-8">
            Critical Guidelines
          </h3>

          <div className="space-y-6">
            {[
              {
                icon: "🔑",
                title: "Secure Access",
                text: "This assessment is protected by an email whitelist and a unique passcode issued by the administrator.",
              },
              {
                icon: "📷",
                title: "Hardware Authorization",
                text: "Camera and microphone access will be required before the exam begins.",
              },
              {
                icon: "🚫",
                title: "Session Integrity",
                text: "Refreshing or navigating away after joining may invalidate your attempt.",
              },
              {
                icon: "⚡",
                title: "Environment Check",
                text: "Ensure a quiet and private environment. Background activity is monitored.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl">
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 mb-1">
                    {item.title}
                  </h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-slate-900 text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-3">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            Verified Secure Pipeline
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinTest;
