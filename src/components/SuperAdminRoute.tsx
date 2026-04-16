import { Navigate } from "react-router-dom";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, loading } = useSuperAdmin();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
