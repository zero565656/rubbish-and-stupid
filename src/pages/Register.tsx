import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { ReviewerInvitation } from "@/types/database.types";

const Register = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");

    const [invitation, setInvitation] = useState<ReviewerInvitation | null>(null);
    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(false);

    // Form state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [institution, setInstitution] = useState("");
    const [researchField, setResearchField] = useState("");
    const [bio, setBio] = useState("");
    const [registering, setRegistering] = useState(false);

    useEffect(() => {
        if (token) {
            validateToken(token);
        } else {
            setLoading(false);
        }
    }, [token]);

    const validateToken = async (token: string) => {
        setValidating(true);
        try {
            const { data, error } = await supabase
                .from("reviewer_invitations")
                .select("*")
                .eq("token", token)
                .single();

            if (error || !data) {
                toast.error("Invalid invitation token");
                navigate("/");
                return;
            }

            const invitationData = data as ReviewerInvitation;
            if (invitationData.status !== "pending") {
                toast.error("This invitation has already been used or expired");
                navigate("/");
                return;
            }

            if (new Date(invitationData.expires_at) < new Date()) {
                await supabase
                    .from("reviewer_invitations")
                    .update({ status: "expired" })
                    .eq("id", invitationData.id);
                toast.error("This invitation has expired");
                navigate("/");
                return;
            }

            setInvitation(invitationData);
            setEmail(invitationData.email);
        } catch (error) {
            toast.error("Failed to validate invitation");
            navigate("/");
        } finally {
            setValidating(false);
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invitation) return;

        setRegistering(true);
        try {
            // Sign up the user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Registration failed");
            if (!authData.session) {
                throw new Error("Email not confirmed. Please confirm your email first, or disable email confirmation in Supabase Auth settings.");
            }

            // Update the profile with reviewer role
            const { error: profileError } = await supabase.from("profiles").update({
                role: "reviewer",
                full_name: fullName,
                institution,
                research_field: researchField,
                bio,
            }).eq("id", authData.user.id);

            if (profileError) throw profileError;

            // Mark invitation as registered
            await supabase
                .from("reviewer_invitations")
                .update({ status: "registered" })
                .eq("id", invitation.id);

            toast.success("Registration successful! You can now log in as a reviewer.");
            navigate("/admin/login");
        } catch (error: any) {
            if (String(error?.message || "").toLowerCase().includes("email not confirmed")) {
                toast.error("邮箱未验证。请先验证邮箱，或在 Supabase 的 Auth 设置中关闭邮箱验证后重试。");
            } else {
                toast.error(`Registration failed: ${error.message}`);
            }
        } finally {
            setRegistering(false);
        }
    };

    if (loading || validating) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground animate-pulse">Validating invitation...</p>
            </div>
        );
    }

    if (!token || !invitation) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Invalid invitation</p>
                    <Link to="/" className="text-primary hover:underline text-sm">
                        Return to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="font-serif text-3xl text-foreground mb-2">
                        Reviewer Registration
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        You've been invited to join as a reviewer
                    </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-6 border border-border bg-card p-8">
                    <div className="space-y-2">
                        <label className="block text-xs font-sans uppercase tracking-widest text-foreground">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            className="w-full border border-border bg-muted px-4 py-2 text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-sans uppercase tracking-widest text-foreground">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-sans uppercase tracking-widest text-foreground">
                            Full Name
                        </label>
                        <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-sans uppercase tracking-widest text-foreground">
                            Institution
                        </label>
                        <input
                            type="text"
                            required
                            value={institution}
                            onChange={(e) => setInstitution(e.target.value)}
                            className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-sans uppercase tracking-widest text-foreground">
                            Research Field
                        </label>
                        <input
                            type="text"
                            required
                            value={researchField}
                            onChange={(e) => setResearchField(e.target.value)}
                            className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-sans uppercase tracking-widest text-foreground">
                            Bio (Optional)
                        </label>
                        <textarea
                            rows={3}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={registering}
                        className="w-full bg-primary text-primary-foreground text-xs uppercase tracking-widest px-6 py-3 hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {registering ? "Creating Account..." : "Create Account"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Register;
