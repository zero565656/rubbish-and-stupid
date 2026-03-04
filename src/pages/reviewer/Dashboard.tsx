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

const ReviewerDashboard = () => {
    const { user, signOut, profile } = useAuth();
    const [assignments, setAssignments] = useState<AssignmentWithSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithSubmission | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Review form state
    const [recommendation, setRecommendation] = useState<ReviewRecommendation | "">("");
    const [commentsToEditor, setCommentsToEditor] = useState("");
    const [commentsToAuthor, setCommentsToAuthor] = useState("");

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
        }

        setLoading(false);
    };

    const handleAccept = async (assignmentId: string) => {
        try {
            const { error } = await supabase
                .from("reviewer_assignments")
                .update({ status: "accepted" })
                .eq("id", assignmentId);

            if (error) throw error;
            toast.success("Assignment accepted");
            fetchAssignments();
        } catch (error: any) {
            toast.error(`Failed: ${error.message}`);
        }
    };

    const handleReject = async (assignmentId: string) => {
        try {
            const { error } = await supabase
                .from("reviewer_assignments")
                .update({ status: "rejected" })
                .eq("id", assignmentId);

            if (error) throw error;
            toast.success("Assignment rejected");
            fetchAssignments();
        } catch (error: any) {
            toast.error(`Failed: ${error.message}`);
        }
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAssignment || !recommendation) return;

        setSubmitting(true);
        try {
            if (selectedAssignment.review) {
                // Update existing review
                const { error } = await supabase
                    .from("reviews")
                    .update({
                        recommendation,
                        comments_to_editor: commentsToEditor || null,
                        comments_to_author: commentsToAuthor || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", selectedAssignment.review.id);

                if (error) throw error;
            } else {
                // Create new review
                const { error } = await supabase.from("reviews").insert({
                    assignment_id: selectedAssignment.id,
                    recommendation,
                    comments_to_editor: commentsToEditor || null,
                    comments_to_author: commentsToAuthor || null,
                });

                if (error) throw error;

                // Update assignment status
                await supabase
                    .from("reviewer_assignments")
                    .update({ status: "completed" })
                    .eq("id", selectedAssignment.id);
            }

            toast.success("Review submitted successfully");
            setSelectedAssignment(null);
            setRecommendation("");
            setCommentsToEditor("");
            setCommentsToAuthor("");
            fetchAssignments();
        } catch (error: any) {
            toast.error(`Failed to submit review: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const openReviewForm = (assignment: AssignmentWithSubmission) => {
        setSelectedAssignment(assignment);
        if (assignment.review) {
            setRecommendation(assignment.review.recommendation);
            setCommentsToEditor(assignment.review.comments_to_editor || "");
            setCommentsToAuthor(assignment.review.comments_to_author || "");
        } else {
            setRecommendation("");
            setCommentsToEditor("");
            setCommentsToAuthor("");
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

    const pendingAssignments = assignments.filter((a) => a.status === "pending");
    const acceptedAssignments = assignments.filter((a) => a.status === "accepted");
    const completedAssignments = assignments.filter((a) => a.status === "completed" || a.status === "rejected");

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="font-serif italic text-xl tracking-tight text-foreground">
                            r&amp;s Review Desk
                        </h1>
                        <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground">
                            Reviewer Dashboard
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        <span className="text-xs font-sans text-muted-foreground">
                            Welcome, {profile?.full_name || "Reviewer"}
                        </span>
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
                            Pending Assignments
                        </h2>
                        <div className="space-y-6">
                            {pendingAssignments.map((assignment) => (
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
                                            Pending
                                        </span>
                                    </div>
                                    {assignment.deadline && (
                                        <p className="text-xs text-muted-foreground mb-4">
                                            Deadline: {new Date(assignment.deadline).toLocaleDateString()}
                                        </p>
                                    )}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => openPdf(assignment.submission?.pdf_path || "")}
                                            className="bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-2 border border-border hover:bg-secondary/80"
                                        >
                                            View PDF
                                        </button>
                                        <button
                                            onClick={() => handleAccept(assignment.id)}
                                            className="bg-green-900 border border-green-700 text-green-100 hover:bg-green-800 text-xs uppercase tracking-widest px-4 py-2"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleReject(assignment.id)}
                                            className="bg-transparent text-destructive border border-destructive/50 hover:bg-destructive hover:text-destructive-foreground text-xs uppercase tracking-widest px-4 py-2"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Active Reviews */}
                {acceptedAssignments.length > 0 && (
                    <section className="mb-12">
                        <h2 className="font-serif text-2xl text-foreground mb-6">
                            Active Reviews
                        </h2>
                        <div className="space-y-6">
                            {acceptedAssignments.map((assignment) => (
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
                                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1">
                                            In Progress
                                        </span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => openPdf(assignment.submission?.pdf_path || "")}
                                            className="bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-2 border border-border hover:bg-secondary/80"
                                        >
                                            View PDF
                                        </button>
                                        <button
                                            onClick={() => openReviewForm(assignment)}
                                            className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-4 py-2 hover:bg-primary/90"
                                        >
                                            {assignment.review ? "Edit Review" : "Submit Review"}
                                        </button>
                                    </div>
                                </div>
                            ))}
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

            {/* Review Form Modal */}
            {selectedAssignment && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border">
                            <h3 className="font-serif text-xl text-foreground">
                                Submit Review
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {selectedAssignment.submission?.title}
                            </p>
                        </div>
                        <form onSubmit={handleSubmitReview} className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                    Recommendation *
                                </label>
                                <select
                                    required
                                    value={recommendation}
                                    onChange={(e) => setRecommendation(e.target.value as ReviewRecommendation)}
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
                                    Comments to Author
                                </label>
                                <textarea
                                    rows={5}
                                    value={commentsToAuthor}
                                    onChange={(e) => setCommentsToAuthor(e.target.value)}
                                    placeholder="Feedback for the author..."
                                    className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                    Confidential Comments to Editor
                                </label>
                                <textarea
                                    rows={3}
                                    value={commentsToEditor}
                                    onChange={(e) => setCommentsToEditor(e.target.value)}
                                    placeholder="Private notes for the editor..."
                                    className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectedAssignment(null)}
                                    className="flex-1 bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-3 border border-border hover:bg-secondary/80"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-primary text-primary-foreground text-xs uppercase tracking-widest px-4 py-3 hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {submitting ? "Submitting..." : "Submit Review"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewerDashboard;
