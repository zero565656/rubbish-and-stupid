import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AboutContent } from "@/types/database.types";

export function useAboutContent() {
    return useQuery({
        queryKey: ["about_content"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("about_content")
                .select("*")
                .limit(1)
                .single();

            if (error && error.code !== "PGRST116") {
                throw new Error(error.message);
            }

            return data as AboutContent | null;
        },
    });
}
