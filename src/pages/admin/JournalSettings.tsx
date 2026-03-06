import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { JournalSettings as JournalSettingsType, EditorTeamMember, ReviewerTeamMember, Profile } from "@/types/database.types";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const JournalSettings = () => {
    const { isAdmin } = useAuth();
    const [settings, setSettings] = useState<JournalSettingsType | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [impactFactor, setImpactFactor] = useState<string>("");
    const [impactFactorYear, setImpactFactorYear] = useState<string>("");
    const [citeScore, setCiteScore] = useState<string>("");
    const [citeScoreYear, setCiteScoreYear] = useState<string>("");
    const [coverImage, setCoverImage] = useState<string>("");
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
    const [uploadingCover, setUploadingCover] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [editorsTeam, setEditorsTeam] = useState<EditorTeamMember[]>([]);
    const [reviewersTeam, setReviewersTeam] = useState<ReviewerTeamMember[]>([]);
    const [availableEditorProfiles, setAvailableEditorProfiles] = useState<Profile[]>([]);
    const [availableReviewerProfiles, setAvailableReviewerProfiles] = useState<Profile[]>([]);
    const [selectedEditorProfileId, setSelectedEditorProfileId] = useState<string>("");
    const [selectedReviewerProfileId, setSelectedReviewerProfileId] = useState<string>("");
    const [aboutPageAdditional, setAboutPageAdditional] = useState<string>("");

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        const [settingsRes, profilesRes] = await Promise.all([
            supabase
                .from("journal_settings")
                .select("*")
                .limit(1)
                .single(),
            supabase
                .from("profiles")
                .select("*")
                .eq("is_active", true),
        ]);

        if (!settingsRes.error && settingsRes.data) {
            const settingsData = settingsRes.data as JournalSettingsType;
            setSettings(settingsData);
            setImpactFactor(settingsData.impact_factor?.toString() || "");
            setImpactFactorYear(settingsData.impact_factor_year?.toString() || "");
            setCiteScore(settingsData.cite_score?.toString() || "");
            setCiteScoreYear(settingsData.cite_score_year?.toString() || "");
            setCoverImage(settingsData.cover_image || "");
            setCoverImagePreview(settingsData.cover_image || null);
            setEditorsTeam(settingsData.editors_team || []);
            setReviewersTeam(settingsData.reviewers_team || []);
            setAboutPageAdditional(settingsData.about_page_additional || "");
        }

        if (!profilesRes.error && profilesRes.data) {
            const profileRows = profilesRes.data as Profile[];
            setAvailableEditorProfiles(profileRows.filter((p) => p.role === "editor"));
            setAvailableReviewerProfiles(profileRows.filter((p) => p.role === "reviewer"));
        }
        setLoading(false);
    };

    const handleCoverUpload = async (): Promise<string | null> => {
        if (!coverImageFile) return coverImage;

        setUploadingCover(true);
        try {
            const fileExt = coverImageFile.name.split('.').pop();
            const fileName = `cover_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('journal-covers')
                .upload(fileName, coverImageFile, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('journal-covers')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error: any) {
            toast.error(`Failed to upload cover: ${error.message}`);
            return null;
        } finally {
            setUploadingCover(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings?.id) return;

        setSaving(true);
        try {
            // Upload cover image first if selected
            const uploadedCoverUrl = await handleCoverUpload();
            if (uploadedCoverUrl === null) {
                setSaving(false);
                return;
            }

            const { error } = await supabase
                .from("journal_settings")
                .update({
                    impact_factor: impactFactor ? parseFloat(impactFactor) : null,
                    impact_factor_year: impactFactorYear ? parseInt(impactFactorYear) : null,
                    cite_score: citeScore ? parseFloat(citeScore) : null,
                    cite_score_year: citeScoreYear ? parseInt(citeScoreYear) : null,
                    cover_image: uploadedCoverUrl || null,
                    editors_team: editorsTeam,
                    reviewers_team: reviewersTeam,
                    about_page_additional: aboutPageAdditional || null,
                })
                .eq("id", settings.id);

            if (error) throw error;
            toast.success("Settings saved successfully");
        } catch (error: any) {
            toast.error(`Failed to save: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const addEditorFromProfile = () => {
        if (!selectedEditorProfileId) return;
        const profile = availableEditorProfiles.find((item) => item.id === selectedEditorProfileId);
        if (!profile) return;

        if (editorsTeam.some((item) => item.user_id === profile.id)) {
            toast.info("This editor is already in homepage list.");
            return;
        }

        setEditorsTeam((prev) => [
            ...prev,
            {
                user_id: profile.id,
                name: profile.full_name || "Unnamed Editor",
                title: "Editor",
                institution: profile.institution || "",
                email: "",
                research_field: profile.research_field || "",
                avatar_url: profile.avatar_url || null,
                signature: profile.bio || null,
            },
        ]);
        setSelectedEditorProfileId("");
    };

    const addReviewerFromProfile = () => {
        if (!selectedReviewerProfileId) return;
        const profile = availableReviewerProfiles.find((item) => item.id === selectedReviewerProfileId);
        if (!profile) return;

        if (reviewersTeam.some((item) => item.user_id === profile.id)) {
            toast.info("This reviewer is already in homepage list.");
            return;
        }

        setReviewersTeam((prev) => [
            ...prev,
            {
                user_id: profile.id,
                name: profile.full_name || "Unnamed Reviewer",
                institution: profile.institution || "",
                research_field: profile.research_field || "",
                avatar_url: profile.avatar_url || null,
                signature: profile.bio || null,
            },
        ]);
        setSelectedReviewerProfileId("");
    };

    const removeEditor = (index: number) => {
        setEditorsTeam((prev) => prev.filter((_, i) => i !== index));
    };

    const removeReviewer = (index: number) => {
        setReviewersTeam((prev) => prev.filter((_, i) => i !== index));
    };

    const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCoverImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeCoverImage = () => {
        setCoverImageFile(null);
        setCoverImagePreview(null);
        setCoverImage("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
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
                        â†?Back to Dashboard
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h1 className="font-serif text-3xl text-foreground mb-2">
                            Journal Settings
                        </h1>
                        <p className="text-sm font-sans text-muted-foreground">
                            Manage journal metadata, team members, and additional content.
                        </p>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center text-muted-foreground animate-pulse">
                            Loading settings...
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-12">
                            {/* Impact Factor */}
                            <section className="border border-border bg-card p-6">
                                <h2 className="font-serif text-xl text-foreground mb-6">
                                    Impact Factor
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                            Impact Factor (can be negative)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            value={impactFactor}
                                            onChange={(e) => setImpactFactor(e.target.value)}
                                            placeholder="e.g., -1.0 or 3.456"
                                            className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                            Year
                                        </label>
                                        <input
                                            type="number"
                                            min="1900"
                                            max="2100"
                                            value={impactFactorYear}
                                            onChange={(e) => setImpactFactorYear(e.target.value)}
                                            placeholder="e.g., 2025"
                                            className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* CiteScore */}
                            <section className="border border-border bg-card p-6">
                                <h2 className="font-serif text-xl text-foreground mb-6">
                                    CiteScore
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                            CiteScore (can be negative)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            value={citeScore}
                                            onChange={(e) => setCiteScore(e.target.value)}
                                            placeholder="e.g., -1.0 or 2.5"
                                            className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                            Year
                                        </label>
                                        <input
                                            type="number"
                                            min="1900"
                                            max="2100"
                                            value={citeScoreYear}
                                            onChange={(e) => setCiteScoreYear(e.target.value)}
                                            placeholder="e.g., 2025"
                                            className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Journal Cover */}
                            <section className="border border-border bg-card p-6">
                                <h2 className="font-serif text-xl text-foreground mb-6">
                                    Journal Cover
                                </h2>
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        Upload a cover image for the journal (recommended size: 320x480px for 2:3 ratio)
                                    </p>

                                    {coverImagePreview ? (
                                        <div className="relative inline-block">
                                            <div
                                                className="bg-white p-1"
                                                style={{
                                                    width: '160px',
                                                    height: '240px',
                                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
                                                }}
                                            >
                                                <img
                                                    src={coverImagePreview}
                                                    alt="Journal Cover Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeCoverImage}
                                                className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/80"
                                            >
                                                Ã—
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleCoverImageChange}
                                                className="hidden"
                                            />
                                            <p className="text-sm text-muted-foreground">
                                                Click to upload cover image
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Editors Team */}
                            <section className="border border-border bg-card p-6">
                                <h2 className="font-serif text-xl text-foreground mb-6">
                                    Editors Team
                                </h2>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Select existing editor users to control who appears on homepage.
                                </p>
                                <div className="space-y-4 mb-6">
                                    {editorsTeam.map((editor, index) => (
                                        <div
                                            key={editor.user_id || `${editor.name}-${index}`}
                                            className="flex items-center justify-between p-4 bg-muted border border-border/50"
                                        >
                                            <div>
                                                <p className="font-medium text-foreground">{editor.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {editor.title || "Editor"}
                                                    {editor.institution ? ` - ${editor.institution}` : ""}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeEditor(index)}
                                                className="text-destructive hover:underline text-sm"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                                    <select
                                        value={selectedEditorProfileId}
                                        onChange={(e) => setSelectedEditorProfileId(e.target.value)}
                                        className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="">Select an editor user...</option>
                                        {availableEditorProfiles.map((profile) => (
                                            <option key={profile.id} value={profile.id}>
                                                {(profile.full_name || "Unnamed Admin") + (profile.institution ? ` - ${profile.institution}` : "")}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={addEditorFromProfile}
                                        disabled={!selectedEditorProfileId}
                                        className="bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-2 border border-border hover:bg-secondary/80 disabled:opacity-50"
                                    >
                                        Add Editor
                                    </button>
                                </div>
                            </section>

                            {/* Reviewers Team */}
                            <section className="border border-border bg-card p-6">
                                <h2 className="font-serif text-xl text-foreground mb-6">
                                    Reviewers Team
                                </h2>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Select existing reviewer users to control who appears on homepage.
                                </p>
                                <div className="space-y-4 mb-6">
                                    {reviewersTeam.map((reviewer, index) => (
                                        <div
                                            key={reviewer.user_id || `${reviewer.name}-${index}`}
                                            className="flex items-center justify-between p-4 bg-muted border border-border/50"
                                        >
                                            <div>
                                                <p className="font-medium text-foreground">{reviewer.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {reviewer.institution}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {reviewer.research_field}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeReviewer(index)}
                                                className="text-destructive hover:underline text-sm"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                                    <select
                                        value={selectedReviewerProfileId}
                                        onChange={(e) => setSelectedReviewerProfileId(e.target.value)}
                                        className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="">Select a reviewer user...</option>
                                        {availableReviewerProfiles.map((profile) => (
                                            <option key={profile.id} value={profile.id}>
                                                {(profile.full_name || "Unnamed Reviewer") + (profile.institution ? ` - ${profile.institution}` : "")}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={addReviewerFromProfile}
                                        disabled={!selectedReviewerProfileId}
                                        className="bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-2 border border-border hover:bg-secondary/80 disabled:opacity-50"
                                    >
                                        Add Reviewer
                                    </button>
                                </div>
                            </section>

                            {/* About Page Additional Content */}
                            <section className="border border-border bg-card p-6">
                                <h2 className="font-serif text-xl text-foreground mb-6">
                                    Additional About Page Content
                                </h2>
                                <div className="space-y-2">
                                    <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                        Additional Content (Markdown supported)
                                    </label>
                                    <textarea
                                        rows={8}
                                        value={aboutPageAdditional}
                                        onChange={(e) => setAboutPageAdditional(e.target.value)}
                                        placeholder="Add any additional content to display on the About page..."
                                        className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </section>

                            {/* Save Button */}
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-8 py-3 hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Save Settings"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
};

export default JournalSettings;
