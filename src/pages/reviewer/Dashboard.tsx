import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { ReviewerAssignment, Submission, Review, ReviewRecommendation } from "@/types/database.types";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface AssignmentWithSubmission extends ReviewerAssignment {
    submission?: Submission;
    review?: Review;
}

type ReviewDraft = {
    recommendation: ReviewRecommendation | "";
    commentsToEditor: string;
};

const ReviewerDashboard = () => {
    const { user, signOut, profile } = useAuth();
    const [assignments, setAssignments] = useState<AssignmentWithSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
    const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({});

    useEffect(() => {
        if (user) {
            fetchAssignments();
        }
    }, [user]);

    const fetchAssignments = async () => {
        if (!user) return;
        setLoading(true);

        const { data: assignmentsData, error } = await supabase
            .from("reviewer_assignments")
            .select("*")
            .eq("reviewer_id", user.id)
            .order("assigned_at", { ascending: false });

        if (error) {
            toast.error("Failed to fetch assignments");
            setLoading(false);
            return;
        }

        if (assignmentsData) {
            // Fetch related submissions and reviews
            const assignmentsWithDetails = await Promise.all(
                assignmentsData.map(async (assignment) => {
                    const [submissionRes, reviewRes] = await Promise.all([
                        supabase.from("submissions").select("*").eq("id", assignment.submission_id).single(),
                        supabase.from("reviews").select("*").eq("assignment_id", assignment.id).single(),
                    ]);

                    return {
                        ...assignment,
                        submission: submissionRes.data as Submission | undefined,
                        review: reviewRes.data as Review | undefined,
                    } as AssignmentWithSubmission;
                })
            );

            setAssignments(assignmentsWithDetails);
            const nextDrafts: Record<string, ReviewDraft> = {};
            assignmentsWithDetails.forEach((assignment) => {
                nextDrafts[assignment.id] = {
                    recommendation: assignment.review?.recommendation || "",
                    commentsToEditor: assignment.review?.comments_to_editor || "",
                };
            });
            setReviewDrafts(nextDrafts);
        }

        setLoading(false);
    };

    const updateDraft = (assignmentId: string, patch: Partial<ReviewDraft>) => {
        setReviewDrafts((prev) => ({
            ...prev,
            [assignmentId]: {
                recommendation: prev[assignmentId]?.recommendation || "",
                commentsToEditor: prev[assignmentId]?.commentsToEditor || "",
                ...patch,
            },
        }));
    };

    const handleSubmitReview = async (assignment: AssignmentWithSubmission) => {
        const draft = reviewDrafts[assignment.id];
        if (!draft?.recommendation) {
            toast.error("Please select a reviewer recommendation.");
            return;
        }
        if (!draft.commentsToEditor.trim()) {
            toast.error("Please provide review comments before submitting.");
            return;
        }

        setSubmittingAssignmentId(assignment.id);
        try {
            if (assignment.review) {
                // Update existing review
                const { error } = await supabase
                    .from("reviews")
                    .update({
                        recommendation: draft.recommendation,
                        comments_to_editor: draft.commentsToEditor.trim() || null,
                        comments_to_author: null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", assignment.review.id);

                if (error) throw error;
            } else {
                // Create new review
                const { error } = await supabase.from("reviews").insert({
                    assignment_id: assignment.id,
                    recommendation: draft.recommendation,
                    comments_to_editor: draft.commentsToEditor.trim() || null,
                    comments_to_author: null,
                });

                if (error) throw error;
            }

            // Mark this assignment completed after review submission/update
            const { error: assignmentError } = await supabase
                .from("reviewer_assignments")
                .update({ status: "completed" })
                .eq("id", assignment.id);

            if (assignmentError) throw assignmentError;

            // Reviewer only submits recommendation/comments.
            // Final accept/reject/revision is made by editor workflow.
            toast.success("Review submitted. Waiting for editor decision.");
            fetchAssignments();
        } catch (error: any) {
            toast.error(`Failed to submit review: ${error.message}`);
        } finally {
            setSubmittingAssignmentId(null);
        }
    };

    const openPdf = async (path: string) => {
        const { data, error } = await supabase.storage
            .from("paper_submissions")
            .createSignedUrl(path, 60);

        if (error) {
            toast.error("Could not load PDF document.");
            return;
        }
        window.open(data.signedUrl, "_blank");
    };

    const pendingAssignments = assignments.filter((a) => a.status === "pending" || a.status === "accepted");
    const completedAssignments = assignments.filter((a) => a.status === "completed" || a.status === "rejected");

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Link to="/" className="block hover:opacity-80 transition-opacity">
                        <h1 className="font-serif italic text-xl tracking-tight text-foreground">
                            r&amp;s Review Desk
                        </h1>
                        <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground">
                            Reviewer Dashboard
                        </p>
                    </Link>

                    <div className="flex items-center gap-6">
                        <span className="text-xs font-sans text-muted-foreground">
                            Welcome, {profile?.full_name || "Reviewer"}
                        </span>
                        <Link
                            to="/reviewer/profile"
                            className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Profile
                        </Link>
                        <button
                            onClick={signOut}
                            className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12">
                {/* Pending Assignments */}
                {pendingAssignments.length > 0 && (
                    <section className="mb-12">
                        <h2 className="font-serif text-2xl text-foreground mb-6">
                            Assigned Manuscripts
                        </h2>
                        <div className="space-y-6">
                            {pendingAssignments.map((assignment) => {
                                const draft = reviewDrafts[assignment.id] || {
                                    recommendation: assignment.review?.recommendation || "",
                                    commentsToEditor: assignment.review?.comments_to_editor || "",
                                };

                                return (
                                    <div
                                        key={assignment.id}
                                        className="border border-border bg-card p-6"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-serif text-lg text-foreground">
                                                    {assignment.submission?.title || "Untitled"}
                                                </h3>
                                                <p className="text-sm text-primary">
                                                    By {assignment.submission?.author || "Unknown"}
                                                </p>
                                            </div>
                                            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1">
                                                {assignment.review ? "Review Drafted" : "Awaiting Review"}
                                            </span>
                                        </div>

                                        {assignment.deadline && (
                                            <p className="text-xs text-muted-foreground mb-4">
                                                Deadline: {new Date(assignment.deadline).toLocaleDateString()}
                                            </p>
                                        )}

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                                    Recommendation *
                                                </label>
                                                <select
                                                    required
                                                    value={draft.recommendation}
                                                    onChange={(e) => updateDraft(assignment.id, { recommendation: e.target.value as ReviewRecommendation })}
                                                    className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="">Select recommendation</option>
                                                    <option value="accept">Accept</option>
                                                    <option value="minor_revision">Minor Revision</option>
                                                    <option value="major_revision">Major Revision</option>
                                                    <option value="reject">Reject</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                                    Review Comments *
                                                </label>
                                                <textarea
                                                    rows={5}
                                                    value={draft.commentsToEditor}
                                                    onChange={(e) => updateDraft(assignment.id, { commentsToEditor: e.target.value })}
                                                    placeholder="Write your review comments for the editor..."
                                                    className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>

                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    onClick={() => openPdf(assignment.submission?.pdf_path || "")}
                                                    className="bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-2 border border-border hover:bg-secondary/80"
                                                >
                                                    View PDF
                                                </button>
                                                <button
                                                    onClick={() => handleSubmitReview(assignment)}
                                                    disabled={submittingAssignmentId === assignment.id}
                                                    className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-4 py-2 hover:bg-primary/90 disabled:opacity-50"
                                                >
                                                    {submittingAssignmentId === assignment.id ? "Submitting..." : "Submit Review"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Completed Reviews */}
                {completedAssignments.length > 0 && (
                    <section>
                        <h2 className="font-serif text-2xl text-foreground mb-6">
                            Review History
                        </h2>
                        <div className="space-y-4">
                            {completedAssignments.map((assignment) => (
                                <div
                                    key={assignment.id}
                                    className="border border-border bg-card p-6 opacity-75"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-serif text-lg text-foreground">
                                                {assignment.submission?.title || "Untitled"}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(assignment.assigned_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className={`text-xs font-bold px-3 py-1 ${
                                            assignment.status === "completed"
                                                ? "bg-green-100 text-green-800"
                                                : "bg-red-100 text-red-800"
                                        }`}>
                                            {assignment.status === "completed" ? "Completed" : "Declined"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {loading && (
                    <div className="py-20 text-center text-muted-foreground animate-pulse">
                        Loading assignments...
                    </div>
                )}

                {!loading && assignments.length === 0 && (
                    <div className="py-32 text-center border border-dashed border-border rounded-lg">
                        <p className="font-sans text-muted-foreground mb-2">No assignments yet.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ReviewerDashboard;
