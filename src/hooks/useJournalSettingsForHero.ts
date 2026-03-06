import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { JournalSettings } from "@/types/database.types";

async function fetchJournalSettingsForHero(): Promise<JournalSettings | null> {
    const { data, error } = await supabase
        .from("journal_settings")
        .select("*")
        .limit(1)
        .single();

    if (error) {
        console.error("Error fetching journal settings:", error);
        return null;
    }
    return data;
}

export function useJournalSettingsForHero() {
    return useQuery<JournalSettings | null, Error>({
        queryKey: ["journal_settings_hero"],
        queryFn: fetchJournalSettingsForHero,
    });
}
