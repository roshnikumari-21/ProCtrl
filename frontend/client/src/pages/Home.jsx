import { Link, useNavigate } from "react-router-dom";
import { Button, Card } from "../components/UI";
import { toastInfo } from "../utils/toast";

const Home = () => {
  const navigate = useNavigate();

  const goCandidate = () => {
    toastInfo("Redirecting to candidate login");
    navigate("/candidatelogin");
  };

  const goAdmin = () => {
    toastInfo("Redirecting to test organiser login");
    navigate("/admin/login");
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-[#0b0f19]">
      {/* Background Glow Effects */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-[-5%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[140px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-slate-800 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col max-w-7xl mx-auto px-6 w-full">
        {/* Header */}
        <nav className="flex items-center justify-between py-4 md:py-8">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-950 font-black shadow-lg shadow-white/10"
            >
              P
            </Link>
            <span className="text-xl font-bold tracking-widest text-white uppercase">
              ProCtrl
            </span>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col justify-center items-center text-center py-4 md:py-8 lg:py-12 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Enterprise Grade AI Proctoring
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-8 tracking-tighter leading-[1] md:leading-[0.9]">
            Next Generation <br />
            <span className="text-slate-500">Testing Platform.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 mb-12 leading-relaxed max-w-2xl font-medium">
            A high-assurance online assessment system integrating identity
            verification, continuous behavior analysis, and real-time
            proctoring to prevent malpractice in remote examinations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
            <Button
              size="lg"
              className="px-10 h-14 w-full sm:w-auto whitespace-nowrap"
              onClick={goCandidate}
            >
              Register / Login as Candidate
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="px-10 h-14 w-full sm:w-auto whitespace-nowrap"
              onClick={goAdmin}
            >
              Register / Login as Test Organiser
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 mt-8 md:grid-cols-3 gap-6 lg:gap-8 mb-20 md:mb-32">
          {[
            {
              title: "Continuous Identity Verification",
              desc:
                "Ensures candidate identity throughout the exam using persistent face presence checks, preventing impersonation and unauthorized test attempts.",
              icon: "🧑‍💻",
            },
            {
              title: "Secure Exam Environment",
              desc:
                "Enforces strict browser-level controls including fullscreen locking, tab-switch detection, copy-paste blocking, and focus monitoring to prevent digital cheating.",
              icon: "🔒",
            },
            {
              title: "Live Proctoring & Evidence Capture",
              desc:
                "Streams real-time candidate activity to proctors, automatically flagging suspicious behavior and securely capturing time-stamped evidence for post-exam review.",
              icon: "📡",
            },
          ].map((feat, idx) => (
            <Card
              key={idx}
              className="p-8 border-slate-800/50 hover:border-slate-700 transition-all group bg-slate-900/50 backdrop-blur-sm"
            >
              <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">
                {feat.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                {feat.title}
              </h3>
              <p className="text-slate-500 leading-relaxed text-sm lg:text-base font-medium">
                {feat.desc}
              </p>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-900 py-12 flex flex-col md:flex-row justify-between items-center text-slate-600 text-xs font-bold gap-8">
          <p className="uppercase tracking-widest">
            © 2024 ProCtrl Secure Assessment Systems.
          </p>

          <div className="flex gap-8 uppercase tracking-widest">
            <a href="#" className="hover:text-slate-200 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-slate-200 transition-colors">
              Compliance
            </a>
            <a href="#" className="hover:text-slate-200 transition-colors">
              Documentation
            </a>
            <a href="#" className="hover:text-slate-200 transition-colors">
              Infrastructure
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Home;


