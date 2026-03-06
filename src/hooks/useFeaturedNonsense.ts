import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Article, ArticleComment } from "@/types/database.types";

type FeaturedNonsense = {
  article: Article | null;
  topComment: ArticleComment | null;
};

async function fetchFeaturedNonsense(): Promise<FeaturedNonsense> {
  const { data: topComments } = await supabase
    .from("article_comments")
    .select("*")
    .order("helpful_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  const topComment = (topComments?.[0] || null) as ArticleComment | null;

  if (topComment) {
    const { data: articleData } = await supabase
      .from("articles")
      .select("*")
      .eq("id", topComment.article_id)
      .single();

    return {
      article: (articleData || null) as Article | null,
      topComment,
    };
  }

  const { data: latestArticle } = await supabase
    .from("articles")
    .select("*")
    .order("published_date", { ascending: false })
    .limit(1)
    .single();

  return {
    article: (latestArticle || null) as Article | null,
    topComment: null,
  };
}

export function useFeaturedNonsense() {
  return useQuery<FeaturedNonsense, Error>({
    queryKey: ["featured_nonsense"],
    queryFn: fetchFeaturedNonsense,
  });
}
