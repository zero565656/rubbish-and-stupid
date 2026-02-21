import { toast } from "sonner";
import { useArticles } from "@/hooks/useArticles";

// Skeleton placeholder shown while loading
const ArticleSkeleton = () => (
  <article className="py-8 first:pt-0 last:pb-0 animate-pulse">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div className="flex-1 space-y-2">
        <div className="h-5 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/3" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
      <div className="h-9 w-32 bg-muted rounded self-start" />
    </div>
  </article>
);

const ArticleList = () => {
  const { data: articles, isLoading, isError, error } = useArticles();

  const handleDownload = (pdfUrl: string | null) => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    } else {
      toast.error("Error 418: I'm a teapot. Also, this paper is garbage.");
    }
  };

  return (
    <section className="border-b border-border">
      <div className="container mx-auto px-6 py-16 md:py-20">
        <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
          Table of Contents
        </h2>
        <p className="text-xs font-sans uppercase tracking-[0.3em] text-muted-foreground mb-10">
          Current Issue · Original Research
        </p>

        <div className="divide-y divide-border">
          {isLoading && (
            <>
              <ArticleSkeleton />
              <ArticleSkeleton />
              <ArticleSkeleton />
            </>
          )}

          {isError && (
            <p className="py-8 font-sans text-sm text-destructive">
              Failed to load articles: {error.message}
            </p>
          )}

          {articles?.map((article) => (
            <article key={article.id} className="py-8 first:pt-0 last:pb-0">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-serif text-lg md:text-xl text-foreground mb-2 cursor-default group">
                    <span className="bg-[length:0%_1px] bg-no-repeat bg-left-bottom bg-gradient-to-r from-foreground to-foreground transition-[background-size] duration-500 hover:bg-[length:100%_1px] pb-0.5">
                      {article.title}
                    </span>
                  </h3>
                  <p className="font-sans text-sm text-muted-foreground mb-1">
                    {article.author}
                  </p>
                  <p className="font-sans text-xs text-muted-foreground">
                    DOI: {article.doi} · Published {article.published_date}
                  </p>
                </div>

                <button
                  onClick={() => handleDownload(article.pdf_url)}
                  className="self-start font-sans text-xs uppercase tracking-widest border border-border px-5 py-2.5 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors duration-300 whitespace-nowrap"
                >
                  Download PDF
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ArticleList;
