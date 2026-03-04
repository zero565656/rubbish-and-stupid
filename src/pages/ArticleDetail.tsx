import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Article } from "@/types/database.types";
import { Copy, Download, FileText, ExternalLink } from "lucide-react";

const ArticleDetail = () => {
    const { id } = useParams<{ id: string }>();
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);
    const [copying, setCopying] = useState(false);

    useEffect(() => {
        if (id) {
            fetchArticle(id);
        }
    }, [id]);

    const fetchArticle = async (articleId: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from("articles")
            .select("*")
            .eq("id", articleId)
            .single();

        if (error || !data) {
            toast.error("Article not found");
            setLoading(false);
            return;
        }

        setArticle(data as Article);
        setLoading(false);
    };

    const handleCopyDoi = async () => {
        if (!article) return;
        setCopying(true);
        try {
            await navigator.clipboard.writeText(article.doi);
            toast.success("DOI copied to clipboard");
        } catch {
            toast.error("Failed to copy DOI");
        } finally {
            setCopying(false);
        }
    };

    const handleDownloadPdf = () => {
        if (article?.pdf_url) {
            window.open(article.pdf_url, "_blank");
        } else {
            toast.error("PDF not available");
        }
    };

    const generateCitation = () => {
        if (!article) return "";
        const year = new Date(article.published_date).getFullYear();
        return `${article.author} (${year}). ${article.title}. R&S Journal. DOI: ${article.doi}`;
    };

    const handleCopyCitation = async () => {
        try {
            await navigator.clipboard.writeText(generateCitation());
            toast.success("Citation copied to clipboard");
        } catch {
            toast.error("Failed to copy citation");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading article...</p>
                </div>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Article not found</p>
                    <Link to="/" className="text-primary hover:underline">
                        Return to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-6 py-4">
                    <Link to="/" className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                        ← Back to Articles
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12">
                <article className="max-w-4xl mx-auto">
                    {/* Title */}
                    <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-6">
                        {article.title}
                    </h1>

                    {/* Author */}
                    <div className="mb-6">
                        <p className="text-lg text-primary font-medium">
                            {article.author}
                        </p>
                    </div>

                    {/* DOI */}
                    <div className="flex items-center gap-4 mb-8 p-4 bg-muted border border-border/50">
                        <div className="flex-1">
                            <p className="text-xs font-sans uppercase tracking-widest text-muted-foreground mb-1">
                                DOI
                            </p>
                            <p className="font-mono text-sm text-foreground">
                                {article.doi}
                            </p>
                        </div>
                        <button
                            onClick={handleCopyDoi}
                            disabled={copying}
                            className="flex items-center gap-2 text-xs font-sans uppercase tracking-widest text-primary hover:underline"
                        >
                            <Copy className="w-4 h-4" />
                            {copying ? "Copying..." : "Copy"}
                        </button>
                    </div>

                    {/* Publication Date */}
                    <div className="mb-8">
                        <p className="text-sm text-muted-foreground">
                            Published: {new Date(article.published_date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </div>

                    {/* Tags */}
                    {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8">
                            {article.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="text-xs font-sans uppercase tracking-wider bg-primary/10 text-primary px-3 py-1 border border-primary/20"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4 mb-12">
                        <button
                            onClick={handleDownloadPdf}
                            disabled={!article.pdf_url}
                            className="flex items-center gap-2 bg-primary text-primary-foreground text-xs uppercase tracking-widest px-6 py-3 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF
                        </button>
                        <button
                            onClick={handleCopyCitation}
                            className="flex items-center gap-2 bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-6 py-3 border border-border hover:bg-secondary/80"
                        >
                            <Copy className="w-4 h-4" />
                            Copy Citation
                        </button>
                    </div>

                    {/* Citation Info */}
                    <div className="border-t border-border pt-8">
                        <h2 className="font-serif text-xl text-foreground mb-4">
                            Citation
                        </h2>
                        <div className="p-4 bg-muted border border-border/50">
                            <p className="font-mono text-sm text-foreground">
                                {generateCitation()}
                            </p>
                        </div>
                    </div>
                </article>
            </main>
        </div>
    );
};

export default ArticleDetail;
