import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { JournalMetadata } from "@/types/database.types";

async function fetchJournalMetadata(): Promise<JournalMetadata> {
    const { data, error } = await supabase
        .from("journal_metadata")
        .select("*")
        .limit(1)
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export function useJournalMetadata() {
    return useQuery<JournalMetadata, Error>({
        queryKey: ["journal_metadata"],
        queryFn: fetchJournalMetadata,
    });
}
