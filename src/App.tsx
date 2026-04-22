import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectNew from "./pages/ProjectNew";
import ProjectEdit from "./pages/ProjectEdit";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectCompare from "./pages/ProjectCompare";
import SessionDetail from "./pages/SessionDetail";
import Settings from "./pages/Settings";
import QuestionLibrary from "./pages/QuestionLibrary";
import LibraryHome from "./pages/LibraryHome";
import IntroLibrary from "./pages/IntroLibrary";
import CriteriaLibrary from "./pages/CriteriaLibrary";
import InterviewTemplates from "./pages/InterviewTemplates";
import InterviewTemplateEdit from "./pages/InterviewTemplateEdit";
import EmailTemplates from "./pages/EmailTemplates";
import InviteSignup from "./pages/InviteSignup";
import InterviewLanding from "./pages/InterviewLanding";
import InterviewDeviceTest from "./pages/InterviewDeviceTest";
import InterviewStart from "./pages/InterviewStart";
import InterviewComplete from "./pages/InterviewComplete";
import SharedReport from "./pages/SharedReport";
import OrgPublic from "./pages/OrgPublic";
import Unsubscribe from "./pages/Unsubscribe";
import SuperAdmin from "./pages/SuperAdmin";
import AdminEmails from "./pages/AdminEmails";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import NotFound from "./pages/NotFound";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public landing */}
            <Route path="/" element={<Landing />} />

            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/invite/:token" element={<InviteSignup />} />

            {/* Session candidat — routes actuelles */}
            <Route path="/session/:slug" element={<InterviewLanding />} />
            <Route path="/session/:slug/test/:token" element={<InterviewDeviceTest />} />
            <Route path="/session/:slug/start/:token" element={<InterviewStart />} />
            <Route path="/session/:slug/complete/:token" element={<InterviewComplete />} />
            <Route path="/session/:slug/complete" element={<InterviewComplete />} />

            {/* Redirections des anciennes routes /interview pour ne pas casser les liens déjà envoyés */}
            <Route path="/interview/:slug" element={<Navigate to="/session/:slug" replace />} />
            <Route path="/interview/:slug/test/:token" element={<LegacyInterviewRedirect to="test" />} />
            <Route path="/interview/:slug/start/:token" element={<LegacyInterviewRedirect to="start" />} />
            <Route path="/interview/:slug/complete/:token" element={<LegacyInterviewRedirect to="complete" />} />
            <Route path="/interview/:slug/complete" element={<LegacyInterviewRedirect to="complete" />} />

            <Route path="/shared-report/:token" element={<SharedReport />} />
            <Route path="/o/:slug" element={<OrgPublic />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/email-unsubscribe" element={<Unsubscribe />} />

            {/* Protected RH routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/new" element={<ProjectNew />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/projects/:id/edit" element={<ProjectEdit />} />
              <Route path="/projects/:id/compare" element={<ProjectCompare />} />
              <Route path="/question-library" element={<Navigate to="/library/questions" replace />} />
              <Route path="/library" element={<LibraryHome />} />
              <Route path="/library/questions" element={<QuestionLibrary />} />
              <Route path="/library/intros" element={<IntroLibrary />} />
              <Route path="/library/criteria" element={<CriteriaLibrary />} />
              <Route path="/library/interviews" element={<InterviewTemplates />} />
              <Route path="/library/interviews/:id" element={<InterviewTemplateEdit />} />
              <Route path="/library/emails" element={<EmailTemplates />} />
              <Route path="/sessions/:id" element={<SessionDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
              <Route path="/admin/emails" element={<SuperAdminRoute><AdminEmails /></SuperAdminRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
