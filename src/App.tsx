import { QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";

// Redirige les anciennes routes /interview/:slug/{test|start|complete}/:token
// vers la nouvelle structure /session/... pour ne pas casser les liens déjà envoyés.
const LegacyInterviewRedirect = ({ to }: { to: "test" | "start" | "complete" }) => {
  const { slug, token } = useParams();
  return <Navigate to={`/session/${slug}/${to}/${token ?? ""}`.replace(/\/$/, "")} replace />;
};

const LegacyInterviewLandingRedirect = () => {
  const { slug } = useParams();
  return <Navigate to={`/session/${slug}`} replace />;
};

const LegacyLibraryInterviewRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/library/sessions/${id}`} replace />;
};
import { queryClient } from "@/lib/queryClient";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";

import Landing from "./pages/Landing";
import Produit from "./pages/Produit";
import Legal from "./pages/Legal";
import Privacy from "./pages/Privacy";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectsArchives from "./pages/ProjectsArchives";
import ProjectNew from "./pages/ProjectNew";
import ProjectEdit from "./pages/ProjectEdit";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectPublicPageEditor from "./pages/ProjectPublicPageEditor";
import ProjectPublicPage from "./pages/ProjectPublicPage";
import ProjectCompare from "./pages/ProjectCompare";
import ProjectStats from "./pages/ProjectStats";
import SessionDetail from "./pages/SessionDetail";
import SessionVideoExport from "./pages/SessionVideoExport";
import SettingsProfile from "./pages/settings/SettingsProfile";
import SettingsOrganization from "./pages/settings/SettingsOrganization";
import QuestionLibrary from "./pages/QuestionLibrary";
import LibraryHome from "./pages/LibraryHome";
import IntroLibrary from "./pages/IntroLibrary";
import CriteriaLibrary from "./pages/CriteriaLibrary";
import InterviewTemplates from "./pages/InterviewTemplates";
import InterviewTemplateEdit from "./pages/InterviewTemplateEdit";
import EmailTemplates from "./pages/EmailTemplates";
import InviteSignup from "./pages/InviteSignup";
import MagicLink from "./pages/MagicLink";
import MagicLinkRedeem from "./pages/MagicLinkRedeem";
import AuthConfirm from "./pages/AuthConfirm";
import InterviewLanding from "./pages/InterviewLanding";
import InterviewDeviceTest from "./pages/InterviewDeviceTest";
import InterviewStart from "./pages/InterviewStart";
import InterviewDemoLanding from "./pages/InterviewDemoLanding";
import InterviewDemoEnd from "./pages/InterviewDemoEnd";
import InterviewComplete from "./pages/InterviewComplete";
import InterviewCancelled from "./pages/InterviewCancelled";
import InterviewPrivacy from "./pages/InterviewPrivacy";
import SharedReport from "./pages/SharedReport";
import HighlightsPublic from "./pages/HighlightsPublic";
import OrgPublic from "./pages/OrgPublic";
import Unsubscribe from "./pages/Unsubscribe";
import SuperAdmin from "./pages/SuperAdmin";
import SuperAdminOrgDetail from "./pages/SuperAdminOrgDetail";
import AdminCandidatesToRecover from "./pages/AdminCandidatesToRecover";

import AdminTuto from "./pages/AdminTuto";
import AdminTtsCompare from "./pages/AdminTtsCompare";
import AdminReportJobs from "./pages/AdminReportJobs";
import AdminSystem from "./pages/AdminSystem";
import Feedback from "./pages/Feedback";
import FeedbackThread from "./pages/FeedbackThread";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import NotFound from "./pages/NotFound";

const App = () => (
  <I18nextProvider i18n={i18n}>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ImpersonationBanner />
          <Routes>
            {/* Public landing */}
            <Route path="/" element={<Landing />} />
            <Route path="/produit" element={<Produit />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/invite/:token" element={<InviteSignup />} />
            <Route path="/auth/magic-link" element={<MagicLink />} />
            <Route path="/auth/confirm" element={<AuthConfirm />} />
            <Route path="/m/:token" element={<MagicLinkRedeem />} />

            {/* Session candidat — routes actuelles */}
            <Route path="/session/:slug" element={<InterviewLanding />} />
            <Route path="/session/:slug/demo" element={<InterviewDemoLanding />} />
            <Route path="/session/:slug/demo/end" element={<InterviewDemoEnd />} />
            <Route path="/session/:slug/test/:token" element={<InterviewDeviceTest />} />
            <Route path="/session/:slug/start/:token" element={<InterviewStart />} />
            <Route path="/session/:slug/complete/:token" element={<InterviewComplete />} />
            <Route path="/session/:slug/complete" element={<InterviewComplete />} />
            <Route path="/session/cancelled" element={<InterviewCancelled />} />
            <Route path="/session/:slug/privacy/:token" element={<InterviewPrivacy />} />
            <Route path="/session/privacy/:token" element={<InterviewPrivacy />} />

            {/* Redirections des anciennes routes /interview pour ne pas casser les liens déjà envoyés */}
            <Route path="/interview/:slug" element={<LegacyInterviewLandingRedirect />} />
            <Route path="/interview/:slug/test/:token" element={<LegacyInterviewRedirect to="test" />} />
            <Route path="/interview/:slug/start/:token" element={<LegacyInterviewRedirect to="start" />} />
            <Route path="/interview/:slug/complete/:token" element={<LegacyInterviewRedirect to="complete" />} />
            <Route path="/interview/:slug/complete" element={<LegacyInterviewRedirect to="complete" />} />

            {/* Téléchargement vidéo plein écran (protégé, sans sidebar) */}
            <Route
              path="/sessions/:id/export"
              element={
                <ProtectedRoute>
                  <SessionVideoExport />
                </ProtectedRoute>
              }
            />

            <Route path="/shared-report/:token" element={<SharedReport />} />
            <Route path="/highlights/:token" element={<HighlightsPublic />} />
            <Route path="/o/:slug" element={<OrgPublic />} />
            <Route path="/p/:slugPublic" element={<ProjectPublicPage />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/email-unsubscribe" element={<Unsubscribe />} />

            {/* Protected RH routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/new" element={<ProjectNew />} />
              <Route path="/projects/archives" element={<ProjectsArchives />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/projects/:id/edit" element={<ProjectEdit />} />
              <Route path="/projects/:id/public-page" element={<ProjectPublicPageEditor />} />
              <Route path="/projects/:id/compare" element={<ProjectCompare />} />
              <Route path="/projects/:id/stats" element={<ProjectStats />} />
              <Route path="/question-library" element={<Navigate to="/library/questions" replace />} />
              <Route path="/library" element={<LibraryHome />} />
              <Route path="/library/questions" element={<QuestionLibrary />} />
              <Route path="/library/intros" element={<IntroLibrary />} />
              <Route path="/library/criteria" element={<CriteriaLibrary />} />
              <Route path="/library/interviews" element={<Navigate to="/library/sessions" replace />} />
              <Route path="/library/interviews/:id" element={<LegacyLibraryInterviewRedirect />} />
              <Route path="/library/sessions" element={<InterviewTemplates />} />
              <Route path="/library/sessions/:id" element={<InterviewTemplateEdit />} />
              <Route path="/library/emails" element={<EmailTemplates />} />
              <Route path="/sessions/:id" element={<SessionDetail />} />
              <Route path="/settings" element={<Navigate to="/settings/profil" replace />} />
              <Route path="/settings/profil" element={<SettingsProfile />} />
              <Route path="/settings/organisation" element={<SettingsOrganization />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/feedback/:threadId" element={<FeedbackThread />} />
              <Route path="/admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
              <Route path="/superadmin/orgs/:orgId" element={<SuperAdminRoute><SuperAdminOrgDetail /></SuperAdminRoute>} />
              <Route path="/admin/system" element={<SuperAdminRoute><AdminSystem /></SuperAdminRoute>} />
              <Route path="/admin/emails" element={<Navigate to="/admin/system?tab=emails" replace />} />
              <Route path="/admin/tuto" element={<SuperAdminRoute><AdminTuto /></SuperAdminRoute>} />
              <Route path="/admin/tts-compare" element={<SuperAdminRoute><AdminTtsCompare /></SuperAdminRoute>} />
              <Route path="/admin/report-jobs" element={<SuperAdminRoute><AdminReportJobs /></SuperAdminRoute>} />
              <Route path="/admin/sessions-queue" element={<Navigate to="/admin/system?tab=sessions" replace />} />
              <Route path="/admin/candidates-to-recover" element={<SuperAdminRoute><AdminCandidatesToRecover /></SuperAdminRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </I18nextProvider>
);

export default App;
