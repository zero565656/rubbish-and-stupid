import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { JournalSettings } from "@/types/database.types";

export const useJournalSettings = () => {
    return useQuery({
        queryKey: ["journal_settings"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("journal_settings")
                .select("*")
                .limit(1)
                .single();

            if (error) throw error;
            return data as JournalSettings;
        },
    });
};
