import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [pendingRedirect, setPendingRedirect] = useState(false);
    const navigate = useNavigate();
    const { signIn, role, user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!pendingRedirect || authLoading || !user || !role) return;

        if (role === "admin") {
            toast.success("Welcome, Editor-in-Chief.");
            navigate("/admin", { replace: true });
            return;
        }

        if (role === "reviewer") {
            toast.success("Welcome, Reviewer.");
            navigate("/reviewer", { replace: true });
            return;
        }

        if (role === "editor") {
            toast.success("Welcome, Editor.");
            navigate("/editor", { replace: true });
            return;
        }

        if (role === "user") {
            toast.success("Welcome back.");
            navigate("/my-submissions", { replace: true });
            return;
        }

        toast.error("Current account has no access permission.");
        navigate("/", { replace: true });
    }, [pendingRedirect, authLoading, user, role, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setPendingRedirect(false);

        const { error } = await signIn(email, password);

        setLoading(false);

        if (error) {
            if (error.message.toLowerCase().includes("email not confirmed")) {
                toast.error("邮箱未验证，请先到邮箱点击确认链接后再登录。");
            } else {
                toast.error(error.message);
            }
        } else {
            setPendingRedirect(true);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="font-serif italic text-3xl md:text-4xl tracking-tight text-foreground mb-4">
                        rubbish &amp; stupid
                    </h2>
                    <p className="text-xs font-sans uppercase tracking-[0.3em] text-muted-foreground">
                        Account Login
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6 mt-12 bg-card p-8 border border-border">
                    <div className="space-y-2">
                        <label className="text-xs font-sans font-medium text-foreground uppercase tracking-wider">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-transparent border-b border-border focus:border-foreground pb-2 outline-none transition-colors font-sans text-base placeholder:text-muted/50"
                            placeholder="editor@rs-journal.com"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-sans font-medium text-foreground uppercase tracking-wider">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-transparent border-b border-border focus:border-foreground pb-2 outline-none transition-colors font-sans text-base placeholder:text-muted/50"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground font-sans text-sm uppercase tracking-widest px-8 py-4 border border-primary hover:bg-background hover:text-foreground disabled:opacity-50 transition-all duration-300 mt-8"
                    >
                        {loading ? "Authenticating..." : "Enter Portal"}
                    </button>
                </form>

                <p className="text-center text-xs font-sans text-muted-foreground">
                    <a href="/register-author" className="hover:text-foreground transition-colors underline underline-offset-4 mr-4">
                        Author Register
                    </a>
                    <a href="/" className="hover:text-foreground transition-colors underline underline-offset-4">
                        Return to Public Desk
                    </a>
                </p>
            </div>
        </div>
    );
};

export default Login;
