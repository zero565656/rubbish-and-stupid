import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Submission, AboutContent, JournalMetadata, Profile, ReviewerInvitation, JournalSettings as JournalSettingsType, EditorTeamMember, ReviewerTeamMember } from "@/types/database.types";
import { useNavigate, Link } from "react-router-dom";
import { queryClient } from "@/lib/react-query";
import { useAuth } from "@/contexts/AuthContext";
import ArticlesManager from "@/components/admin/ArticlesManager";
import AssignReviewerModal from "@/components/admin/AssignReviewerModal";

// Inline confirm dialog — avoids window.confirm being silently blocked
const ConfirmDialog = ({
    title,
    onConfirm,
    onCancel,
}: {
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
}) => (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="border border-border bg-card p-8 max-w-sm w-full mx-4 space-y-6">
            <p className="font-serif text-lg text-foreground">{title}</p>
            <div className="flex gap-4">
                <button
                    onClick={onCancel}
                    className="flex-1 text-xs font-sans uppercase tracking-widest border border-border px-4 py-3 hover:bg-muted transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 text-xs font-sans uppercase tracking-widest bg-destructive text-destructive-foreground border border-destructive px-4 py-3 hover:opacity-90 transition-opacity"
                >
                    Reject Paper
                </button>
            </div>
        </div>
    </div>
);

