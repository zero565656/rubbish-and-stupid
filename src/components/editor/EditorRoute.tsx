import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const EditorRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, isEditor, loading } = useAuth();

  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="font-sans text-muted-foreground animate-pulse">
          Verifying credentials...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isEditor) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
