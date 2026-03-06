import { useEffect, useState, type CSSProperties, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Article } from "@/types/database.types";
import { ArrowDown, FileText, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useArticleComments,
  useCreateArticleComment,
  useMarkArticleCommentHelpful,
} from "@/hooks/useArticleComments";
import { useArticleTrashCount, useIncrementArticleTrash } from "@/hooks/useArticleTrash";

const FALLBACK_ABSTRACT =
  "This manuscript presents a focused investigation with methodological rigor, offering findings that contribute to ongoing scholarly discussion in the field.";

type TrashPiece = {
  id: number;
  startX: number;
  startY: number;
  midX: number;
  midY: number;
  endX: number;
  endY: number;
};

type FloatingPlus = {
  id: number;
  offsetX: number;
};

const formatTrashBadge = (count: number) => {
  if (count < 10000) return `${count}`;
  if (count < 100000) return `${(count / 10000).toFixed(1)}w`;
  return `${Math.floor(count / 10000)}w+`;
};

const ArticleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);
  const [articleAbstract, setArticleAbstract] = useState(FALLBACK_ABSTRACT);
  const [trashPieces, setTrashPieces] = useState<TrashPiece[]>([]);
  const [floatingPluses, setFloatingPluses] = useState<FloatingPlus[]>([]);
  const [trashFabBumping, setTrashFabBumping] = useState(false);
  const [trashLidFlipping, setTrashLidFlipping] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // New state for particle effect
  const [particles, setParticles] = useState<{ id: number; tx: string; ty: string; rot: string; color: string }[]>([]);

  const { data: comments = [], isLoading: commentsLoading } = useArticleComments(id || "");
  const createComment = useCreateArticleComment(id || "");
  const markHelpful = useMarkArticleCommentHelpful(id || "");
  const { data: trashCount = 0 } = useArticleTrashCount(article?.id || "");
  const incrementTrash = useIncrementArticleTrash(article?.id || "");

  useEffect(() => {
    const previousPaddingBottom = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "100px";
    return () => {
      document.body.style.paddingBottom = previousPaddingBottom;
    };
  }, []);

  useEffect(() => {
    if (id) {
      fetchArticle(id);
    }
  }, [id]);

  useEffect(() => {
    if (article && !loading) {
      const showTimer = setTimeout(() => setShowTooltip(true), 1500);
      const hideTimer = setTimeout(() => setShowTooltip(false), 8000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [article, loading]);

  const fetchArticle = async (articleId: string) => {
    setLoading(true);
    setArticleAbstract(FALLBACK_ABSTRACT);

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

    try {
      const { data: exactSubmissionMatch } = await supabase
        .from("submissions")
        .select("abstract")
        .eq("title", data.title)
        .eq("author", data.author)
        .order("submitted_at", { ascending: false })
        .limit(1);

      if (exactSubmissionMatch?.[0]?.abstract) {
        setArticleAbstract(exactSubmissionMatch[0].abstract);
      } else {
        const { data: titleSubmissionMatch } = await supabase
          .from("submissions")
          .select("abstract")
          .eq("title", data.title)
          .order("submitted_at", { ascending: false })
          .limit(1);

        if (titleSubmissionMatch?.[0]?.abstract) {
          setArticleAbstract(titleSubmissionMatch[0].abstract);
        }
      }
    } catch {
      // Keep fallback abstract if lookup fails.
    }

    setLoading(false);
  };

  const handleDownloadPdf = () => {
    if (article?.pdf_url) {
      window.open(article.pdf_url, "_blank");
    } else {
      toast.error("PDF not available");
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in to leave a comment.");
      return;
    }

    const content = commentText.trim();
    if (content.length < 20) {
      toast.error("Comment must be at least 20 characters.");
      return;
    }

    setSubmittingComment(true);
    try {
      await createComment.mutateAsync({ userId: user.id, content });
      setCommentText("");
      toast.success("Comment submitted.");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleHelpful = async (commentId: string) => {
    if (!user) {
      toast.error("Please log in to mark comments as helpful.");
      return;
    }

    setLikingCommentId(commentId);
    try {
      await markHelpful.mutateAsync(commentId);
    } catch (error: any) {
      toast.error(error.message || "Failed to mark as helpful.");
    } finally {
      setLikingCommentId(null);
    }
  };

  const handleThrowTrash = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!article?.id) return;

    if (showTooltip) {
      setShowTooltip(false);
    }

    if (showTooltip) {
      setShowTooltip(false);
    }

    const fabRect = event.currentTarget.getBoundingClientRect();
    const endX = fabRect.left + fabRect.width / 2 - 8;
    const endY = fabRect.top + fabRect.height / 2 - 8;

    const startX = event.clientX > 0 ? event.clientX : window.innerWidth / 2;
    const startY = event.clientY > 0 ? event.clientY : window.innerHeight / 2;
    const arcHeight = Math.min(
      230,
      Math.max(120, Math.abs(endX - startX) * 0.22 + Math.abs(endY - startY) * 0.18),
    );
    const midX = startX + (endX - startX) * 0.58;
    const midY = Math.min(startY, endY) - arcHeight;
    const pieceId = Date.now() + Math.floor(Math.random() * 100000);

    setTrashPieces((prev) => [
      ...prev,
      {
        id: pieceId,
        startX,
        startY,
        midX,
        midY,
        endX,
        endY,
      },
    ]);

    window.setTimeout(() => {
      setTrashPieces((prev) => prev.filter((item) => item.id !== pieceId));
    }, 800);

    setTrashFabBumping(true);
    setTrashLidFlipping(true);
    window.setTimeout(() => setTrashFabBumping(false), 400);
    window.setTimeout(() => setTrashLidFlipping(false), 400);

    const floatingId = Date.now() + Math.floor(Math.random() * 100000);
    setFloatingPluses((prev) => [...prev, { id: floatingId, offsetX: Math.floor(Math.random() * 20) - 10 }]);
    window.setTimeout(() => {
      setFloatingPluses((prev) => prev.filter((item) => item.id !== floatingId));
    }, 800);

    // Generate Confetti Particles
    const newParticles = Array.from({ length: 8 }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / 8 + (Math.random() * 0.5 - 0.25);
      const velocity = 40 + Math.random() * 30;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;
      const rot = Math.random() * 360;
      const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      return {
        id: Date.now() + i + Math.floor(Math.random() * 1000),
        tx: `${tx}px`,
        ty: `${ty}px`,
        rot: `${rot}deg`,
        color,
      };
    });

    setParticles((prev) => [...prev, ...newParticles]);
    window.setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find(np => np.id === p.id)));
    }, 600);

    incrementTrash.mutate(undefined, {
      onError: (error) => {
        toast.error(error.message || "Failed to throw into trash.");
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Article not found</p>
          <Link to="/" className="text-[#1a2a22] hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link
            to="/"
            className="text-xs font-sans uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
          >
            Back to Articles
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <article className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-10">
            <div className="flex-1 h-px bg-gray-300" />
            <p className="text-[11px] tracking-[0.28em] font-sans text-gray-600 uppercase whitespace-nowrap">
              R&S JOURNAL | VOL. 2026
            </p>
            <div className="flex-1 h-px bg-gray-300" />
          </div>

          <h1 className="font-serif text-4xl md:text-5xl leading-tight font-bold text-black text-center mb-7">
            {article.title}
          </h1>

          <div className="mb-14 flex flex-col items-center gap-2">
            <p className="text-lg md:text-xl text-[#8b0000] font-medium font-serif">{article.author}</p>
            <p className="text-sm text-gray-500 font-sans">
              Published{" "}
              {new Date(article.published_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <section className="bg-[#f5f5f3] px-6 py-8 md:px-10 md:py-10">
            <p className="text-xs font-sans tracking-[0.2em] font-bold text-black mb-5">ABSTRACT</p>
            <p className="text-[15px] md:text-base text-[#333333] leading-[1.8] tracking-[0.01em] font-sans whitespace-pre-wrap break-words">
              {articleAbstract}
            </p>

            <div className="pt-10 pb-2">
              <button
                onClick={handleDownloadPdf}
                disabled={!article.pdf_url}
                className="inline-flex items-center justify-center gap-3 bg-black text-white text-xs md:text-sm uppercase tracking-[0.2em] px-7 py-4 shadow-sm hover:bg-[#1f1f1f] active:translate-y-[1px] active:shadow-none transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDown className="w-4 h-4" />
                Download Full Paper (PDF)
              </button>
              <p className="text-[11px] text-gray-500 mt-3 tracking-wide">
                Available via Rubbish/Paper.d13f1e
              </p>
            </div>
          </section>

          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 my-8">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-sans uppercase tracking-wider bg-[#1a2a22]/10 text-[#1a2a22] px-3 py-1 border border-[#1a2a22]/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200 pt-10 mt-10">
            <h2 className="font-serif text-xl text-black mb-4">Comments</h2>

            {user ? (
              <form onSubmit={handleSubmitComment} className="mb-8 space-y-3">
                <textarea
                  rows={4}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your peer-review reaction..."
                  className="w-full border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a22]"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Minimum 20 characters</p>
                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="bg-[#1a2a22] text-white text-xs uppercase tracking-widest px-4 py-2 hover:opacity-90 disabled:opacity-50"
                  >
                    {submittingComment ? "Submitting..." : "Post Comment"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mb-8 p-4 border border-gray-200 bg-gray-50 text-sm text-gray-600">
                Please <Link to="/admin/login" className="text-[#1a2a22] hover:underline">log in</Link> to comment.
              </div>
            )}

            {commentsLoading ? (
              <p className="text-gray-500 animate-pulse">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-gray-500 text-sm">No comments yet.</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <article key={comment.id} className="border border-gray-200 p-4 bg-white">
                    <p className="text-sm text-gray-900 leading-relaxed">{comment.content}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</p>
                      <button
                        onClick={() => handleHelpful(comment.id)}
                        disabled={likingCommentId === comment.id}
                        className="text-xs font-semibold text-[#1a2a22] hover:underline disabled:opacity-50"
                      >
                        Helpful: {comment.helpful_count}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </article>
      </main>

      {trashPieces.map((piece) => (
        <div
          key={piece.id}
          className="trash-throw-piece"
          style={
            {
              "--sx": `${piece.startX}px`,
              "--sy": `${piece.startY}px`,
              "--mx": `${piece.midX}px`,
              "--my": `${piece.midY}px`,
              "--ex": `${piece.endX}px`,
              "--ey": `${piece.endY}px`,
            } as CSSProperties
          }
          aria-hidden
        />
      ))}

      <div
        className="fixed z-[9999]"
        style={{ right: "30px", bottom: "40px" }}
      >
        <div className="relative group">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(false)}
            onClick={handleThrowTrash}
            aria-label="Throw this paper into trash"
            className={`relative flex items-center justify-center w-[64px] h-[64px] md:w-[76px] md:h-[76px] rounded-2xl bg-gradient-to-br from-[#E63946] to-[#C1121F] text-white shadow-[0_8px_30px_rgba(230,57,70,0.4)] hover:shadow-[0_12px_40px_rgba(230,57,70,0.6)] hover:-translate-y-1 active:translate-y-[2px] active:scale-95 transition-all duration-300 border border-white/20 backdrop-blur-sm ${trashFabBumping ? "trash-fab-bump" : ""
              }`}
          >
            {/* Custom SVG combining Lucide aesthetics with our lid logic */}
            <svg
              viewBox="0 0 24 24"
              className="w-8 h-8 md:w-9 md:h-9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <g className={`trash-lid ${trashLidFlipping ? "trash-lid-flip" : ""}`}>
                <path d="M3 6h18" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </g>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>

          {/* Particle Explosion Container */}
          {particles.map((particle) => (
            <span
              key={particle.id}
              className="trash-particle"
              style={{
                '--tx': particle.tx,
                '--ty': particle.ty,
                '--rot': particle.rot,
                '--p-color': particle.color,
              } as CSSProperties}
            />
          ))}

          {trashCount > 0 && (
            <span className="absolute -top-3 -right-3 min-w-[32px] h-[32px] px-2 rounded-full bg-black/90 text-white text-[12px] font-bold border-2 border-white shadow-xl flex items-center justify-center transform transition-transform group-hover:scale-110">
              {formatTrashBadge(trashCount)}
            </span>
          )}

          {/* Interactive Tooltip Bubble */}
          {showTooltip && (
            <div className="absolute bottom-[84px] md:bottom-[94px] right-0 md:right-2 w-[220px] bg-white border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.15)] rounded-2xl p-4 animate-bounce z-50">
              <div className="absolute -bottom-2 right-6 md:right-8 w-5 h-5 bg-white border-b border-r border-gray-100 transform rotate-45 shadow-[3px_3px_5px_rgba(0,0,0,0.04)] hidden md:block"></div>
              <div className="absolute -bottom-2 right-4 w-5 h-5 bg-white border-b border-r border-gray-100 transform rotate-45 shadow-[3px_3px_5px_rgba(0,0,0,0.04)] md:hidden"></div>
              <div className="relative z-10 flex flex-col gap-2">
                <p className="text-[15px] font-sans text-gray-800 leading-relaxed font-medium text-left">
                  如果你觉得该文章够 <span className="font-bold text-[#E63946]">“rubbish”</span> 请点我 🗑️
                </p>
                <div className="w-full flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTooltip(false);
                    }}
                    className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          )}

          {floatingPluses.map((item) => (
            <span
              key={item.id}
              className="trash-plus-float absolute -top-7 text-[11px] font-bold text-[#D32F2F]"
              style={{ right: `${12 + item.offsetX}px` }}
            >
              +1
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArticleDetail;
