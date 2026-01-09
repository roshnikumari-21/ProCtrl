import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ExamProvider } from "./context/ExamContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

/* Candidate */
import Home from "./pages/Home";
import CandidateLayout from "./layout/CandidateLayout";
import JoinTest from "./pages/JoinTest";
import Instructions from "./pages/Instructions";
import PreCheck from "./pages/PreCheck";
import CandidateExam from "./pages/CandidateExam";
import SubmissionSuccess from "./pages/SubmissionSuccess";

/* Admin */
import AdminLayout from "./admin/layout/AdminLayout";
import AdminLogin from "./admin/pages/AdminLogin";
import AdminRoute from "./routes/AdminRoute";
import AdminDashboard from "./admin/pages/AdminDashboard";
import QuestionList from "./admin/pages/questions/QuestionList";
import TestList from "./admin/pages/tests/TestList";
import LiveMonitor from "./admin/pages/tests/LiveMonitor";
import TestResults from "./admin/pages/results/TestResults";
import CreateQuestion from "./admin/pages/questions/CreateQuestion";
import EditQuestion from "./admin/pages/questions/EditQuestion";
import CreateTest from "./admin/pages/tests/CreateTest";
import TestDetails from "./admin/pages/tests/TestDetails";
import QuestionDetails from "./admin/pages/questions/QuestionDetails";
import CandidateLogin from "./pages/CandidateLogin";
import CandidateDashboard from "./pages/CandidateDashboard";

function App() {
  return (
    <BrowserRouter>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <ExamProvider>
          <Routes>
            {/* =======================
                Candidate Routes
            ======================= */}
            <Route element={<CandidateLayout />}>
              <Route path="/" element={<Home />} />
               <Route path="/candidatelogin" element={<CandidateLogin />} />
               <Route path="/candidatedash" element={<CandidateDashboard />} />
              <Route path="/join" element={<JoinTest />} />
              <Route path="/instructions/:testId" element={<Instructions />} />
              <Route path="/precheck/:testId" element={<PreCheck />} />
              <Route path="/exam/:attemptId" element={<CandidateExam />} />
              <Route path="/submitted" element={<SubmissionSuccess />} />
            </Route>

            {/* =======================
                Admin Routes
            ======================= */}
            <Route path="/admin" element={<AdminLayout />}>
              {/* Public */}
              <Route path="login" element={<AdminLogin />} />

              {/* 🔐 Protected Admin Routes */}
              <Route element={<AdminRoute />}>
                {/* Add protected admin routes here */}
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="questions" element={<QuestionList />} />
                <Route path="questions/create" element={<CreateQuestion />} />
                <Route path="questions/:id/edit" element={<EditQuestion />} />
                <Route path="questions/:id" element={<QuestionDetails />} />
                <Route path="tests" element={<TestList />} />
                <Route path="tests/create" element={<CreateTest />} />
                <Route path="tests/:id" element={<TestDetails />} />
                <Route path="monitoring" element={<LiveMonitor />} />
                <Route path="results" element={<TestResults />} />
              </Route>
            </Route>
          </Routes>
        </ExamProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  );
}

export default App;


