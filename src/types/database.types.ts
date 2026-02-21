export interface JournalMetadata {
    id: string;
    volume: number;
    issue: number;
    issn: string;
    hero_title: string;
    hero_subtitle: string;
    created_at: string;
}

export interface Article {
    id: string;
    title: string;
    author: string;
    doi: string;
    published_date: string;
    pdf_url: string | null;
    created_at: string;
}

export interface SubmissionRule {
    id: string;
    sort_order: number;
    rule_text: string;
    created_at: string;
}

// Database type map for the typed Supabase client
export interface Database {
    public: {
        Tables: {
            journal_metadata: {
                Row: JournalMetadata;
                Insert: Omit<JournalMetadata, "id" | "created_at">;
                Update: Partial<Omit<JournalMetadata, "id" | "created_at">>;
            };
            articles: {
                Row: Article;
                Insert: Omit<Article, "id" | "created_at">;
                Update: Partial<Omit<Article, "id" | "created_at">>;
            };
            submission_rules: {
                Row: SubmissionRule;
                Insert: Omit<SubmissionRule, "id" | "created_at">;
                Update: Partial<Omit<SubmissionRule, "id" | "created_at">>;
            };
        };
    };
}
