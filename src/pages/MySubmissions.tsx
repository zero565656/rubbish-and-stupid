import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Submission } from "@/types/database.types";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const MySubmissions = () => {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchSubmissions();
        }
    }, [user]);

    const fetchSubmissions = async () => {
        if (!user) return;
        setLoading(true);

        // First, get the profile to find author_id
        const { data: profileData } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .single();

        if (!profileData) {
            setLoading(false);
            return;
        }

        // Fetch submissions by this author
        const { data, error } = await supabase
            .from("submissions")
            .select("*")
            .eq("author_id", profileData.id)
            .order("submitted_at", { ascending: false });

        if (!error && data) {
            setSubmissions(data as Submission[]);
        }
        setLoading(false);
    };

    const getStatusBadge = (status: Submission["status"]) => {
        switch (status) {
            case "pending":
                return (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1">
                        Pending Review
                    </span>
                );
            case "approved":
                return (
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1">
                        Approved & Published
                    </span>
                );
            case "rejected":
                return (
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1">
                        Rejected
                    </span>
                );
            default:
                return (
                    <span className="bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1">
                        {status}
                    </span>
                );
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Please log in to view your submissions.</p>
                    <Link to="/admin/login" className="text-primary hover:underline">
                        Log In
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="font-serif italic text-xl tracking-tight text-foreground">
                            r&amp;s Author Desk
                        </h1>
                        <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground">
                            My Submissions
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            to="/submit"
                            className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-4 py-2 hover:bg-primary/90"
                        >
                            New Submission
                        </Link>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12">
                <div className="max-w-4xl mx-auto">
                    <h2 className="font-serif text-2xl text-foreground mb-8">
                        Your Submissions
                    </h2>

                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="h-32 bg-muted rounded-lg" />
                                </div>
                            ))}
                        </div>
                    ) : submissions.length === 0 ? (
                        <div className="py-16 text-center border border-dashed border-border rounded-lg">
                            <p className="font-sans text-muted-foreground mb-4">
                                You haven't made any submissions yet.
                            </p>
                            <Link
                                to="/submit"
                                className="text-primary hover:underline text-sm"
                            >
                                Submit your first paper
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {submissions.map((submission) => (
                                <div
                                    key={submission.id}
                                    className="border border-border bg-card p-6"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="font-serif text-lg text-foreground mb-2">
                                                {submission.title}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                Submitted on {new Date(submission.submitted_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {getStatusBadge(submission.status)}
                                    </div>

                                    <div className="bg-muted p-4 text-sm font-sans text-muted-foreground leading-relaxed border border-border/50">
                                        <strong className="uppercase text-xs tracking-wider text-foreground mb-2 block">
                                            Abstract
                                        </strong>
                                        {submission.abstract}
                                    </div>

                                    {submission.status === "approved" && (
                                        <div className="mt-4 pt-4 border-t border-border">
                                            <p className="text-sm text-green-600">
                                                Your paper has been published! It is now available in the journal's archive.
                                            </p>
                                        </div>
                                    )}

                                    {submission.status === "rejected" && (
                                        <div className="mt-4 pt-4 border-t border-border">
                                            <p className="text-sm text-red-600">
                                                Unfortunately, your submission was not accepted for publication.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MySubmissions;
