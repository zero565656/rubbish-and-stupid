import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, profile, isAdmin, loading } = useAuth();

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

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <div className="max-w-md w-full border border-border bg-card p-8 space-y-4 text-center">
                    <h1 className="font-serif text-2xl text-foreground">Admin access required</h1>
                    <p className="text-sm text-muted-foreground">
                        Current account does not have admin role. Please use an administrator account.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
