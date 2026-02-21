import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SubmissionRule } from "@/types/database.types";

async function fetchSubmissionRules(): Promise<SubmissionRule[]> {
    const { data, error } = await supabase
        .from("submission_rules")
        .select("*")
        .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);
    return data;
}

export function useSubmissionRules() {
    return useQuery<SubmissionRule[], Error>({
        queryKey: ["submission_rules"],
        queryFn: fetchSubmissionRules,
    });
}
