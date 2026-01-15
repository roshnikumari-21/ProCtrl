import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ExamProvider } from "./context/ExamContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Navigate } from "react-router-dom";

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
import MonitoringHome from "./admin/pages/candidate monitoring/MonitoringHome";
import TestResults from "./admin/pages/results/TestResults";
import CreateQuestion from "./admin/pages/questions/CreateQuestion";
import EditQuestion from "./admin/pages/questions/EditQuestion";
import CreateTest from "./admin/pages/tests/CreateTest";
import TestDetails from "./admin/pages/tests/TestDetails";
import QuestionDetails from "./admin/pages/questions/QuestionDetails";
import ActiveTests from "./admin/pages/candidate monitoring/ActiveTests";
import PastTests from "./admin/pages/candidate monitoring/PastTests";
import TestMonitoring from "./admin/pages/candidate monitoring/TestMonitoring";
import CandidateLogin from "./pages/CandidateLogin";
import CandidateDashboard from "./pages/CandidateDashboard";
import Results from "./pages/Results";
import CandidateDetails from "./admin/pages/candidate monitoring/CandidateDetails";
import AttemptDetails from "./pages/AttemptDetails";

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
              <Route path="/attempt/:attemptId" element={<AttemptDetails />} />
              <Route path="/candidatelogin" element={<CandidateLogin />} />
              <Route path="/candidatedash" element={<CandidateDashboard />} />
              <Route path="/candidateresult" element={<Results />} />
              <Route path="/join" element={<JoinTest />} />
              <Route path="/instructions/:testId" element={<Instructions />} />
              <Route path="/precheck/:testId" element={<PreCheck />} />
              <Route path="/exam/:attemptId" element={<CandidateExam />} />
              <Route path="/thank-you" element={<SubmissionSuccess />} />
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
                <Route path="monitoring" element={<MonitoringHome />}>
                  {/* DEFAULT TAB */}
                  <Route index element={<Navigate to="active" replace />} />

                  <Route path="active" element={<ActiveTests />} />
                  <Route path="past" element={<PastTests />} />
                </Route>

                <Route
                  path="monitoring/attempts/:attemptId"
                  element={<CandidateDetails />}
                />
                <Route
                  path="monitoring/tests/:id"
                  element={<TestMonitoring />}
                />
                <Route path="results" element={<TestResults />} />
              </Route>
            </Route>
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
            theme="dark"
          />
        </ExamProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  );
}

export default App;
