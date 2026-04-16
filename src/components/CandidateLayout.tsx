import { ReactNode } from "react";

interface CandidateLayoutProps {
  children: ReactNode;
  /** If true, uses a minimal header (e.g. during interview) */
  minimal?: boolean;
}

export default function CandidateLayout({ children, minimal = false }: CandidateLayoutProps) {
  return (
    <div className="candidate-layout min-h-screen flex flex-col">
      <header className={`candidate-header flex items-center ${minimal ? "justify-center py-3 px-4" : "justify-between py-5 px-6"}`}>
        <span />
        {!minimal && (
          <span className="candidate-header-tagline text-sm font-light tracking-wide opacity-70">
            Recrutement
          </span>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-8">
        {children}
      </main>

      {/* Footer */}
      {!minimal && (
        <footer className="candidate-footer text-center py-4 px-4">
          <p className="text-xs opacity-50">
            © {new Date().getFullYear()} Morning · Propulsé par InterviewAI
          </p>
        </footer>
      )}
    </div>
  );
}
