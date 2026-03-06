import { Link } from "react-router-dom";
import { useFeaturedNonsense } from "@/hooks/useFeaturedNonsense";
import { Trash2 } from "lucide-react";

const fallbackTitle = "The Aerodynamics of Dropping Buttered Toast: A Stochastic Approach to Carpet Ruin";
const fallbackAuthor = "Dr. I. M. Clumsy";
const fallbackSummary = "We prove that the probability of landing face-down is proportional to carpet cost.";
const fallbackComment = "Reviewer #2: My cat is now stuck in a perpetual motion loop. Please retract immediately.";

const JournalScope = () => {
  const { data } = useFeaturedNonsense();
  const article = data?.article;
  const topComment = data?.topComment;

  const articleTitle = article?.title || fallbackTitle;
  const articleAuthor = article?.author || fallbackAuthor;
  const articleSummary = `${articleAuthor}. ${fallbackSummary}`;
  const helpfulCount = topComment?.helpful_count ?? 14200;
  const helpfulText = helpfulCount >= 1000 ? `${(helpfulCount / 1000).toFixed(1)}k` : `${helpfulCount}`;

  return (
    <section className="bg-[#f0ede5] relative overflow-hidden">
      {/* Background noise/texture simulation (optional subtle pattern) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <div className="max-w-7xl mx-auto py-16 px-6 relative z-10">
        <div className="grid md:grid-cols-3 gap-8 md:gap-10">

          {/* Main "Nonsense" Card with 90s newspaper clipping style */}
          <div className="md:col-span-2 bg-[#fdfbf6] p-8 lg:p-12 border-4 border-double border-[#1a4c3b] shadow-[6px_6px_0px_#1a4c3b] relative">

            {/* The Stamp Graphic */}
            <div className="absolute top-4 right-4 md:top-8 md:right-8 transform rotate-[15deg] opacity-80 pointer-events-none select-none z-0">
              <div className="border-4 border-[#b91c1c] text-[#b91c1c] text-xl md:text-2xl font-black font-sans uppercase tracking-[0.2em] px-4 py-2 border-dashed opacity-80 mix-blend-multiply flex items-center justify-center">
                <span className="transform -rotate-[5deg]">100% RUBBISH</span>
              </div>
            </div>

            <h2 className="relative z-10 flex items-center text-3xl md:text-4xl font-serif font-bold text-black mb-8 tracking-tight">
              本刊最
              <div className="relative group mx-3 -translate-y-[2px]">
                <div className="relative z-10 transform transition-all duration-300 group-hover:scale-125 group-hover:-rotate-12 cursor-pointer text-[#E63946] drop-shadow-sm group-hover:drop-shadow-md">
                  <Trash2 className="w-8 h-8 md:w-10 md:h-10" />
                </div>
                {/* Hidden Tooltip */}
                <div className="absolute left-1/2 -top-12 -translate-x-1/2 w-max px-3 py-1.5 bg-black/90 text-white text-xs font-sans rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-3 group-hover:-translate-y-1 shadow-lg pointer-events-none border border-white/20">
                  真的全是垃圾
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black/90 rotate-45 border-b border-r border-white/20"></div>
                </div>
              </div>
              文章
            </h2>

            <div className="relative z-10 border-t border-b border-[#1a4c3b]/30 py-6 mb-6">
              {article?.id ? (
                <Link to={`/article/${article.id}`} className="font-serif text-2xl lg:text-3xl italic leading-tight text-[#111111] mb-4 block hover:underline hover:text-[#1a4c3b] transition-colors decoration-[#1a4c3b] decoration-2 underline-offset-4">
                  {articleTitle}
                </Link>
              ) : (
                <h3 className="font-serif text-2xl lg:text-3xl italic leading-tight text-[#111111] mb-4">{articleTitle}</h3>
              )}

              <p className="font-sans text-sm font-semibold tracking-wider uppercase text-gray-500 mb-1">
                By {articleAuthor}
              </p>
              <p className="font-serif text-base text-gray-800 leading-relaxed mt-4">
                {fallbackSummary} {/* Note: Original appended author to summary, split them for better newspaper look */}
              </p>
            </div>

            <blockquote className="relative z-10 bg-[#f4f1e8] border-l-4 border-[#1a4c3b] p-6 text-[#1a2a22] font-serif italic text-lg shadow-inner">
              <span className="text-4xl text-[#1a4c3b] absolute -top-2 left-2 opacity-50">&ldquo;</span>
              <p className="pl-6">{topComment?.content || fallbackComment}</p>
              <span className="text-4xl text-[#1a4c3b] absolute -bottom-6 right-4 opacity-50">&rdquo;</span>
            </blockquote>
            <p className="relative z-10 font-bold text-xs mt-4 tracking-widest uppercase text-[#1a4c3b]">▲ {helpfulText} Peer Reviewers Agree</p>
          </div>

          {/* Dark Sidebar "Aims & Scope" */}
          <div className="md:col-span-1 bg-[#1a4c3b] text-[#fdfbf6] p-8 lg:p-10 shadow-[6px_6px_0px_#111111] flex flex-col justify-start relative">
            {/* Top decorative lines */}
            <div className="w-full flex flex-col gap-1 mb-10">
              <div className="w-full h-[6px] bg-[#fdfbf6]" />
              <div className="w-full h-[2px] bg-[#fdfbf6]" />
            </div>

            <h2 className="text-3xl lg:text-4xl font-serif font-bold uppercase tracking-widest mb-6">
              Aims <span className="text-xl mx-2">&amp;</span><br /> Scope
            </h2>
            <div className="w-12 h-1 bg-[#E63946] mb-8" />

            <p className="text-lg lg:text-xl italic leading-relaxed font-serif opacity-90 drop-shadow-sm mb-auto">
              We publish research across all disciplines, provided it meets our rigorous standards of academic triviality.
            </p>

            <div className="mt-12 text-xs font-sans uppercase tracking-[0.2em] opacity-50 font-bold">
              EST. 2026 // VOL. ∞
            </div>

            {/* Bottom decorative lines */}
            <div className="w-full flex flex-col gap-1 mt-6">
              <div className="w-full h-[2px] bg-[#fdfbf6]/40" />
              <div className="w-full h-[1px] bg-[#fdfbf6]/40" />
            </div>
          </div>

        </div>
      </div>

      <div className="relative mt-16 w-screen left-1/2 right-1/2 -mx-[50vw]">
        <div className="relative">
          <div className="border-t-4 border-[#1a2a22]" />
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-4 text-[#1a2a22] text-sm">♦</div>
        </div>
      </div>
    </section>
  );
};

export default JournalScope;
