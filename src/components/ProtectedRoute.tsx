import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (requireAdmin && user?.role !== "admin") return <Navigate to="/home" replace />;

  return <>{children}</>;
}
