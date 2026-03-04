import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import JournalHeader from "@/components/JournalHeader";

const formSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    author: z.string().min(2, "Author name is required"),
    abstract: z.string().min(50, "Abstract must be at least 50 characters"),
    pdf: z.instanceof(File, { message: "Academic PDF is required" }),
});

type FormValues = z.infer<typeof formSchema>;

const SubmitPaper = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

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
                abstract: data.abstract,
                pdf_path: filePath,
                status: "pending",
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
                        disabled={isSubmitting}
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
