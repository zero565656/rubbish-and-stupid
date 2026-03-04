import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Profile, ReviewerInvitation } from "@/types/database.types";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const ReviewerManagement = () => {
    const { isAdmin } = useAuth();
    const [reviewers, setReviewers] = useState<Profile[]>([]);
    const [invitations, setInvitations] = useState<ReviewerInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [reviewersRes, invitationsRes] = await Promise.all([
            supabase.from("profiles").select("*").eq("role", "reviewer").eq("is_active", true),
            supabase.from("reviewer_invitations").select("*").order("created_at", { ascending: false }),
        ]);

        if (reviewersRes.data) {
            setReviewers(reviewersRes.data as Profile[]);
        }
        if (invitationsRes.data) {
            setInvitations(invitationsRes.data as ReviewerInvitation[]);
        }
        setLoading(false);
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setSending(true);
        try {
            const token = crypto.randomUUID();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

            const { error } = await supabase.from("reviewer_invitations").insert({
                email: inviteEmail.trim(),
                token,
                invited_by: "current-user-id", // Would come from auth in real implementation
                status: "pending",
                expires_at: expiresAt.toISOString(),
            });

            if (error) throw error;

            toast.success(`Invitation sent to ${inviteEmail}`);
            setInviteEmail("");
            fetchData();
        } catch (error: any) {
            toast.error(`Failed to send invitation: ${error.message}`);
        } finally {
            setSending(false);
        }
    };

    const handleRevokeInvitation = async (id: string) => {
        try {
            const { error } = await supabase.from("reviewer_invitations").delete().eq("id", id);
            if (error) throw error;
            toast.success("Invitation revoked");
            fetchData();
        } catch (error: any) {
            toast.error(`Failed to revoke: ${error.message}`);
        }
    };

    const copyInviteLink = (token: string) => {
        const link = `${window.location.origin}/register?token=${token}`;
        navigator.clipboard.writeText(link);
        toast.success("Invitation link copied to clipboard");
    };

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Access denied. Admin only.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-6 py-4">
                    <Link to="/admin" className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                        ← Back to Dashboard
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12">
                <div className="max-w-4xl mx-auto space-y-12">
                    {/* Page Title */}
                    <div>
                        <h1 className="font-serif text-3xl text-foreground mb-2">
                            Reviewer Management
                        </h1>
                        <p className="text-sm font-sans text-muted-foreground">
                            Manage your journal's reviewer team and send invitations.
                        </p>
                    </div>

                    {/* Invite Form */}
                    <div className="border border-border bg-card p-6">
                        <h2 className="font-serif text-xl text-foreground mb-4">
                            Invite New Reviewer
                        </h2>
                        <form onSubmit={handleInvite} className="flex gap-4">
                            <input
                                type="email"
                                required
                                placeholder="reviewer@university.edu"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="flex-1 border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button
                                type="submit"
                                disabled={sending}
                                className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-6 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {sending ? "Sending..." : "Send Invite"}
                            </button>
                        </form>
                    </div>

                    {/* Pending Invitations */}
                    <div className="border border-border bg-card p-6">
                        <h2 className="font-serif text-xl text-foreground mb-4">
                            Pending Invitations
                        </h2>
                        {loading ? (
                            <p className="text-muted-foreground animate-pulse">Loading...</p>
                        ) : invitations.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No pending invitations.</p>
                        ) : (
                            <div className="space-y-4">
                                {invitations.map((invitation) => (
                                    <div
                                        key={invitation.id}
                                        className="flex items-center justify-between p-4 bg-muted border border-border/50"
                                    >
                                        <div>
                                            <p className="font-sans text-sm text-foreground">{invitation.email}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Status: {invitation.status} | Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => copyInviteLink(invitation.token)}
                                                className="text-xs font-sans uppercase tracking-widest text-primary hover:underline"
                                            >
                                                Copy Link
                                            </button>
                                            <button
                                                onClick={() => handleRevokeInvitation(invitation.id)}
                                                className="text-xs font-sans uppercase tracking-widest text-destructive hover:underline"
                                            >
                                                Revoke
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Active Reviewers */}
                    <div className="border border-border bg-card p-6">
                        <h2 className="font-serif text-xl text-foreground mb-4">
                            Active Reviewers
                        </h2>
                        {loading ? (
                            <p className="text-muted-foreground animate-pulse">Loading...</p>
                        ) : reviewers.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No active reviewers yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {reviewers.map((reviewer) => (
                                    <div
                                        key={reviewer.id}
                                        className="flex items-center justify-between p-4 bg-muted border border-border/50"
                                    >
                                        <div>
                                            <p className="font-sans text-sm text-foreground">
                                                {reviewer.full_name || "Anonymous"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {reviewer.institution || "No institution"}
                                            </p>
                                        </div>
                                        <span className="text-xs font-sans uppercase tracking-widest text-green-600 bg-green-100 px-2 py-1">
                                            Active
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReviewerManagement;
