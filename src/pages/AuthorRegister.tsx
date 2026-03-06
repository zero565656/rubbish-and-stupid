import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const AuthorRegister = () => {
    const { signUp } = useAuth();
    const navigate = useNavigate();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await signUp(email, password, fullName);
        setLoading(false);

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success("Registration successful. Please log in to submit your paper.");
        navigate("/admin/login", { replace: true });
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="font-serif text-3xl text-foreground mb-3">Author Registration</h1>
                    <p className="text-sm text-muted-foreground">
                        Create your author account to submit and track manuscripts.
                    </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-6 bg-card border border-border p-8">
                    <div className="space-y-2">
                        <label className="text-xs font-sans uppercase tracking-wider text-foreground">Full Name</label>
                        <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-sans uppercase tracking-wider text-foreground">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-sans uppercase tracking-wider text-foreground">Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground text-xs uppercase tracking-widest px-6 py-3 hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? "Registering..." : "Create Author Account"}
                    </button>
                </form>

                <p className="text-center text-xs font-sans text-muted-foreground">
                    Already registered?{" "}
                    <Link to="/admin/login" className="underline underline-offset-4 hover:text-foreground">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default AuthorRegister;
