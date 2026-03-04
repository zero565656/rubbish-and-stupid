import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ReviewerRoute = ({ children }: { children: React.ReactNode }) => {
    const { isReviewer, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="font-sans text-muted-foreground animate-pulse">
                    Verifying credentials...
                </p>
            </div>
        );
    }

    if (!isReviewer) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
