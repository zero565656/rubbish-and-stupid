import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ArticleComment } from "@/types/database.types";

async function fetchArticleComments(articleId: string): Promise<ArticleComment[]> {
  const { data, error } = await supabase
    .from("article_comments")
    .select("*")
    .eq("article_id", articleId)
    .order("helpful_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as ArticleComment[];
}

export function useArticleComments(articleId: string) {
  return useQuery<ArticleComment[], Error>({
    queryKey: ["article_comments", articleId],
    queryFn: () => fetchArticleComments(articleId),
    enabled: Boolean(articleId),
  });
}

export function useCreateArticleComment(articleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { userId: string; content: string }) => {
      const { error } = await supabase.from("article_comments").insert({
        article_id: articleId,
        user_id: payload.userId,
        content: payload.content,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["article_comments", articleId] });
      await queryClient.invalidateQueries({ queryKey: ["featured_nonsense"] });
    },
  });
}

export function useMarkArticleCommentHelpful(articleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.rpc("increment_article_comment_helpful", { comment_id: commentId });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["article_comments", articleId] });
      await queryClient.invalidateQueries({ queryKey: ["featured_nonsense"] });
    },
  });
}
