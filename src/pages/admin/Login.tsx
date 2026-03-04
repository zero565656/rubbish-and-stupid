import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Welcome, Editor-in-Chief.");
            navigate("/admin");
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
                        Editorial Review Board
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
                    <a href="/" className="hover:text-foreground transition-colors underline underline-offset-4">
                        Return to Public Desk
                    </a>
                </p>
            </div>
        </div>
    );
};

export default Login;
