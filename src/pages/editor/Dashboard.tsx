import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { ReviewRecommendation, Submission } from "@/types/database.types";
import { useAuth } from "@/contexts/AuthContext";
import AssignReviewerModal from "@/components/admin/AssignReviewerModal";

type AssignmentCountMap = Record<string, number>;
type EditorialDecision = "accept" | "reject";
type ReviewerFeedback = {
  assignmentId: string;
  reviewerName: string;
  assignmentStatus: "pending" | "accepted" | "rejected" | "completed";
  recommendation: ReviewRecommendation | null;
  reviewComment: string | null;
  updatedAt: string | null;
};
type ReviewerFeedbackMap = Record<string, ReviewerFeedback[]>;

const EditorDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignmentCounts, setAssignmentCounts] = useState<AssignmentCountMap>({});
  const [reviewFeedbackBySubmission, setReviewFeedbackBySubmission] = useState<ReviewerFeedbackMap>({});
  const [loading, setLoading] = useState(true);
  const [assigningToId, setAssigningToId] = useState<string | null>(null);
  const [decisionForId, setDecisionForId] = useState<string | null>(null);
  const [decision, setDecision] = useState<EditorialDecision | "">("");
  const [decisionComment, setDecisionComment] = useState("");
  const [savingDecision, setSavingDecision] = useState(false);

  useEffect(() => {
    fetchPendingSubmissions();
  }, []);

  const fetchPendingSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("status", "pending")
      .order("submitted_at", { ascending: false });

    if (error) {
      toast.error(`Failed to load submissions: ${error.message}`);
      setLoading(false);
      return;
    }

    const rows = (data as Submission[]) || [];
    setSubmissions(rows);

    if (rows.length > 0) {
      const ids = rows.map((item) => item.id);
      const { data: assignmentRows } = await supabase
        .from("reviewer_assignments")
        .select("id, submission_id, reviewer_id, status")
        .in("submission_id", ids);

      const assignmentList = (assignmentRows || []) as Array<{
        id: string;
        submission_id: string;
        reviewer_id: string;
        status: "pending" | "accepted" | "rejected" | "completed";
      }>;

      const counter: AssignmentCountMap = {};
      assignmentList.forEach((item) => {
        counter[item.submission_id] = (counter[item.submission_id] || 0) + 1;
      });
      setAssignmentCounts(counter);

      if (assignmentList.length > 0) {
        const assignmentIds = assignmentList.map((item) => item.id);
        const reviewerIds = Array.from(new Set(assignmentList.map((item) => item.reviewer_id)));

        const [{ data: reviewRows }, { data: reviewerRows }] = await Promise.all([
          supabase.from("reviews").select("*").in("assignment_id", assignmentIds),
          supabase.from("profiles").select("id, full_name").in("id", reviewerIds),
        ]);

        const reviewByAssignmentId = new Map<string, any>();
        (reviewRows || []).forEach((review: any) => {
          const existing = reviewByAssignmentId.get(review.assignment_id);
          if (!existing) {
            reviewByAssignmentId.set(review.assignment_id, review);
            return;
          }
          if (new Date(review.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
            reviewByAssignmentId.set(review.assignment_id, review);
          }
        });

        const reviewerNameById = new Map<string, string>();
        (reviewerRows || []).forEach((reviewer: any) => {
          reviewerNameById.set(reviewer.id, reviewer.full_name || "Reviewer");
        });

        const nextFeedbackMap: ReviewerFeedbackMap = {};
        assignmentList.forEach((assignment) => {
          const review = reviewByAssignmentId.get(assignment.id);
          const feedback: ReviewerFeedback = {
            assignmentId: assignment.id,
            reviewerName: reviewerNameById.get(assignment.reviewer_id) || "Reviewer",
            assignmentStatus: assignment.status,
            recommendation: review?.recommendation || null,
            reviewComment: review?.comments_to_editor || review?.comments_to_author || null,
            updatedAt: review?.updated_at || null,
          };

          if (!nextFeedbackMap[assignment.submission_id]) {
            nextFeedbackMap[assignment.submission_id] = [];
          }
          nextFeedbackMap[assignment.submission_id].push(feedback);
        });

        setReviewFeedbackBySubmission(nextFeedbackMap);
      } else {
        setReviewFeedbackBySubmission({});
      }
    } else {
      setAssignmentCounts({});
      setReviewFeedbackBySubmission({});
    }

    setLoading(false);
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

  const pendingCountLabel = useMemo(() => `${submissions.length} Pending`, [submissions.length]);

  const getRecommendationBadge = (recommendation: ReviewRecommendation) => {
    switch (recommendation) {
      case "major_revision":
        return <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1">Major Revision</span>;
      case "minor_revision":
        return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1">Minor Revision</span>;
      case "accept":
        return <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1">Accept</span>;
      case "reject":
        return <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1">Reject</span>;
      default:
        return null;
    }
  };

  const openDecisionModal = (submission: Submission) => {
    setDecisionForId(submission.id);
    const existingDecision = submission.editorial_decision as EditorialDecision | null;
    setDecision(existingDecision === "accept" || existingDecision === "reject" ? existingDecision : "");
    setDecisionComment(submission.editorial_comment || "");
  };

  const publishAcceptedSubmission = async (submissionId: string) => {
    const submission = submissions.find((item) => item.id === submissionId);
    if (!submission) {
      throw new Error("Submission not found.");
    }

    const doi = `10.rubbish/paper.${submission.id.substring(0, 6)}`;
    const { data: existingArticle, error: existingArticleError } = await supabase
      .from("articles")
      .select("id")
      .eq("doi", doi)
      .maybeSingle();

    if (existingArticleError) {
      throw existingArticleError;
    }

    if (existingArticle) {
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("paper_submissions")
      .getPublicUrl(submission.pdf_path);

    const { error: insertError } = await supabase.from("articles").insert([
      {
        title: submission.title,
        author: submission.author,
        article_type: submission.article_type || null,
        institution: submission.institution || null,
        doi,
        published_date: new Date().toISOString().split("T")[0],
        pdf_url: publicUrlData.publicUrl,
        tags: submission.article_type ? [submission.article_type] : [],
      },
    ] as any);

    if (insertError) {
      throw insertError;
    }
  };

  const submitDecision = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!decisionForId || !decision) return;

    const feedbackList = reviewFeedbackBySubmission[decisionForId] || [];
    const hasAnySubmittedReview = feedbackList.some((feedback) => feedback.recommendation !== null);
    if (!hasAnySubmittedReview) {
      toast.error("Please wait for at least one reviewer report before making the editorial decision.");
      return;
    }

    if (decision === "reject" && !decisionComment.trim()) {
      toast.error("Please provide a rejection reason for the author.");
      return;
    }

    let nextStatus: Submission["status"] = "pending";
    if (decision === "accept") {
      nextStatus = "approved";
    } else {
      nextStatus = "rejected";
    }

    setSavingDecision(true);
    try {
      if (decision === "accept") {
        await publishAcceptedSubmission(decisionForId);
      }

      const { error } = await supabase
        .from("submissions")
        .update({
          status: nextStatus,
          editorial_decision: decision,
          editorial_comment: decision === "reject" ? decisionComment.trim() : null,
          editorial_decided_at: new Date().toISOString(),
          editor_id: user?.id || null,
        } as any)
        .eq("id", decisionForId);

      if (error) throw error;

      toast.success("Editorial decision saved.");
      setDecisionForId(null);
      setDecision("");
      setDecisionComment("");
      fetchPendingSubmissions();
    } catch (error: any) {
      toast.error(`Failed to save decision: ${error.message}`);
    } finally {
      setSavingDecision(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {assigningToId && (
        <AssignReviewerModal
          submission={submissions.find((item) => item.id === assigningToId)!}
          onClose={() => setAssigningToId(null)}
          onAssigned={() => {
            toast.success("Reviewer assigned.");
            fetchPendingSubmissions();
          }}
        />
      )}
      {decisionForId && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border max-w-xl w-full">
            <div className="p-6 border-b border-border">
              <h3 className="font-serif text-xl text-foreground">Editorial Decision</h3>
            </div>
            <form onSubmit={submitDecision} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                  Decision *
                </label>
                <select
                  required
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as EditorialDecision)}
                  className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select decision</option>
                  <option value="accept">Accept</option>
                  <option value="reject">Reject</option>
                </select>
              </div>

              {decision === "reject" && (
                <div className="space-y-2">
                  <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                    Rejection Reason *
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={decisionComment}
                    onChange={(e) => setDecisionComment(e.target.value)}
                    placeholder="Please provide a clear rejection reason for the author."
                    className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDecisionForId(null);
                    setDecision("");
                    setDecisionComment("");
                  }}
                  className="flex-1 bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-3 border border-border hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDecision || !decision}
                  className="flex-1 bg-primary text-primary-foreground text-xs uppercase tracking-widest px-4 py-3 hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingDecision ? "Saving..." : "Save Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Link to="/" className="block hover:opacity-80 transition-opacity">
            <h1 className="font-serif italic text-xl tracking-tight text-foreground">r&amp;s Editorial Desk</h1>
            <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground">Editor Dashboard</p>
          </Link>

          <div className="flex items-center gap-5">
            <span className="text-xs font-sans text-muted-foreground">{profile?.full_name || "Editor"}</span>
            <Link
              to="/editor/profile"
              className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Profile
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/");
              }}
              className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-2xl md:text-3xl text-foreground">Pending Submissions</h2>
          <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
            {pendingCountLabel}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground animate-pulse">Loading...</div>
        ) : submissions.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-border rounded-lg">
            <p className="font-sans text-muted-foreground">No pending manuscripts.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((submission) => (
              <article key={submission.id} className="border border-border bg-card p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-serif text-xl text-foreground">{submission.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">By {submission.author}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {submission.article_type && (
                        <span className="text-[10px] font-sans uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 border border-primary/20">
                          Type: {submission.article_type}
                        </span>
                      )}
                      {submission.institution && (
                        <span className="text-[10px] font-sans uppercase tracking-wider bg-muted text-foreground px-2 py-1 border border-border">
                          Institution: {submission.institution}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Assigned reviewers: {assignmentCounts[submission.id] || 0}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {submission.abstract}
                </p>

                <div className="border border-border/60 bg-background p-4 mb-5">
                  <p className="text-xs font-sans uppercase tracking-widest text-muted-foreground mb-3">
                    Reviewer Feedback
                  </p>
                  {(reviewFeedbackBySubmission[submission.id] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No reviewer feedback submitted yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {(reviewFeedbackBySubmission[submission.id] || []).map((feedback) => (
                        <div key={feedback.assignmentId} className="border border-border/50 p-3">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-sm font-medium text-foreground">{feedback.reviewerName}</p>
                            {feedback.recommendation
                              ? getRecommendationBadge(feedback.recommendation)
                              : <span className="text-xs text-muted-foreground">No recommendation yet</span>}
                          </div>
                          {feedback.reviewComment ? (
                            <p className="text-sm text-muted-foreground leading-relaxed">{feedback.reviewComment}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">No review comments submitted.</p>
                          )}
                          {feedback.updatedAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Updated: {new Date(feedback.updatedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => openPdf(submission.pdf_path)}
                    className="bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-2 border border-border hover:bg-secondary/80"
                  >
                    View PDF
                  </button>
                  <button
                    onClick={() => setAssigningToId(submission.id)}
                    className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-4 py-2 hover:bg-primary/90"
                  >
                    Assign Reviewer
                  </button>
                  <button
                    onClick={() => openDecisionModal(submission)}
                    className="bg-[#1a2a22] text-white text-xs uppercase tracking-widest px-4 py-2 hover:opacity-90"
                  >
                    Editorial Decision
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default EditorDashboard;
