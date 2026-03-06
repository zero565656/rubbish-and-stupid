import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

async function fetchArticleTrashCount(articleId: string): Promise<number> {
  const { data, error } = await supabase
    .from("article_trash_stats")
    .select("trash_count")
    .eq("article_id", articleId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Number(data?.trash_count ?? 0);
}

export function useArticleTrashCount(articleId: string) {
  return useQuery<number, Error>({
    queryKey: ["article_trash_count", articleId],
    queryFn: () => fetchArticleTrashCount(articleId),
    enabled: Boolean(articleId),
  });
}

export function useIncrementArticleTrash(articleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Try the canonical arg name first.
      const rpcPrimary = await supabase.rpc("increment_article_trash_count", {
        target_article_id: articleId,
      } as any);
      if (!rpcPrimary.error) {
        return Number(rpcPrimary.data || 0);
      }

      // Fallback: older function definitions may use "article_id".
      const rpcFallback = await supabase.rpc("increment_article_trash_count", {
        article_id: articleId,
      } as any);
      if (!rpcFallback.error) {
        return Number(rpcFallback.data || 0);
      }

      // Final fallback: client-side read + upsert so UI still works if RPC schema cache is stale.
      const { data: row, error: readError } = await supabase
        .from("article_trash_stats")
        .select("trash_count")
        .eq("article_id", articleId)
        .maybeSingle();

      if (readError) throw new Error(readError.message);

      const nextCount = Number(row?.trash_count ?? 0) + 1;
      const { error: upsertError } = await supabase
        .from("article_trash_stats")
        .upsert(
          {
            article_id: articleId,
            trash_count: nextCount,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "article_id" },
        );

      if (upsertError) {
        throw new Error(rpcPrimary.error?.message || rpcFallback.error?.message || upsertError.message);
      }

      return nextCount;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["article_trash_count", articleId] });
      const previous = queryClient.getQueryData<number>(["article_trash_count", articleId]) ?? 0;
      queryClient.setQueryData<number>(["article_trash_count", articleId], previous + 1);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData<number>(["article_trash_count", articleId], context.previous);
      }
    },
    onSuccess: (serverCount) => {
      if (Number.isFinite(serverCount) && serverCount > 0) {
        queryClient.setQueryData<number>(["article_trash_count", articleId], serverCount);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["article_trash_count", articleId] });
    },
  });
}
