import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Article } from "@/types/database.types";

async function fetchArticles(): Promise<Article[]> {
    const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("published_date", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
}

export function useArticles() {
    return useQuery<Article[], Error>({
        queryKey: ["articles"],
        queryFn: fetchArticles,
    });
}
