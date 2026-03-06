import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Article } from "@/types/database.types";

// 鈹€鈹€ Predefined discipline tags 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const PRESET_TAGS = [
    "Computer Science",
    "Biology",
    "Physics",
    "Mathematics",
    "Chemistry",
    "Medicine",
    "Psychology",
    "Economics",
    "Environmental Science",
    "Engineering",
    "Philosophy",
    "Social Science",
    "Astronomy",
    "Neuroscience",
    "Materials Science",
];
const DEFAULT_ARTICLE_TYPES = [...PRESET_TAGS];

// 鈹€鈹€ Tag Picker 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const TagPicker = ({
    selected,
    onChange,
}: {
    selected: string[];
    onChange: (tags: string[]) => void;
}) => {
    const [custom, setCustom] = useState("");

    const toggle = (tag: string) => {
        if (selected.includes(tag)) {
            onChange(selected.filter((t) => t !== tag));
        } else {
            onChange([...selected, tag]);
        }
    };

    const addCustom = () => {
        const trimmed = custom.trim();
        if (!trimmed || selected.includes(trimmed)) return;
        onChange([...selected, trimmed]);
        setCustom("");
    };

    return (
        <div className="space-y-3">
            {/* Preset tags */}
            <div className="flex flex-wrap gap-2">
                {PRESET_TAGS.map((tag) => (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => toggle(tag)}
                        className={`text-xs px-3 py-1 border transition-colors font-sans ${selected.includes(tag)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                            }`}
                    >
                        {tag}
                    </button>
                ))}
            </div>

            {/* Custom tag input */}
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Add custom tag..."
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
                    className="flex-1 border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                    type="button"
                    onClick={addCustom}
                    className="text-xs px-4 py-1.5 border border-border hover:bg-muted transition-colors font-sans uppercase tracking-widest"
                >
                    Add
                </button>
            </div>

            {/* Selected tags preview */}
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selected.map((tag) => (
                        <span
                            key={tag}
                            className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 border border-primary/20"
                        >
                            {tag}
                            <button
                                type="button"
                                onClick={() => onChange(selected.filter((t) => t !== tag))}
                                className="hover:text-destructive leading-none"
                            >
                                脳
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

// 鈹€鈹€ Article Form (used for both Add and Edit) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
type FormData = {
    title: string;
    author: string;
    article_type: string;
    institution: string;
    doi: string;
    published_date: string;
    pdf_url: string;
    tags: string[];
};

const EMPTY_FORM: FormData = {
    title: "",
    author: "",
    article_type: "",
    institution: "",
    doi: "",
    published_date: new Date().toISOString().split("T")[0],
    pdf_url: "",
    tags: [],
};

const ArticleModal = ({
    article,
    onClose,
    onSave,
}: {
    article: Article | null; // null = create new
    onClose: () => void;
    onSave: () => void;
}) => {
    const [form, setForm] = useState<FormData>(
        article
            ? {
                title: article.title,
                author: article.author,
                article_type: article.article_type ?? "",
                institution: article.institution ?? "",
                doi: article.doi,
                published_date: article.published_date,
                pdf_url: article.pdf_url ?? "",
                tags: article.tags ?? [],
            }
            : EMPTY_FORM
    );
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                title: form.title,
                author: form.author,
                article_type: form.article_type || null,
                institution: form.institution || null,
                doi: form.doi,
                published_date: form.published_date,
                pdf_url: form.pdf_url || null,
                tags: form.tags,
            };

            if (article) {
                // Update
                const { error } = await supabase
                    .from("articles")
                    .update(payload as any)
                    .eq("id", article.id);
                if (error) throw error;
                toast.success("Article updated.");
            } else {
                // Insert
                const { error } = await supabase
                    .from("articles")
                    .insert([payload] as any);
                if (error) throw error;
                toast.success("Article added to journal.");
            }
            onSave();
            onClose();
        } catch (err: any) {
            toast.error(`Failed: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10">
            <div className="border border-border bg-card w-full max-w-2xl mx-4 p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl text-foreground">
                        {article ? "Edit Article" : "Add New Article"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground text-2xl leading-none"
                    >
                        脳
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Title */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                            Title *
                        </label>
                        <input
                            required
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {/* Author */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                            Author(s) *
                        </label>
                        <input
                            required
                            value={form.author}
                            onChange={(e) => setForm({ ...form, author: e.target.value })}
                            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {/* Article Type + Institution */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                Article Type
                            </label>
                            <input
                                value={form.article_type}
                                onChange={(e) => setForm({ ...form, article_type: e.target.value })}
                                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="e.g., Computer Science"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                Institution
                            </label>
                            <input
                                value={form.institution}
                                onChange={(e) => setForm({ ...form, institution: e.target.value })}
                                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="e.g., University of Example"
                            />
                        </div>
                    </div>

                    {/* DOI + Date in a row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                DOI *
                            </label>
                            <input
                                required
                                value={form.doi}
                                onChange={(e) => setForm({ ...form, doi: e.target.value })}
                                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                                Published Date *
                            </label>
                            <input
                                required
                                type="date"
                                value={form.published_date}
                                onChange={(e) => setForm({ ...form, published_date: e.target.value })}
                                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    {/* PDF URL */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                            PDF URL (optional)
                        </label>
                        <input
                            type="url"
                            value={form.pdf_url}
                            onChange={(e) => setForm({ ...form, pdf_url: e.target.value })}
                            placeholder="https://..."
                            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {/* Tags */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                            Discipline Tags
                        </label>
                        <TagPicker
                            selected={form.tags}
                            onChange={(tags) => setForm({ ...form, tags })}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-8 py-3 hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {saving ? "Saving..." : article ? "Save Changes" : "Add Article"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="border border-border text-xs uppercase tracking-widest px-6 py-3 hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// 鈹€鈹€ Main ArticlesManager component 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const ArticlesManager = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingArticleTypeLibrary, setLoadingArticleTypeLibrary] = useState(true);
    const [editingArticle, setEditingArticle] = useState<Article | "new" | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [articleTypeSettingsId, setArticleTypeSettingsId] = useState<string>("");
    const [articleTypeLibrary, setArticleTypeLibrary] = useState<string[]>(DEFAULT_ARTICLE_TYPES);
    const [savingArticleTypeLibrary, setSavingArticleTypeLibrary] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterTag, setFilterTag] = useState<string>("all");

    const fetchArticles = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("articles")
            .select("*")
            .order("published_date", { ascending: false });

        if (error) {
            toast.error("Failed to fetch articles.");
        } else {
            setArticles((data as unknown as Article[]) || []);
        }
        setLoading(false);
    };

    const fetchArticleTypeLibrary = async () => {
        setLoadingArticleTypeLibrary(true);
        const { data, error } = await supabase
            .from("journal_settings")
            .select("id, article_type_library")
            .limit(1)
            .maybeSingle();

        if (error) {
            toast.error(`Failed to load article type library: ${error.message}`);
            setArticleTypeLibrary(DEFAULT_ARTICLE_TYPES);
            setLoadingArticleTypeLibrary(false);
            return;
        }

        if (!data?.id) {
            const { data: inserted, error: insertError } = await supabase
                .from("journal_settings")
                .insert([{ article_type_library: DEFAULT_ARTICLE_TYPES }] as any)
                .select("id, article_type_library")
                .single();

            if (insertError) {
                toast.error(`Failed to initialize article type library: ${insertError.message}`);
                setArticleTypeLibrary(DEFAULT_ARTICLE_TYPES);
                setLoadingArticleTypeLibrary(false);
                return;
            }

            setArticleTypeSettingsId(inserted.id);
            const initialLibrary = (inserted as any).article_type_library || DEFAULT_ARTICLE_TYPES;
            setArticleTypeLibrary(initialLibrary.length > 0 ? initialLibrary : DEFAULT_ARTICLE_TYPES);
            setLoadingArticleTypeLibrary(false);
            return;
        }

        setArticleTypeSettingsId((data as any).id);
        const dbLibrary = ((data as any).article_type_library || []) as string[];
        setArticleTypeLibrary(dbLibrary.length > 0 ? dbLibrary : DEFAULT_ARTICLE_TYPES);
        setLoadingArticleTypeLibrary(false);
    };

    const saveArticleTypeLibrary = async () => {
        if (!articleTypeSettingsId) {
            toast.error("Journal settings record not found. Please reload this page.");
            return;
        }

        const normalized = Array.from(
            new Set(
                articleTypeLibrary
                    .map((item) => item.trim())
                    .filter((item) => item.length > 0)
            )
        );

        if (normalized.length === 0) {
            toast.error("Article type library cannot be empty.");
            return;
        }

        setSavingArticleTypeLibrary(true);
        const { error } = await supabase
            .from("journal_settings")
            .update({ article_type_library: normalized } as any)
            .eq("id", articleTypeSettingsId);

        if (error) {
            toast.error(`Failed to save article type library: ${error.message}`);
        } else {
            setArticleTypeLibrary(normalized);
            toast.success("Global article type library saved.");
        }
        setSavingArticleTypeLibrary(false);
    };

    useEffect(() => {
        fetchArticles();
        fetchArticleTypeLibrary();
    }, []);

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        const { error } = await supabase.from("articles").delete().eq("id", id);
        if (error) {
            toast.error(`Delete failed: ${error.message}`);
        } else {
            toast.success("Article removed from journal.");
            setArticles((prev) => prev.filter((a) => a.id !== id));
        }
        setDeletingId(null);
    };

    // Gather all unique tags across articles for filter dropdown
    const allTags = useMemo(() => {
        const articleTags = articles.flatMap((a) => a.tags ?? []);
        return Array.from(new Set([...articleTags, ...articleTypeLibrary])).sort();
    }, [articles, articleTypeLibrary]);

    // Filter by search + tag
    const filtered = articles.filter((a) => {
        const matchesSearch =
            !searchQuery ||
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.author.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTag = filterTag === "all" || (a.tags ?? []).includes(filterTag);
        return matchesSearch && matchesTag;
    });

    return (
        <>
            {/* Article Add/Edit Modal */}
            {editingArticle !== null && (
                <ArticleModal
                    article={editingArticle === "new" ? null : editingArticle}
                    onClose={() => setEditingArticle(null)}
                    onSave={fetchArticles}
                />
            )}

            {/* Header row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h2 className="font-serif text-2xl md:text-3xl text-foreground">
                    Articles{" "}
                    <span className="text-muted-foreground font-sans text-base font-normal">
                        ({articles.length})
                    </span>
                </h2>
                <button
                    onClick={() => setEditingArticle("new")}
                    className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-6 py-3 hover:bg-primary/90 transition-colors"
                >
                    + Add Article
                </button>
            </div>

            {/* Global Article Type Library */}
            <div className="border border-border bg-card p-6 mb-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="font-serif text-xl text-foreground">Global Article Type Library</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            This list is used by the submission form Article Type dropdown.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={saveArticleTypeLibrary}
                        disabled={loadingArticleTypeLibrary || savingArticleTypeLibrary}
                        className="bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-2 border border-border hover:bg-secondary/80 disabled:opacity-50"
                    >
                        {savingArticleTypeLibrary ? "Saving..." : "Save Types"}
                    </button>
                </div>

                {loadingArticleTypeLibrary ? (
                    <p className="text-sm text-muted-foreground animate-pulse">Loading article type library...</p>
                ) : (
                    <TagPicker selected={articleTypeLibrary} onChange={setArticleTypeLibrary} />
                )}
            </div>

            {/* Filter bar */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <input
                    type="text"
                    placeholder="Search by title or author..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <select
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    className="md:w-52 border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    <option value="all">All Disciplines</option>
                    {allTags.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
            </div>

            {/* Article list */}
            {loading ? (
                <div className="py-20 text-center text-muted-foreground animate-pulse font-sans">
                    Loading articles...
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-border">
                    <p className="font-sans text-muted-foreground">No articles found.</p>
                </div>
            ) : (
                <div className="space-y-0 border border-border divide-y divide-border">
                    {filtered.map((article) => (
                        <div
                            key={article.id}
                            className="p-5 flex flex-col md:flex-row md:items-start gap-4 justify-between hover:bg-muted/30 transition-colors"
                        >
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-serif text-base text-foreground leading-snug mb-1 truncate">
                                    {article.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-sans mb-3">
                                    <span>{article.author}</span>
                                    {article.article_type && <span>Type: {article.article_type}</span>}
                                    {article.institution && <span>Institution: {article.institution}</span>}
                                    <span className="font-mono">{article.doi}</span>
                                    <span>{article.published_date}</span>
                                    {article.pdf_url && (
                                        <a
                                            href={article.pdf_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary hover:underline"
                                        >
                                            PDF
                                        </a>
                                    )}
                                </div>
                                {/* Tags */}
                                {(article.tags ?? []).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {(article.tags ?? []).map((tag) => (
                                            <span
                                                key={tag}
                                                className="text-[10px] font-sans uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 border border-primary/20"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => setEditingArticle(article)}
                                    className="text-xs font-sans uppercase tracking-widest border border-border px-4 py-2 hover:bg-muted transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(article.id)}
                                    disabled={deletingId === article.id}
                                    className="text-xs font-sans uppercase tracking-widest border border-destructive/50 text-destructive px-4 py-2 hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50"
                                >
                                    {deletingId === article.id ? "..." : "Delete"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

export default ArticlesManager;
