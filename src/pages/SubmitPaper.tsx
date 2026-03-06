import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import JournalHeader from "@/components/JournalHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const DEFAULT_ARTICLE_TYPES = [
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

const formSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    author: z.string().min(2, "Author name is required"),
    article_type: z.string().min(1, "Article type is required"),
    institution: z.string().min(2, "Institution is required"),
    abstract: z.string().min(50, "Abstract must be at least 50 characters"),
    pdf: z.instanceof(File, { message: "Academic PDF is required" }),
});

type FormValues = z.infer<typeof formSchema>;

const SubmitPaper = () => {
    const { user, profile } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [articleTypeOptions, setArticleTypeOptions] = useState<string[]>([]);
    const [loadingArticleTypes, setLoadingArticleTypes] = useState(true);

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    const fetchArticleTypeOptions = async () => {
        setLoadingArticleTypes(true);

        const { data: settingsData, error: settingsError } = await supabase
            .from("journal_settings")
            .select("article_type_library")
            .limit(1)
            .maybeSingle();

        if (settingsError) {
            toast.error(`Failed to load article types: ${settingsError.message}`);
            setArticleTypeOptions(DEFAULT_ARTICLE_TYPES);
            setLoadingArticleTypes(false);
            return;
        }

        const library = ((settingsData as any)?.article_type_library || []) as string[];
        const normalizedLibrary = Array.from(
            new Set(
                library
                    .map((item) => item?.trim())
                    .filter((item) => Boolean(item))
            )
        ).sort((a, b) => a.localeCompare(b));

        if (normalizedLibrary.length > 0) {
            setArticleTypeOptions(normalizedLibrary);
            setLoadingArticleTypes(false);
            return;
        }

        // Fallback for older projects where global library is empty.
        const { data: articleTagData, error: articleTagError } = await supabase
            .from("articles")
            .select("tags");

        if (articleTagError) {
            toast.error(`Failed to load article tags fallback: ${articleTagError.message}`);
            setArticleTypeOptions(DEFAULT_ARTICLE_TYPES);
            setLoadingArticleTypes(false);
            return;
        }

        const allTags = (articleTagData || []).flatMap((row: any) => row.tags || []);
        const normalizedTags = Array.from(
            new Set(
                allTags
                    .map((tag: string) => tag?.trim())
                    .filter((tag: string) => Boolean(tag))
            )
        ).sort((a, b) => a.localeCompare(b));

        setArticleTypeOptions(normalizedTags.length > 0 ? normalizedTags : DEFAULT_ARTICLE_TYPES);
        setLoadingArticleTypes(false);
    };

    useEffect(() => {
        if (!user?.id) return;
        fetchArticleTypeOptions();
    }, [user?.id]);

    useEffect(() => {
        if (!profile?.institution) return;
        if (getValues("institution")) return;
        setValue("institution", profile.institution, { shouldValidate: false });
    }, [profile?.institution, getValues, setValue]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== "application/pdf") {
                toast.error("Only PDF files are allowed.");
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error("File size must be less than 10MB.");
                return;
            }
            setFileName(file.name);
            setValue("pdf", file, { shouldValidate: true });
        }
    };

    const onSubmit = async (data: FormValues) => {
        if (!user) {
            toast.error("Please log in before submitting a paper.");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Upload PDF to Storage
            const fileExt = data.pdf.name.split(".").pop();
            const randomName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `submissions/${randomName}`;

            const { error: uploadError } = await supabase.storage
                .from("paper_submissions")
                .upload(filePath, data.pdf);

            if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

            // 2. Insert record into database
            const { error: dbError } = await supabase.from("submissions").insert({
                title: data.title,
                author: data.author,
                article_type: data.article_type,
                institution: data.institution,
                abstract: data.abstract,
                pdf_path: filePath,
                status: "pending",
                author_id: user.id,
            } as any);

            if (dbError) throw new Error(`Database error: ${dbError.message}`);

            toast.success("Paper submitted successfully for peer (cat) review.");
            setIsSuccess(true);
            reset();
            setFileName(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to submit paper.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <JournalHeader />
                <main className="flex-1 container mx-auto px-6 py-24 max-w-2xl flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-8">
                        <svg
                            className="w-10 h-10 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                    <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                        Submission Received
                    </h1>
                    <p className="font-sans text-muted-foreground mb-10 leading-relaxed">
                        Your manuscript has been sent to our esteemed panel of reviewers.
                        Please allow 4-6 decades for a response.
                    </p>
                    <button
                        onClick={() => setIsSuccess(false)}
                        className="text-sm font-sans uppercase tracking-widest border border-border px-6 py-3 hover:bg-muted transition-colors"
                    >
                        Submit Another Paper
                    </button>
                </main>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <JournalHeader />
                <main className="flex-1 container mx-auto px-6 py-24 max-w-2xl flex flex-col items-center justify-center text-center">
                    <h1 className="font-serif text-3xl text-foreground mb-4">Login Required</h1>
                    <p className="font-sans text-muted-foreground mb-8">
                        You need an author account to submit a manuscript.
                    </p>
                    <div className="flex gap-4">
                        <Link
                            to="/admin/login"
                            className="text-sm font-sans uppercase tracking-widest border border-border px-6 py-3 hover:bg-muted transition-colors"
                        >
                            Log In
                        </Link>
                        <Link
                            to="/register-author"
                            className="text-sm font-sans uppercase tracking-widest bg-primary text-primary-foreground px-6 py-3 hover:bg-primary/90 transition-colors"
                        >
                            Register
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <JournalHeader />

            <main className="flex-1 container mx-auto px-6 py-16 max-w-3xl">
                <div className="mb-12">
                    <p className="text-xs font-sans uppercase tracking-[0.3em] text-muted-foreground mb-4">
                        Call for Papers
                    </p>
                    <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight text-foreground mb-6">
                        Submit Your Manuscript.
                    </h1>
                    <p className="font-sans text-base text-muted-foreground leading-relaxed max-w-xl">
                        Ensure your work strictly adheres to our formatting guidelines. Any deviation will result in immediate desk rejection.
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="space-y-2">
                        <label className="text-sm font-sans font-medium text-foreground uppercase tracking-wider">
                            Paper Title
                        </label>
                        <input
                            {...register("title")}
                            className={`w-full bg-transparent border-b ${errors.title ? "border-destructive focus:border-destructive" : "border-border focus:border-foreground"} pb-2 outline-none transition-colors font-serif text-lg md:text-xl placeholder:text-muted/50`}
                            placeholder="e.g., A Quantitative Analysis of Staring at the Ceiling"
                        />
                        {errors.title && (
                            <p className="text-xs text-destructive">{errors.title.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-sans font-medium text-foreground uppercase tracking-wider">
                            Author(s)
                        </label>
                        <input
                            {...register("author")}
                            className={`w-full bg-transparent border-b ${errors.author ? "border-destructive focus:border-destructive" : "border-border focus:border-foreground"} pb-2 outline-none transition-colors font-serif text-lg placeholder:text-muted/50`}
                            placeholder="e.g., Dr. I. M. Tired, et al."
                        />
                        {errors.author && (
                            <p className="text-xs text-destructive">{errors.author.message}</p>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-sans font-medium text-foreground uppercase tracking-wider">
                                Article Type
                            </label>
                            <select
                                {...register("article_type")}
                                disabled={loadingArticleTypes || articleTypeOptions.length === 0}
                                className={`w-full bg-transparent border ${errors.article_type ? "border-destructive focus:border-destructive" : "border-border focus:border-foreground"} p-3 outline-none transition-colors font-sans text-base disabled:opacity-60`}
                            >
                                <option value="">
                                    {loadingArticleTypes ? "Loading tags from backend..." : "Select article type"}
                                </option>
                                {articleTypeOptions.map((tag) => (
                                    <option key={tag} value={tag}>
                                        {tag}
                                    </option>
                                ))}
                            </select>
                            {articleTypeOptions.length === 0 && !loadingArticleTypes && (
                                <p className="text-xs text-muted-foreground">
                                    No article tags configured in backend yet. Please add tags in Admin Articles first.
                                </p>
                            )}
                            {errors.article_type && (
                                <p className="text-xs text-destructive">{errors.article_type.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-sans font-medium text-foreground uppercase tracking-wider">
                                Institution
                            </label>
                            <input
                                {...register("institution")}
                                className={`w-full bg-transparent border-b ${errors.institution ? "border-destructive focus:border-destructive" : "border-border focus:border-foreground"} pb-2 outline-none transition-colors font-serif text-lg placeholder:text-muted/50`}
                                placeholder="e.g., University of Rubbish Studies"
                            />
                            {errors.institution && (
                                <p className="text-xs text-destructive">{errors.institution.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-sans font-medium text-foreground uppercase tracking-wider">
                            Abstract
                        </label>
                        <textarea
                            {...register("abstract")}
                            rows={5}
                            className={`w-full bg-transparent border ${errors.abstract ? "border-destructive focus:border-destructive" : "border-border focus:border-foreground"} p-4 outline-none transition-colors font-sans text-base placeholder:text-muted/50 resize-y`}
                            placeholder="Briefly summarize your findings in 50 words or more..."
                        />
                        {errors.abstract && (
                            <p className="text-xs text-destructive">{errors.abstract.message}</p>
                        )}
                    </div>

                    <div className="space-y-2 pt-4">
                        <label className="text-sm font-sans font-medium text-foreground uppercase tracking-wider block mb-2">
                            Manuscript File (PDF)
                        </label>
                        <div className={`border-2 border-dashed ${errors.pdf ? "border-destructive bg-destructive/5" : "border-border hover:border-foreground/50"} rounded-lg p-8 transition-colors text-center relative`}>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="space-y-2 pointer-events-none">
                                <svg className="mx-auto h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                {fileName ? (
                                    <p className="text-sm font-medium text-foreground">{fileName}</p>
                                ) : (
                                    <>
                                        <p className="text-sm text-foreground">Click or drag PDF here to upload</p>
                                        <p className="text-xs text-muted-foreground">Max size: 10MB</p>
                                    </>
                                )}
                            </div>
                        </div>
                        {errors.pdf && (
                            <p className="text-xs text-destructive">{errors.pdf.message}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || loadingArticleTypes || articleTypeOptions.length === 0}
                        className="w-full bg-primary text-primary-foreground font-sans text-sm uppercase tracking-widest px-8 py-5 border-2 border-primary hover:bg-background hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        {isSubmitting ? "Submitting to Reviewers..." : "Submit Manuscript"}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default SubmitPaper;
