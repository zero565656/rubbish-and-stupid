import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { JournalSettings as JournalSettingsType, EditorTeamMember, ReviewerTeamMember } from "@/types/database.types";
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
    const [editorsTeam, setEditorsTeam] = useState<EditorTeamMember[]>([]);
    const [reviewersTeam, setReviewersTeam] = useState<ReviewerTeamMember[]>([]);
    const [aboutPageAdditional, setAboutPageAdditional] = useState<string>("");

    // Editor form state
    const [newEditor, setNewEditor] = useState<EditorTeamMember>({
        name: "",
        title: "",
        institution: "",
        email: "",
    });

    // Reviewer form state
    const [newReviewer, setNewReviewer] = useState<ReviewerTeamMember>({
        name: "",
        institution: "",
        research_field: "",
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("journal_settings")
            .select("*")
            .limit(1)
            .single();

        if (!error && data) {
            const settingsData = data as JournalSettingsType;
            setSettings(settingsData);
            setImpactFactor(settingsData.impact_factor?.toString() || "");
            setImpactFactorYear(settingsData.impact_factor_year?.toString() || "");
            setEditorsTeam(settingsData.editors_team || []);
            setReviewersTeam(settingsData.reviewers_team || []);
            setAboutPageAdditional(settingsData.about_page_additional || "");
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings?.id) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from("journal_settings")
                .update({
                    impact_factor: impactFactor ? parseFloat(impactFactor) : null,
                    impact_factor_year: impactFactorYear ? parseInt(impactFactorYear) : null,
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

    const addEditor = () => {
        if (!newEditor.name || !newEditor.email) return;
        setEditorsTeam([...editorsTeam, newEditor]);
        setNewEditor({ name: "", title: "", institution: "", email: "" });
    };

    const removeEditor = (index: number) => {
        setEditorsTeam(editorsTeam.filter((_, i) => i !== index));
    };

    const addReviewer = () => {
        if (!newReviewer.name) return;
        setReviewersTeam([...reviewersTeam, newReviewer]);
        setNewReviewer({ name: "", institution: "", research_field: "" });
    };

    const removeReviewer = (index: number) => {
        setReviewersTeam(reviewersTeam.filter((_, i) => i !== index));
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
                                            Impact Factor
                                        </label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            min="0"
                                            value={impactFactor}
                                            onChange={(e) => setImpactFactor(e.target.value)}
                                            placeholder="e.g., 3.456"
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

                            {/* Editors Team */}
                            <section className="border border-border bg-card p-6">
                                <h2 className="font-serif text-xl text-foreground mb-6">
                                    Editors Team
                                </h2>
                                <div className="space-y-4 mb-6">
                                    {editorsTeam.map((editor, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-4 bg-muted border border-border/50"
                                        >
                                            <div>
                                                <p className="font-medium text-foreground">{editor.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {editor.title} - {editor.institution}
                                                </p>
                                                <p className="text-sm text-muted-foreground">{editor.email}</p>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        value={newEditor.name}
                                        onChange={(e) => setNewEditor({ ...newEditor, name: e.target.value })}
                                        className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Title (e.g., Editor-in-Chief)"
                                        value={newEditor.title}
                                        onChange={(e) => setNewEditor({ ...newEditor, title: e.target.value })}
                                        className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Institution"
                                        value={newEditor.institution}
                                        onChange={(e) => setNewEditor({ ...newEditor, institution: e.target.value })}
                                        className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={newEditor.email}
                                        onChange={(e) => setNewEditor({ ...newEditor, email: e.target.value })}
                                        className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={addEditor}
                                    disabled={!newEditor.name || !newEditor.email}
                                    className="mt-4 bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-2 border border-border hover:bg-secondary/80 disabled:opacity-50"
                                >
                                    Add Editor
                                </button>
                            </section>

                            {/* Reviewers Team */}
                            <section className="border border-border bg-card p-6">
                                <h2 className="font-serif text-xl text-foreground mb-6">
                                    Reviewers Team
                                </h2>
                                <div className="space-y-4 mb-6">
                                    {reviewersTeam.map((reviewer, index) => (
                                        <div
                                            key={index}
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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        value={newReviewer.name}
                                        onChange={(e) => setNewReviewer({ ...newReviewer, name: e.target.value })}
                                        className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Institution"
                                        value={newReviewer.institution}
                                        onChange={(e) => setNewReviewer({ ...newReviewer, institution: e.target.value })}
                                        className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Research Field"
                                        value={newReviewer.research_field}
                                        onChange={(e) => setNewReviewer({ ...newReviewer, research_field: e.target.value })}
                                        className="border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={addReviewer}
                                    disabled={!newReviewer.name}
                                    className="mt-4 bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-2 border border-border hover:bg-secondary/80 disabled:opacity-50"
                                >
                                    Add Reviewer
                                </button>
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