const Dashboard = () => {
    const { user } = useAuth();
    // ── Tab state ─────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<"submissions" | "articles" | "settings" | "reviewers" | "journal">("submissions");

    // ── Submissions state ─────────────────────────────────────────────────────
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
    const [assigningToId, setAssigningToId] = useState<string | null>(null);

    // ── Settings state ────────────────────────────────────────────────────────
    const [settingsSubTab, setSettingsSubTab] = useState<"home" | "about">("home");
    const [aboutContent, setAboutContent] = useState<AboutContent | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [journalMetadata, setJournalMetadata] = useState<JournalMetadata | null>(null);
    const [savingHomeSettings, setSavingHomeSettings] = useState(false);

    // ── Reviewers state ───────────────────────────────────────────────────────
    const [reviewers, setReviewers] = useState<Profile[]>([]);
    const [invitations, setInvitations] = useState<ReviewerInvitation[]>([]);
    const [reviewersLoading, setReviewersLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [sendingInvite, setSendingInvite] = useState(false);

    // ── Journal Settings state ──────────────────────────────────────────────
    const [journalSettings, setJournalSettings] = useState<JournalSettingsType | null>(null);
    const [journalSettingsLoading, setJournalSettingsLoading] = useState(true);
    const [savingJournalSettings, setSavingJournalSettings] = useState(false);
    const [impactFactor, setImpactFactor] = useState<string>("");
    const [impactFactorYear, setImpactFactorYear] = useState<string>("");
    const [editorsTeam, setEditorsTeam] = useState<EditorTeamMember[]>([]);
    const [reviewersTeam, setReviewersTeam] = useState<ReviewerTeamMember[]>([]);
    const [newEditor, setNewEditor] = useState<EditorTeamMember>({ name: "", title: "", institution: "", email: "" });
    const [newReviewer, setNewReviewer] = useState<ReviewerTeamMember>({ name: "", institution: "", research_field: "" });

    const navigate = useNavigate();

    // ── Data fetching ─────────────────────────────────────────────────────────
    const fetchSubmissions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("submissions")
            .select("*")
            .eq("status", "pending")
            .order("submitted_at", { ascending: false });

        if (error) {
            toast.error("Failed to fetch pending submissions.");
        } else {
            setSubmissions((data as unknown as Submission[]) || []);
        }
        setLoading(false);
    };

    const fetchAboutContent = async () => {
        const { data, error } = await supabase
            .from("about_content")
            .select("*")
            .limit(1)
            .single();
        if (!error && data) {
            setAboutContent(data as AboutContent);
        }
    };

    const fetchJournalMetadata = async () => {
        const { data, error } = await supabase
            .from("journal_metadata")
            .select("*")
            .limit(1)
            .single();
        if (!error && data) {
            setJournalMetadata(data as JournalMetadata);
        }
    };

    const fetchReviewers = async () => {
        setReviewersLoading(true);
        const [reviewersRes, invitationsRes] = await Promise.all([
            supabase.from("profiles").select("*").eq("role", "reviewer").eq("is_active", true),
            supabase.from("reviewer_invitations").select("*").order("created_at", { ascending: false }),
        ]);
        if (reviewersRes.data) setReviewers(reviewersRes.data as Profile[]);
        if (invitationsRes.data) setInvitations(invitationsRes.data as ReviewerInvitation[]);
        setReviewersLoading(false);
    };

    const fetchJournalSettings = async () => {
        setJournalSettingsLoading(true);
        const { data, error } = await supabase
            .from("journal_settings")
            .select("*")
            .limit(1)
            .single();
        if (!error && data) {
            const settingsData = data as JournalSettingsType;
            setJournalSettings(settingsData);
            setImpactFactor(settingsData.impact_factor?.toString() || "");
            setImpactFactorYear(settingsData.impact_factor_year?.toString() || "");
            setEditorsTeam(settingsData.editors_team || []);
            setReviewersTeam(settingsData.reviewers_team || []);
        }
        setJournalSettingsLoading(false);
    };

    useEffect(() => {
        fetchSubmissions();
        fetchAboutContent();
        fetchJournalMetadata();
    }, []);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    const handleApprove = async (submission: Submission) => {
        setProcessingId(submission.id);
        try {
            const doi = `10.rubbish/paper.${submission.id.substring(0, 6)}`;

            const { data: publicUrlData } = supabase.storage
                .from("paper_submissions")
                .getPublicUrl(submission.pdf_path);

            // articles table has no 'abstract' column
            const { error: insertError } = await supabase.from("articles").insert([
                {
                    title: submission.title,
                    author: submission.author,
                    doi: doi,
                    published_date: new Date().toISOString().split("T")[0],
                    pdf_url: publicUrlData.publicUrl,
                },
            ] as any);
            if (insertError) throw insertError;

            const { error: updateError } = await supabase
                .from("submissions")
                .update([{ status: "approved" }] as any)
                .eq("id", submission.id);
            if (updateError) throw updateError;

            toast.success("Paper approved and published to the journal!");
            setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
        } catch (error: any) {
            toast.error(`Approval failed: ${error.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = (id: string) => {
        setConfirmRejectId(id);
    };

    const confirmReject = async () => {
        const id = confirmRejectId;
        if (!id) return;
        setConfirmRejectId(null);
        setProcessingId(id);
        try {
            const { error } = await supabase
                .from("submissions")
                .update([{ status: "rejected" }] as any)
                .eq("id", id);
            if (error) throw error;

            toast.success("Paper cleanly rejected.");
            setSubmissions((prev) => prev.filter((s) => s.id !== id));
        } catch (error: any) {
            toast.error(`Rejection failed: ${error.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!aboutContent?.id) return;

        setSavingSettings(true);
        const { error } = await supabase
            .from("about_content")
            .update({
                slogan: aboutContent.slogan,
                purpose: aboutContent.purpose,
                introduction: aboutContent.introduction,
            } as any)
            .eq("id", aboutContent.id);

        if (error) {
            toast.error("Failed to save settings.");
        } else {
            toast.success("Journal settings saved successfully.");
            queryClient.invalidateQueries({ queryKey: ["about_content"] });
        }
        setSavingSettings(false);
    };

    const handleSaveHomeSettings = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!journalMetadata?.id) return;

        setSavingHomeSettings(true);
        const { error } = await supabase
            .from("journal_metadata")
            .update({
                volume: journalMetadata.volume,
                issue: journalMetadata.issue,
                issn: journalMetadata.issn,
                hero_title: journalMetadata.hero_title,
                hero_subtitle: journalMetadata.hero_subtitle,
            } as any)
            .eq("id", journalMetadata.id);

        if (error) {
            toast.error("Failed to save homepage settings.");
        } else {
            toast.success("Homepage settings saved successfully.");
            queryClient.invalidateQueries({ queryKey: ["journal_metadata"] });
        }
        setSavingHomeSettings(false);
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

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-background">
            {/* Confirm Reject Dialog */}
            {confirmRejectId && (
                <ConfirmDialog
                    title="Desk-reject this manuscript? This action cannot be undone."
                    onConfirm={confirmReject}
                    onCancel={() => setConfirmRejectId(null)}
                />
            )}

            {/* Assign Reviewer Modal */}
            {assigningToId && (
                <AssignReviewerModal
                    submission={submissions.find(s => s.id === assigningToId)!}
                    onClose={() => setAssigningToId(null)}
                    onAssigned={() => {
                        // Optionally refresh data or show success
                    }}
                />
            )}

            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Link to="/" className="block hover:opacity-80 transition-opacity">
                        <h1 className="font-serif italic text-xl tracking-tight text-foreground">
                            r&amp;s Editorial Desk
                        </h1>
                        <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground">
                            Admin Dashboard
                        </p>
                    </Link>

                    <div className="flex items-center gap-6">
                        {/* Tab Nav */}
                        <nav className="flex items-center gap-5">
                            <button
                                onClick={() => setActiveTab("submissions")}
                                className={`text-xs font-sans uppercase tracking-widest pb-0.5 transition-colors border-b-2 ${activeTab === "submissions"
                                    ? "text-primary border-primary"
                                    : "text-muted-foreground border-transparent hover:text-foreground"
                                    }`}
                            >
                                Submissions
                            </button>
                            <button
                                onClick={() => setActiveTab("articles")}
                                className={`text-xs font-sans uppercase tracking-widest pb-0.5 transition-colors border-b-2 ${activeTab === "articles"
                                    ? "text-primary border-primary"
                                    : "text-muted-foreground border-transparent hover:text-foreground"
                                    }`}
                            >
                                Articles
                            </button>
                            <button
                                onClick={() => setActiveTab("settings")}
                                className={`text-xs font-sans uppercase tracking-widest pb-0.5 transition-colors border-b-2 ${activeTab === "settings"
                                    ? "text-primary border-primary"
                                    : "text-muted-foreground border-transparent hover:text-foreground"
                                    }`}
                            >
                                Settings
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab("reviewers");
                                    if (reviewers.length === 0) fetchReviewers();
                                }}
                                className={`text-xs font-sans uppercase tracking-widest pb-0.5 transition-colors border-b-2 ${activeTab === "reviewers"
                                    ? "text-primary border-primary"
                                    : "text-muted-foreground border-transparent hover:text-foreground"
                                    }`}
                            >
                                Reviewers
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab("journal");
                                    if (!journalSettings) fetchJournalSettings();
                                }}
                                className={`text-xs font-sans uppercase tracking-widest pb-0.5 transition-colors border-b-2 ${activeTab === "journal"
                                    ? "text-primary border-primary"
                                    : "text-muted-foreground border-transparent hover:text-foreground"
                                    }`}
                            >
                                Journal
                            </button>
                        </nav>

                        <div className="w-px h-4 bg-border" />

                        <button
                            onClick={handleLogout}
                            className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="container mx-auto px-6 py-12">

                {/* ─── Tab: Submissions ─── */}
                {activeTab === "submissions" && (
                    <>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="font-serif text-2xl md:text-3xl text-foreground">
                                Pending Submissions
                            </h2>
                            <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                                {submissions.length} Awaiting Review
                            </span>
                        </div>

                        {loading ? (
                            <div className="py-20 text-center text-muted-foreground animate-pulse font-sans">
                                Rummaging through the desk drawer...
                            </div>
                        ) : submissions.length === 0 ? (
                            <div className="py-32 text-center border border-dashed border-border rounded-lg">
                                <p className="font-sans text-muted-foreground mb-2">No pending manuscripts.</p>
                                <p className="text-xs font-mono text-muted-foreground/50">
                                    Even procrastination needs a break.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {submissions.map((submission) => (
                                    <div
                                        key={submission.id}
                                        className="border border-border bg-card p-6 flex flex-col md:flex-row gap-6 items-start justify-between"
                                    >
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <h3 className="font-serif text-xl text-foreground mb-1">
                                                    {submission.title}
                                                </h3>
                                                <p className="font-sans text-sm text-primary mb-2">
                                                    By {submission.author}
                                                </p>
                                                <p className="font-sans text-xs text-muted-foreground">
                                                    Submitted on{" "}
                                                    {new Date(submission.submitted_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="bg-muted p-4 text-sm font-sans text-muted-foreground leading-relaxed border border-border/50">
                                                <strong className="uppercase text-xs tracking-wider text-foreground mb-2 block">
                                                    Abstract
                                                </strong>
                                                {submission.abstract}
                                            </div>
                                        </div>

                                        <div className="flex flex-row md:flex-col gap-3 w-full md:w-48 shrink-0">
                                            <button
                                                onClick={() => openPdf(submission.pdf_path)}
                                                className="flex-1 bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-3 border border-border hover:bg-secondary/80 transition-colors"
                                            >
                                                View PDF
                                            </button>
                                            <button
                                                onClick={() => setAssigningToId(submission.id)}
                                                className="flex-1 bg-blue-900 border border-blue-700 text-blue-100 hover:bg-blue-800 text-xs uppercase tracking-widest px-4 py-3 transition-colors"
                                            >
                                                Assign Reviewer
                                            </button>
                                            <button
                                                onClick={() => handleApprove(submission)}
                                                disabled={processingId === submission.id}
                                                className="flex-1 bg-green-900 border border-green-700 text-green-100 hover:bg-green-800 hover:text-white text-xs uppercase tracking-widest px-4 py-3 disabled:opacity-50 transition-colors"
                                            >
                                                {processingId === submission.id ? "Working..." : "Approve"}
                                            </button>
                                            <button
                                                onClick={() => handleReject(submission.id)}
                                                disabled={processingId === submission.id}
                                                className="flex-1 bg-transparent text-destructive border border-destructive/50 hover:bg-destructive hover:text-destructive-foreground text-xs uppercase tracking-widest px-4 py-3 disabled:opacity-50 transition-colors"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ─── Tab: Articles ─── */}
                {activeTab === "articles" && (
                    <ArticlesManager />
                )}

                {/* ─── Tab: Settings ─── */}
                {activeTab === "settings" && (
                    <div className="max-w-2xl">
                        {/* Settings 子导航 */}
                        <div className="flex items-center gap-6 mb-8 border-b border-border">
                            <button
                                onClick={() => setSettingsSubTab("home")}
                                className={`text-xs font-sans uppercase tracking-widest pb-3 transition-colors border-b-2 -mb-px ${settingsSubTab === "home"
                                    ? "text-primary border-primary"
                                    : "text-muted-foreground border-transparent hover:text-foreground"
                                    }`}
                            >
                                Home Page
                            </button>
                            <button
                                onClick={() => setSettingsSubTab("about")}
                                className={`text-xs font-sans uppercase tracking-widest pb-3 transition-colors border-b-2 -mb-px ${settingsSubTab === "about"
                                    ? "text-primary border-primary"
                                    : "text-muted-foreground border-transparent hover:text-foreground"
                                    }`}
                            >
                                About Page
                            </button>
                        </div>

                        {/* Home Page 设置表单 */}
                        {settingsSubTab === "home" && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
                                        Homepage Settings
                                    </h2>
                                    <p className="text-sm font-sans text-muted-foreground">
                                        Edit the content displayed on the homepage hero section.
                                    </p>
                                </div>

                                {!journalMetadata ? (
                                    <div className="py-12 text-center text-muted-foreground animate-pulse font-sans">
                                        Loading homepage settings...
                                    </div>
                                ) : (
                                    <form onSubmit={handleSaveHomeSettings} className="space-y-8">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                                Volume Number
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                value={journalMetadata.volume}
                                                onChange={(e) =>
                                                    setJournalMetadata({
                                                        ...journalMetadata,
                                                        volume: parseInt(e.target.value) || 1,
                                                    })
                                                }
                                                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                                Issue Number
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                value={journalMetadata.issue}
                                                onChange={(e) =>
                                                    setJournalMetadata({
                                                        ...journalMetadata,
                                                        issue: parseInt(e.target.value) || 1,
                                                    })
                                                }
                                                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                                ISSN
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={journalMetadata.issn}
                                                onChange={(e) =>
                                                    setJournalMetadata({
                                                        ...journalMetadata,
                                                        issn: e.target.value,
                                                    })
                                                }
                                                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                                Hero Title
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={journalMetadata.hero_title}
                                                onChange={(e) =>
                                                    setJournalMetadata({
                                                        ...journalMetadata,
                                                        hero_title: e.target.value,
                                                    })
                                                }
                                                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Main headline displayed in the homepage hero section.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                                Hero Subtitle
                                            </label>
                                            <textarea
                                                required
                                                rows={3}
                                                value={journalMetadata.hero_subtitle}
                                                onChange={(e) =>
                                                    setJournalMetadata({
                                                        ...journalMetadata,
                                                        hero_subtitle: e.target.value,
                                                    })
                                                }
                                                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Supporting text displayed below the main headline.
                                            </p>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={savingHomeSettings}
                                            className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-8 py-3 hover:bg-primary/90 transition-colors disabled:opacity-50"
                                        >
                                            {savingHomeSettings ? "Saving..." : "Save Homepage Settings"}
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}

                        {/* About Page 设置表单 */}
                        {settingsSubTab === "about" && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
                                        About Page Settings
                                    </h2>
                                    <p className="text-sm font-sans text-muted-foreground">
                                        Edit the content displayed on the public "About Journal" page.
                                    </p>
                                </div>

                                {!aboutContent ? (
                                    <div className="py-12 text-center text-muted-foreground animate-pulse font-sans">
                                        Loading settings...
                                    </div>
                                ) : (
                                    <form onSubmit={handleSaveSettings} className="space-y-8">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                                Journal Slogan
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={aboutContent.slogan}
                                                onChange={(e) =>
                                                    setAboutContent({ ...aboutContent, slogan: e.target.value })
                                                }
                                                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Shown in the hero quote on the About page.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                                Our Purpose
                                            </label>
                                            <textarea
                                                required
                                                rows={3}
                                                value={aboutContent.purpose}
                                                onChange={(e) =>
                                                    setAboutContent({ ...aboutContent, purpose: e.target.value })
                                                }
                                                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                                Introduction
                                            </label>
                                            <textarea
                                                required
                                                rows={8}
                                                value={aboutContent.introduction}
                                                onChange={(e) =>
                                                    setAboutContent({ ...aboutContent, introduction: e.target.value })
                                                }
                                                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Main body text on the About page. Supports line breaks.
                                            </p>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={savingSettings}
                                            className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-8 py-3 hover:bg-primary/90 transition-colors disabled:opacity-50"
                                        >
                                            {savingSettings ? "Saving..." : "Save Settings"}
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Tab: Reviewers ─── */}
                {activeTab === "reviewers" && (
                    <div className="max-w-4xl">
                        <div className="mb-8">
                            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
                                Reviewer Management
                            </h2>
                            <p className="text-sm font-sans text-muted-foreground">
                                Invite reviewers and manage your journal's reviewer team.
                            </p>
                        </div>

                        {/* Invite Form */}
                        <div className="border border-border bg-card p-6 mb-8">
                            <h3 className="font-serif text-xl text-foreground mb-4">
                                Invite New Reviewer
                            </h3>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!inviteEmail.trim() || !user) return;
                                setSendingInvite(true);
                                try {
                                    const token = crypto.randomUUID();
                                    const expiresAt = new Date();
                                    expiresAt.setDate(expiresAt.getDate() + 7);
                                    const { error } = await supabase.from("reviewer_invitations").insert({
                                        email: inviteEmail.trim(),
                                        token,
                                        invited_by: user.id,
                                        status: "pending",
                                        expires_at: expiresAt.toISOString(),
                                    });
                                    if (error) throw error;
                                    toast.success(`Invitation sent to ${inviteEmail}`);
                                    setInviteEmail("");
                                    fetchReviewers();
                                } catch (error: any) {
                                    toast.error(`Failed: ${error.message}`);
                                } finally {
                                    setSendingInvite(false);
                                }
                            }} className="flex gap-4">
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
                                    disabled={sendingInvite}
                                    className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-6 py-2 hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {sendingInvite ? "Sending..." : "Send Invite"}
                                </button>
                            </form>
                        </div>

                        {/* Pending Invitations */}
                        <div className="border border-border bg-card p-6 mb-8">
                            <h3 className="font-serif text-xl text-foreground mb-4">Pending Invitations</h3>
                            {reviewersLoading ? (
                                <p className="text-muted-foreground animate-pulse">Loading...</p>
                            ) : invitations.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No pending invitations.</p>
                            ) : (
                                <div className="space-y-4">
                                    {invitations.map((invitation) => (
                                        <div key={invitation.id} className="flex items-center justify-between p-4 bg-muted border border-border/50">
                                            <div>
                                                <p className="font-sans text-sm text-foreground">{invitation.email}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Status: {invitation.status} | Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const link = `${window.location.origin}/register?token=${invitation.token}`;
                                                        navigator.clipboard.writeText(link);
                                                        toast.success("Link copied!");
                                                    }}
                                                    className="text-xs font-sans uppercase tracking-widest text-primary hover:underline"
                                                >
                                                    Copy Link
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        await supabase.from("reviewer_invitations").delete().eq("id", invitation.id);
                                                        toast.success("Invitation revoked");
                                                        fetchReviewers();
                                                    }}
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
                            <h3 className="font-serif text-xl text-foreground mb-4">Active Reviewers</h3>
                            {reviewersLoading ? (
                                <p className="text-muted-foreground animate-pulse">Loading...</p>
                            ) : reviewers.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No active reviewers yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {reviewers.map((reviewer) => (
                                        <div key={reviewer.id} className="flex items-center justify-between p-4 bg-muted border border-border/50">
                                            <div>
                                                <p className="font-sans text-sm text-foreground">{reviewer.full_name || "Anonymous"}</p>
                                                <p className="text-xs text-muted-foreground">{reviewer.institution || "No institution"}</p>
                                            </div>
                                            <span className="text-xs font-sans uppercase tracking-widest text-green-600 bg-green-100 px-2 py-1">Active</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Tab: Journal ─── */}
                {activeTab === "journal" && (
                    <div className="max-w-4xl">
                        <div className="mb-8">
                            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
                                Journal Settings
                            </h2>
                            <p className="text-sm font-sans text-muted-foreground">
                                Manage journal metadata, team members, and impact factor.
                            </p>
                        </div>

                        {journalSettingsLoading ? (
                            <div className="py-20 text-center text-muted-foreground animate-pulse">Loading...</div>
                        ) : (
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!journalSettings?.id) return;
                                setSavingJournalSettings(true);
                                try {
                                    const { error } = await supabase
                                        .from("journal_settings")
                                        .update({
                                            impact_factor: impactFactor ? parseFloat(impactFactor) : null,
                                            impact_factor_year: impactFactorYear ? parseInt(impactFactorYear) : null,
                                            editors_team: editorsTeam,
                                            reviewers_team: reviewersTeam,
                                        })
                                        .eq("id", journalSettings.id);
                                    if (error) throw error;
                                    toast.success("Settings saved!");
                                } catch (error: any) {
                                    toast.error(`Error: ${error.message}`);
                                } finally {
                                    setSavingJournalSettings(false);
                                }
                            }} className="space-y-8">
                                {/* Impact Factor */}
                                <section className="border border-border bg-card p-6">
                                    <h3 className="font-serif text-xl text-foreground mb-6">Impact Factor</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">Impact Factor</label>
                                            <input type="number" step="0.001" min="0" value={impactFactor} onChange={(e) => setImpactFactor(e.target.value)} placeholder="e.g., 3.456" className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">Year</label>
                                            <input type="number" min="1900" max="2100" value={impactFactorYear} onChange={(e) => setImpactFactorYear(e.target.value)} placeholder="e.g., 2025" className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                        </div>
                                    </div>
                                </section>

                                {/* Editors Team */}
                                <section className="border border-border bg-card p-6">
                                    <h3 className="font-serif text-xl text-foreground mb-6">Editors Team</h3>
                                    <div className="space-y-4 mb-6">
                                        {editorsTeam.map((editor, index) => (
                                            <div key={index} className="flex items-center justify-between p-4 bg-muted border border-border/50">
                                                <div>
                                                    <p className="font-medium text-foreground">{editor.name}</p>
                                                    <p className="text-sm text-muted-foreground">{editor.title} - {editor.institution}</p>
                                                </div>
                                                <button type="button" onClick={() => setEditorsTeam(editorsTeam.filter((_, i) => i !== index))} className="text-destructive hover:underline text-sm">Remove</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input type="text" placeholder="Name" value={newEditor.name} onChange={(e) => setNewEditor({ ...newEditor, name: e.target.value })} className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                        <input type="text" placeholder="Title" value={newEditor.title} onChange={(e) => setNewEditor({ ...newEditor, title: e.target.value })} className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                        <input type="text" placeholder="Institution" value={newEditor.institution} onChange={(e) => setNewEditor({ ...newEditor, institution: e.target.value })} className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                        <input type="email" placeholder="Email" value={newEditor.email} onChange={(e) => setNewEditor({ ...newEditor, email: e.target.value })} className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                    <button type="button" onClick={() => { if (newEditor.name && newEditor.email) { setEditorsTeam([...editorsTeam, newEditor]); setNewEditor({ name: "", title: "", institution: "", email: "" }); } }} disabled={!newEditor.name || !newEditor.email} className="mt-4 bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-2 border border-border hover:bg-secondary/80 disabled:opacity-50">Add Editor</button>
                                </section>

                                {/* Reviewers Team */}
                                <section className="border border-border bg-card p-6">
                                    <h3 className="font-serif text-xl text-foreground mb-6">Reviewers Team</h3>
                                    <div className="space-y-4 mb-6">
                                        {reviewersTeam.map((reviewer, index) => (
                                            <div key={index} className="flex items-center justify-between p-4 bg-muted border border-border/50">
                                                <div>
                                                    <p className="font-medium text-foreground">{reviewer.name}</p>
                                                    <p className="text-sm text-muted-foreground">{reviewer.institution}</p>
                                                    <p className="text-sm text-muted-foreground">{reviewer.research_field}</p>
                                                </div>
                                                <button type="button" onClick={() => setReviewersTeam(reviewersTeam.filter((_, i) => i !== index))} className="text-destructive hover:underline text-sm">Remove</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <input type="text" placeholder="Name" value={newReviewer.name} onChange={(e) => setNewReviewer({ ...newReviewer, name: e.target.value })} className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                        <input type="text" placeholder="Institution" value={newReviewer.institution} onChange={(e) => setNewReviewer({ ...newReviewer, institution: e.target.value })} className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                        <input type="text" placeholder="Research Field" value={newReviewer.research_field} onChange={(e) => setNewReviewer({ ...newReviewer, research_field: e.target.value })} className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                    <button type="button" onClick={() => { if (newReviewer.name) { setReviewersTeam([...reviewersTeam, newReviewer]); setNewReviewer({ name: "", institution: "", research_field: "" }); } }} disabled={!newReviewer.name} className="mt-4 bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-2 border border-border hover:bg-secondary/80 disabled:opacity-50">Add Reviewer</button>
                                </section>

                                <div className="flex justify-end">
                                    <button type="submit" disabled={savingJournalSettings} className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-8 py-3 hover:bg-primary/90 disabled:opacity-50">
                                        {savingJournalSettings ? "Saving..." : "Save Settings"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
