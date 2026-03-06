import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useArticles } from "@/hooks/useArticles";
import { SearchBar } from "./SearchBar";

// Skeleton placeholder shown while loading
const ArticleSkeleton = () => (
  <article className="py-10 border-b-2 border-dashed border-gray-200 last:border-none animate-pulse">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
      <div className="flex-shrink-0 w-12 md:w-20 pt-1">
        <div className="h-12 w-16 bg-muted rounded" />
      </div>
      <div className="flex-1 space-y-4">
        <div className="h-8 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
      <div className="h-10 w-36 bg-muted self-start border-2 border-border" />
    </div>
  </article>
);

const ArticleList = () => {
  const { data: articles, isLoading, isError, error } = useArticles();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Filter articles based on search query
  const filteredArticles = articles?.filter((article) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(query) ||
      article.author.toLowerCase().includes(query) ||
      article.doi.toLowerCase().includes(query) ||
      (article.tags && article.tags.some((tag) => tag.toLowerCase().includes(query)))
    );
  });

  const handleDownload = (pdfUrl: string | null) => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    } else {
      toast.error("Error 418: I'm a teapot. Also, this paper is garbage.");
    }
  };

  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">

        {/* Title Bar - 90s Newspaper layout */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-4">
          <div>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-[#111111] uppercase tracking-tight">
              IN THIS ISSUE
            </h2>
          </div>
          <div className="text-left md:text-right">
            <p className="font-mono text-sm uppercase tracking-[0.2em] text-[#1a4c3b] font-bold pb-1.5">
              VOL. 2026 / GARBAGE COLLECTION
            </p>
          </div>
        </div>

        {/* Thick divider line */}
        <div className="w-full h-[6px] bg-[#1a4c3b] mb-12" />

        {/* Search Bar */}
        <div className="mb-14">
          <SearchBar onSearch={handleSearch} placeholder="Search for specific nonsense..." />
          {searchQuery && (
            <p className="text-sm font-mono text-gray-500 mt-3 uppercase tracking-wide">
              Showing {filteredArticles?.length || 0} result{filteredArticles?.length !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
          )}
        </div>

        <div className="flex flex-col gap-10">
          {isLoading && (
            <>
              <ArticleSkeleton />
              <ArticleSkeleton />
              <ArticleSkeleton />
            </>
          )}

          {isError && (
            <p className="py-8 font-mono font-bold text-sm text-red-600 bg-red-50 p-4 border-l-4 border-red-600">
              FAILED TO LOAD ARTICLES: {error.message}
            </p>
          )}

          {filteredArticles?.length === 0 && searchQuery && !isLoading && (
            <div className="py-16 px-8 text-center border-4 border-dashed border-gray-200 bg-gray-50/50">
              <p className="font-mono font-bold text-lg text-gray-600 mb-4 uppercase tracking-wider">No nonsense found matching "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery("")}
                className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-[#1a4c3b] border-b-2 border-[#1a4c3b] pb-1 hover:text-[#111111] hover:border-[#111111] transition-colors"
              >
                Clear Search & View All
              </button>
            </div>
          )}

          {filteredArticles?.map((article, index) => (
            <article key={article.id} className="group flex flex-col md:flex-row gap-6 md:gap-8 items-start relative pb-10 border-b-2 border-dashed border-gray-200 last:border-none">

              {/* Large Serif Number */}
              <div className="flex-shrink-0 w-12 md:w-20 pt-1">
                <span className="font-serif text-4xl md:text-5xl font-bold text-gray-300 group-hover:text-[#1a4c3b] transition-colors duration-300 selection:bg-transparent">
                  {(index + 1).toString().padStart(2, '0')}
                </span>
              </div>

              <div className="flex-1 flex flex-col md:flex-row md:items-start md:justify-between gap-6 w-full">
                <div className="flex-1">
                  <h3 className="font-serif text-2xl md:text-3xl font-bold text-[#111111] leading-tight mb-4">
                    <Link
                      to={`/article/${article.id}`}
                      className="bg-[length:0%_2px] bg-no-repeat bg-left-bottom bg-gradient-to-r from-[#1a4c3b] to-[#1a4c3b] transition-[background-size] duration-300 hover:bg-[length:100%_2px] pb-1"
                    >
                      {article.title}
                    </Link>
                  </h3>

                  <p className="font-mono text-sm tracking-wide text-[#1a4c3b] font-bold mb-2">
                    {article.author}
                  </p>
                  <p className="font-mono text-xs tracking-wider text-gray-500 mb-5">
                    DOI: {article.doi} <span className="mx-2">|</span> Published {article.published_date}
                  </p>

                  {/* Display tags if present */}
                  {(article.tags && article.tags.length > 0) && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {article.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-sans font-bold uppercase tracking-widest bg-gray-100 text-gray-600 px-2 py-1 border border-gray-300 group-hover:bg-[#1a4c3b]/5 group-hover:text-[#1a4c3b] group-hover:border-[#1a4c3b]/20 transition-colors"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="self-start md:self-center mt-4 md:mt-0 flex-shrink-0">
                  <button
                    onClick={() => handleDownload(article.pdf_url)}
                    className="font-sans text-xs font-bold uppercase tracking-[0.15em] border-2 border-[#1a4c3b] text-[#1a4c3b] px-6 py-3 hover:bg-[#1a4c3b] hover:text-white transition-all duration-300 whitespace-nowrap active:scale-95"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Decorative page end */}
      <div className="relative mt-16 w-screen left-1/2 right-1/2 -mx-[50vw]">
        <div className="relative">
          <div className="border-t-4 border-[#1a2a22]" />
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-4 text-[#1a2a22] text-sm">♦</div>
        </div>
      </div>
    </section>
  );
};

export default ArticleList;
