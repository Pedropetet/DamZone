import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

function NotAuthorized() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-4xl font-bold text-muted-foreground">403</p>
      <p className="text-lg font-medium">Onvoldoende rechten</p>
      <p className="text-sm text-muted-foreground">
        Je hebt geen toegang tot deze pagina.
      </p>
      <button
        onClick={() => navigate("/home")}
        className="text-blue-500 hover:underline text-sm"
      >
        Terug naar lobby
      </button>
    </div>
  );
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (requireAdmin && user?.role !== "admin") return <NotAuthorized />;

  return <>{children}</>;
}
