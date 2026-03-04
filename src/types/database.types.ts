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
    tags: string[];
    created_at: string;
}

export interface SubmissionRule {
    id: string;
    sort_order: number;
    rule_text: string;
    created_at: string;
}

export interface Submission {
    id: string;
    title: string;
    author: string;
    abstract: string;
    pdf_path: string;
    status: 'pending' | 'approved' | 'rejected';
    submitted_at: string;
}

export interface AboutContent {
    id: string;
    slogan: string;
    purpose: string;
    introduction: string;
    updated_at: string;
}

// ============ NEW TYPES FOR JOURNAL SYSTEM EXPANSION ============

export type UserRole = 'admin' | 'reviewer' | 'user';

export interface Profile {
    id: string;
    role: UserRole;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    research_field: string | null;
    institution: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type InvitationStatus = 'pending' | 'registered' | 'expired';

export interface ReviewerInvitation {
    id: string;
    email: string;
    token: string;
    invited_by: string;
    status: InvitationStatus;
    expires_at: string;
    created_at: string;
}

export type AssignmentStatus = 'pending' | 'accepted' | 'rejected' | 'completed';

export interface ReviewerAssignment {
    id: string;
    submission_id: string;
    reviewer_id: string;
    assigned_by: string;
    status: AssignmentStatus;
    assigned_at: string;
    deadline: string | null;
}

export type ReviewRecommendation = 'major_revision' | 'minor_revision' | 'accept' | 'reject';

export interface Review {
    id: string;
    assignment_id: string;
    recommendation: ReviewRecommendation;
    comments_to_editor: string | null;
    comments_to_author: string | null;
    created_at: string;
    updated_at: string;
}

export type NotificationType = 'submission_received' | 'reviewer_assigned' | 'review_completed' | 'status_changed' | 'general';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    related_id: string | null;
    is_read: boolean;
    created_at: string;
}

export interface JournalSettings {
    id: string;
    impact_factor: number | null;
    impact_factor_year: number | null;
    editors_team: EditorTeamMember[];
    reviewers_team: ReviewerTeamMember[];
    about_page_additional: string | null;
    updated_at: string;
}

export interface EditorTeamMember {
    name: string;
    title: string;
    institution: string;
    email: string;
}

export interface ReviewerTeamMember {
    name: string;
    institution: string;
    research_field: string;
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
            submissions: {
                Row: Submission;
                Insert: Omit<Submission, "id" | "submitted_at" | "status"> & { status?: 'pending' | 'approved' | 'rejected' };
                Update: Partial<Omit<Submission, "id" | "submitted_at">>;
            };
            about_content: {
                Row: AboutContent;
                Insert: Omit<AboutContent, "id" | "updated_at">;
                Update: Partial<Omit<AboutContent, "id" | "updated_at">>;
            };
            profiles: {
                Row: Profile;
                Insert: Omit<Profile, "id" | "created_at" | "updated_at">;
                Update: Partial<Omit<Profile, "id" | "created_at">>;
            };
            reviewer_invitations: {
                Row: ReviewerInvitation;
                Insert: Omit<ReviewerInvitation, "id" | "created_at">;
                Update: Partial<Omit<ReviewerInvitation, "id" | "created_at">>;
            };
            reviewer_assignments: {
                Row: ReviewerAssignment;
                Insert: Omit<ReviewerAssignment, "id" | "assigned_at">;
                Update: Partial<Omit<ReviewerAssignment, "id" | "assigned_at">>;
            };
            reviews: {
                Row: Review;
                Insert: Omit<Review, "id" | "created_at" | "updated_at">;
                Update: Partial<Omit<Review, "id" | "created_at">>;
            };
            notifications: {
                Row: Notification;
                Insert: Omit<Notification, "id" | "created_at">;
                Update: Partial<Omit<Notification, "id" | "created_at">>;
            };
            journal_settings: {
                Row: JournalSettings;
                Insert: Omit<JournalSettings, "id" | "updated_at">;
                Update: Partial<Omit<JournalSettings, "id">>;
            };
        };
    };
}
