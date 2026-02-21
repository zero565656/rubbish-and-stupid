import { toast } from "sonner";

const articles = [
  {
    title: "A Quantitative Analysis of Staring at the Ceiling During Work Hours.",
    author: "Dr. I. M. Tired, et al.",
    doi: "10.rubbish/staring.001",
    date: "2025-01-15",
  },
  {
    title: "Why My Code Works: An Unsolved Mystery in Modern Computer Science.",
    author: "StackOverflow Copy-Paster",
    doi: "10.stupid/magic.404",
    date: "2025-02-03",
  },
  {
    title: "The Ontological Implications of Forgetting What You Were About to Say.",
    author: "John Doe (Currently confused)",
    doi: "10.rubbish/blank.999",
    date: "2025-03-22",
  },
];

const ArticleList = () => {
  const handleDownload = () => {
    toast.error("Error 418: I'm a teapot. Also, this paper is garbage.");
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
          {articles.map((article, i) => (
            <article key={i} className="py-8 first:pt-0 last:pb-0">
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
                    DOI: {article.doi} · Published {article.date}
                  </p>
                </div>

                <button
                  onClick={handleDownload}
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
