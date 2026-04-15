import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectNew from "./pages/ProjectNew";
import ProjectEdit from "./pages/ProjectEdit";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectCompare from "./pages/ProjectCompare";
import SessionDetail from "./pages/SessionDetail";
import Settings from "./pages/Settings";
import QuestionLibrary from "./pages/QuestionLibrary";
import InviteSignup from "./pages/InviteSignup";
import InterviewLanding from "./pages/InterviewLanding";
import InterviewDeviceTest from "./pages/InterviewDeviceTest";
import InterviewStart from "./pages/InterviewStart";
import InterviewComplete from "./pages/InterviewComplete";
import SharedReport from "./pages/SharedReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/invite/:token" element={<InviteSignup />} />
            <Route path="/interview/:slug" element={<InterviewLanding />} />
            <Route path="/interview/:slug/test/:token" element={<InterviewDeviceTest />} />
            <Route path="/interview/:slug/start/:token" element={<InterviewStart />} />
            <Route path="/interview/:slug/complete" element={<InterviewComplete />} />
            <Route path="/shared-report/:token" element={<SharedReport />} />

            {/* Protected RH routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/new" element={<ProjectNew />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/projects/:id/edit" element={<ProjectEdit />} />
              <Route path="/projects/:id/compare" element={<ProjectCompare />} />
              <Route path="/question-library" element={<QuestionLibrary />} />
              <Route path="/sessions/:id" element={<SessionDetail />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
