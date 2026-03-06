import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Submission, Review, ReviewRecommendation, ReviewerAssignment } from "@/types/database.types";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

type ReviewSummary = {
    recommendation: ReviewRecommendation;
    comments_to_author: string | null;
    updated_at: string;
};

type EditorialDecision = "accept" | "reject" | "major_revision" | "minor_revision";

const MySubmissions = () => {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [latestReviewsBySubmission, setLatestReviewsBySubmission] = useState<Record<string, ReviewSummary>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchSubmissions();
        }
    }, [user]);

    const fetchSubmissions = async () => {
        if (!user) return;
        setLoading(true);

        // Fetch submissions by this author
        const { data, error } = await supabase
            .from("submissions")
            .select("*")
            .eq("author_id", user.id)
            .order("submitted_at", { ascending: false });

        if (error) {
            toast.error("Failed to load submissions.");
            setLoading(false);
            return;
        }

        const submissionRows = (data || []) as Submission[];
        setSubmissions(submissionRows);

        if (submissionRows.length > 0) {
            await fetchLatestReviews(submissionRows.map((item) => item.id));
        } else {
            setLatestReviewsBySubmission({});
        }

        setLoading(false);
    };

    const fetchLatestReviews = async (submissionIds: string[]) => {
        const { data: assignmentData, error: assignmentError } = await supabase
            .from("reviewer_assignments")
            .select("id, submission_id")
            .in("submission_id", submissionIds);

        if (assignmentError || !assignmentData || assignmentData.length === 0) {
            setLatestReviewsBySubmission({});
            return;
        }

        const assignments = assignmentData as Pick<ReviewerAssignment, "id" | "submission_id">[];
        const assignmentIds = assignments.map((item) => item.id);

        const { data: reviewData, error: reviewError } = await supabase
            .from("reviews")
            .select("*")
            .in("assignment_id", assignmentIds)
            .order("updated_at", { ascending: false });

        if (reviewError || !reviewData) {
            setLatestReviewsBySubmission({});
            return;
        }

        const reviews = reviewData as Review[];
        const nextMap: Record<string, ReviewSummary> = {};

        for (const review of reviews) {
            const assignment = assignments.find((item) => item.id === review.assignment_id);
            if (!assignment) continue;

            const existing = nextMap[assignment.submission_id];
            if (!existing || new Date(review.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
                nextMap[assignment.submission_id] = {
                    recommendation: review.recommendation,
                    comments_to_author: review.comments_to_author,
                    updated_at: review.updated_at,
                };
            }
        }

        setLatestReviewsBySubmission(nextMap);
    };

    const getStatusBadge = (submission: Submission) => {
        if (
            submission.status === "pending" &&
            (submission.editorial_decision === "major_revision" || submission.editorial_decision === "minor_revision")
        ) {
            return (
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1">
                    Revision Requested
                </span>
            );
        }

        const status = submission.status;
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

    const getReviewDecisionBadge = (recommendation: ReviewRecommendation) => {
        switch (recommendation) {
            case "major_revision":
                return <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1">Major Revision</span>;
            case "minor_revision":
                return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1">Minor Revision</span>;
            case "accept":
                return <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1">Accepted</span>;
            case "reject":
                return <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1">Rejected</span>;
            default:
                return null;
        }
    };

    const getEditorialDecisionBadge = (decision: EditorialDecision) => {
        switch (decision) {
            case "major_revision":
                return <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1">Major Revision</span>;
            case "minor_revision":
                return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1">Minor Revision</span>;
            case "accept":
                return <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1">Accepted</span>;
            case "reject":
                return <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1">Rejected</span>;
            default:
                return null;
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
                    <Link to="/" className="block hover:opacity-80 transition-opacity">
                        <h1 className="font-serif italic text-xl tracking-tight text-foreground">
                            r&amp;s Author Desk
                        </h1>
                        <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground">
                            My Submissions
                        </p>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link
                            to="/user/profile"
                            className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Profile
                        </Link>
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
                                (() => {
                                    const latestReview = latestReviewsBySubmission[submission.id];
                                    return (
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
                                        {getStatusBadge(submission)}
                                    </div>

                                    <div className="bg-muted p-4 text-sm font-sans text-muted-foreground leading-relaxed border border-border/50">
                                        <strong className="uppercase text-xs tracking-wider text-foreground mb-2 block">
                                            Abstract
                                        </strong>
                                        {submission.abstract}
                                    </div>

                                    {latestReview && (
                                        <div className="mt-4 space-y-3 border border-border/50 bg-background p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <strong className="uppercase text-xs tracking-wider text-foreground">
                                                    Latest Reviewer Recommendation
                                                </strong>
                                                {getReviewDecisionBadge(latestReview.recommendation)}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Updated on {new Date(latestReview.updated_at).toLocaleDateString()}
                                            </p>
                                            <div className="text-sm text-foreground leading-relaxed">
                                                <strong className="uppercase text-xs tracking-wider block mb-2 text-muted-foreground">
                                                    Reviewer Comments to Author
                                                </strong>
                                                {latestReview.comments_to_author?.trim() || "No author-facing comments provided."}
                                            </div>
                                        </div>
                                    )}

                                    {submission.editorial_decision && (
                                        <div className="mt-4 space-y-3 border border-border/50 bg-background p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <strong className="uppercase text-xs tracking-wider text-foreground">
                                                    Editorial Decision
                                                </strong>
                                                {getEditorialDecisionBadge(submission.editorial_decision as EditorialDecision)}
                                            </div>
                                            {submission.editorial_decided_at && (
                                                <p className="text-xs text-muted-foreground">
                                                    Updated on {new Date(submission.editorial_decided_at).toLocaleDateString()}
                                                </p>
                                            )}
                                            {submission.editorial_comment && (
                                                <div className="text-sm text-foreground leading-relaxed">
                                                    <strong className="uppercase text-xs tracking-wider block mb-2 text-muted-foreground">
                                                        Editor Comments to Author
                                                    </strong>
                                                    {submission.editorial_comment}
                                                </div>
                                            )}
                                        </div>
                                    )}

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
                                            {submission.editorial_comment && (
                                                <p className="text-sm text-red-700 mt-2">
                                                    Reason: {submission.editorial_comment}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                    );
                                })()
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MySubmissions;
