# Journal System Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete role-based access control, reviewer workflow, notifications, and frontend improvements for R&S Journal platform.

**Architecture:** This is a multi-phase implementation starting with database schema, then auth/roles, then reviewer workflow, notifications, search, and frontend enhancements. Each phase builds on the previous.

**Tech Stack:** React + TypeScript + Supabase (Auth, Database, Storage, Edge Functions) + TanStack React Query + Tailwind CSS

---

## Phase 1: Database Schema & Types

### Task 1.1: Update database.types.ts with new tables

**Files:**
- Modify: `src/types/database.types.ts`

**Step 1: Add new type definitions**

```typescript
// Add after existing types:

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

// Update Database interface
export interface Database {
  public: {
    Tables: {
      // ... existing tables ...
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      reviewer_invitations: {
        Row: ReviewerInvitation;
        Insert: Omit<ReviewerInvitation, 'id' | 'created_at'>;
        Update: Partial<Omit<ReviewerInvitation, 'id' | 'created_at'>>;
      };
      reviewer_assignments: {
        Row: ReviewerAssignment;
        Insert: Omit<ReviewerAssignment, 'id' | 'assigned_at'>;
        Update: Partial<Omit<ReviewerAssignment, 'id' | 'assigned_at'>>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Review, 'id' | 'created_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
      };
      journal_settings: {
        Row: JournalSettings;
        Insert: Omit<JournalSettings, 'id' | 'updated_at'>;
        Update: Partial<Omit<JournalSettings, 'id'>>;
      };
    };
  };
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/types/database.types.ts
git commit -m "feat: add TypeScript types for new database tables"
```

---

### Task 1.2: Create database migration SQL (for Supabase)

**Files:**
- Create: `supabase/migrations/001_add_profiles_and_workflow.sql`

**Step 1: Write migration SQL**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'reviewer', 'user')),
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  research_field TEXT,
  institution TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviewer Invitations
CREATE TABLE IF NOT EXISTS reviewer_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviewer Assignments
CREATE TABLE IF NOT EXISTS reviewer_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id),
  assigned_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  deadline DATE
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES reviewer_assignments(id) ON DELETE CASCADE,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('major_revision', 'minor_revision', 'accept', 'reject')),
  comments_to_editor TEXT,
  comments_to_author TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('submission_received', 'reviewer_assigned', 'review_completed', 'status_changed', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal Settings
CREATE TABLE IF NOT EXISTS journal_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  impact_factor DECIMAL(5,3),
  impact_factor_year INTEGER,
  editors_team JSONB DEFAULT '[]'::jsonb,
  reviewers_team JSONB DEFAULT '[]'::jsonb,
  about_page_additional TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to submissions for author tracking
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES profiles(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_reviewer_assignments_reviewer ON reviewer_assignments(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviewer_assignments_submission ON reviewer_assignments(submission_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- RLS Policies (basic - will be expanded)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviewer_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviewer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_settings ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Users can read all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Invitation policies
CREATE POLICY "Anyone can read pending invitations" ON reviewer_invitations FOR SELECT USING (status = 'pending');
CREATE POLICY "Admins can manage invitations" ON reviewer_invitations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Assignment policies
CREATE POLICY "Reviewers can read own assignments" ON reviewer_assignments FOR SELECT USING (
  auth.uid() = reviewer_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage assignments" ON reviewer_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Reviews policies
CREATE POLICY "Admins and assigned reviewer can read reviews" ON reviews FOR SELECT USING (
  EXISTS (SELECT 1 FROM reviewer_assignments ra WHERE ra.id = reviews.assignment_id AND ra.reviewer_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Assigned reviewer can create reviews" ON reviews FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM reviewer_assignments ra
    JOIN profiles p ON p.id = ra.reviewer_id
    WHERE ra.id = reviews.assignment_id AND p.id = auth.uid())
);

-- Notifications policies
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Journal settings policies
CREATE POLICY "Anyone can read journal settings" ON journal_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update journal settings" ON journal_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default journal settings
INSERT INTO journal_settings (id, impact_factor, impact_factor_year, editors_team, reviewers_team)
VALUES (gen_random_uuid(), NULL, NULL, '[]'::jsonb, '[]'::jsonb)
ON CONFLICT DO NOTHING;
```

**Step 2: Document that this SQL needs to be run in Supabase SQL Editor**

Add comment in migration file noting manual execution required.

**Step 3: Commit**

```bash
git add supabase/migrations/001_add_profiles_and_workflow.sql
git commit -m "feat: add database migration for new tables"
```

---

## Phase 2: Authentication & Roles

### Task 2.1: Create auth context and role-based access

**Files:**
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/hooks/useAuth.ts`
- Modify: `src/lib/supabase.ts`

**Step 1: Create auth context**

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types/database.types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isReviewer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    }
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (!error && fullName) {
      await supabase.from('profiles').update({ full_name: fullName }).eq('email', email);
    }
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const value = {
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: profile?.role === 'admin',
    isReviewer: profile?.role === 'reviewer',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

**Step 2: Update App.tsx to use AuthProvider**

Add AuthProvider wrapper in main App.tsx.

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/contexts/AuthContext.tsx src/hooks/useAuth.ts
git commit -m "feat: add authentication context and role-based access"
```

---

### Task 2.2: Create protected route components

**Files:**
- Modify: `src/components/ProtectedRoute.tsx`
- Create: `src/components/admin/AdminRoute.tsx`
- Create: `src/components/reviewer/ReviewerRoute.tsx`

**Step 1: Update ProtectedRoute**

```typescript
// Add role checking
interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'reviewer' | 'user')[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
```

**Step 2: Create AdminRoute**

```typescript
// src/components/admin/AdminRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};
```

**Step 3: Create ReviewerRoute**

```typescript
// src/components/reviewer/ReviewerRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const ReviewerRoute = ({ children }: { children: React.ReactNode }) => {
  const { isReviewer, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isReviewer) return <Navigate to="/" replace />;

  return <>{children}</>;
};
```

**Step 4: Commit**

```bash
git add src/components/ProtectedRoute.tsx src/components/admin/AdminRoute.tsx src/components/reviewer/ReviewerRoute.tsx
git commit -m "feat: add role-based route protection"
```

---

## Phase 3: Reviewer Management

### Task 3.1: Create reviewer invitation system

**Files:**
- Create: `src/pages/admin/ReviewerManagement.tsx`
- Create: `src/pages/Register.tsx` (for invited reviewers)

**Step 1: Create reviewer management page**

This is a substantial component - see implementation file for full code. Key features:
- List existing reviewers
- Send invitation form (email input)
- Generate unique invitation token
- Display invitation status

**Step 2: Create registration page for invited reviewers**

Key features:
- Validate invitation token from URL
- Collect: password, full name, avatar, bio, research field, institution
- Mark invitation as registered on success

**Step 3: Commit**

```bash
git add src/pages/admin/ReviewerManagement.tsx src/pages/Register.tsx
git commit -m "feat: add reviewer invitation and registration system"
```

---

### Task 3.2: Create reviewer dashboard

**Files:**
- Create: `src/pages/reviewer/Dashboard.tsx`

**Step 1: Create reviewer dashboard**

Key features:
- List assigned submissions
- View submission details
- Submit review form with recommendation dropdown and comments
- View review history

**Step 2: Commit**

```bash
git add src/pages/reviewer/Dashboard.tsx
git commit -m "feat: add reviewer dashboard"
```

---

## Phase 4: Admin Enhancements

### Task 4.1: Enhance admin dashboard with reviewer assignment

**Files:**
- Modify: `src/pages/admin/Dashboard.tsx`
- Create: `src/components/admin/AssignReviewerModal.tsx`

**Step 1: Create assignment modal**

Modal component with:
- List of active reviewers (from profiles where role='reviewer')
- Search/filter reviewers
- Deadline date picker
- Assign button

**Step 2: Integrate into Dashboard**

Add "Assign Reviewer" button to each pending submission in the submissions tab.

**Step 3: Commit**

```bash
git add src/pages/admin/Dashboard.tsx src/components/admin/AssignReviewerModal.tsx
git commit -m "feat: add reviewer assignment functionality"
```

---

### Task 4.2: Add journal settings management

**Files:**
- Create: `src/pages/admin/JournalSettings.tsx`

**Step 1: Create settings page**

Features:
- Impact factor input (number + year)
- Editors team management (add/remove/edit)
- Reviewers team (auto-populate from profiles + manual add)
- About page additional content

**Step 2: Commit**

```bash
git add src/pages/admin/JournalSettings.tsx
git commit -m "feat: add journal settings management"
```

---

## Phase 5: Notifications

### Task 5.1: Create notification system

**Files:**
- Create: `src/hooks/useNotifications.ts`
- Create: `src/components/ui/NotificationBell.tsx`
- Create: `src/components/ui/NotificationList.tsx`

**Step 1: Create notification hook**

```typescript
// src/hooks/useNotifications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@/types/database.types';

export const useNotifications = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return (data as Notification[]) ?? [];
    },
    enabled: !!user,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
```

**Step 2: Create notification bell component**

**Step 3: Commit**

```bash
git add src/hooks/useNotifications.ts src/components/ui/NotificationBell.tsx src/components/ui/NotificationList.tsx
git commit -m "feat: add notification system"
```

---

## Phase 6: Search

### Task 6.1: Add article search functionality

**Files:**
- Create: `src/components/SearchBar.tsx`
- Modify: `src/components/ArticleList.tsx`

**Step 1: Create search component**

```typescript
// src/components/SearchBar.tsx
import { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search articles..."
        className="w-full pl-10 pr-4 py-2 border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </form>
  );
};
```

**Step 2: Integrate into ArticleList**

Add search state and filter articles client-side for now.

**Step 3: Commit**

```bash
git add src/components/SearchBar.tsx src/components/ArticleList.tsx
git commit -m "feat: add article search functionality"
```

---

## Phase 7: Frontend Enhancements

### Task 7.1: Create article detail page

**Files:**
- Create: `src/pages/ArticleDetail.tsx`

**Step 1: Create article detail page**

Features:
- Full article display
- DOI with copy button
- Abstract display
- PDF download
- Citation info

**Step 2: Add route**

In App.tsx: `<Route path="/article/:id" element={<ArticleDetail />} />`

**Step 3: Commit**

```bash
git add src/pages/ArticleDetail.tsx src/App.tsx
git commit -m "feat: add article detail page"
```

---

### Task 7.2: Create about page enhancement

**Files:**
- Modify: `src/pages/About.tsx`

**Step 1: Update About page**

Add sections for:
- Impact factor display
- Editors team
- Reviewers team

**Step 2: Commit**

```bash
git add src/pages/About.tsx
git commit -m "feat: enhance about page with team displays"
```

---

### Task 7.3: Add author submission tracking

**Files:**
- Create: `src/pages/MySubmissions.tsx`

**Step 1: Create my submissions page**

Features:
- List user's submissions
- Show status (pending, under_review, approved, rejected)
- View submission details

**Step 2: Add route**

**Step 3: Commit**

```bash
git add src/pages/MySubmissions.tsx src/App.tsx
git commit -m "feat: add author submission tracking"
```

---

## Phase 8: Email Notifications (Edge Function)

### Task 8.1: Create email sending Edge Function

**Files:**
- Create: `supabase/functions/send-email/index.ts`

**Step 1: Create Edge Function**

```typescript
// supabase/functions/send-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createTransport } from 'https://deno.land/x/nodemailer/mod.ts';

const smtpHost = Deno.env.get('SMTP_HOST')!;
const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
const smtpUser = Deno.env.get('SMTP_USER')!;
const smtpPass = Deno.env.get('SMTP_PASS')!;
const smtpFrom = Deno.env.get('SMTP_FROM') || 'noreply@rs-journal.com';

const transporter = createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: false,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

serve(async (req) => {
  const { to, subject, body } = await req.json();

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      text: body,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

**Step 2: Document SMTP env vars needed**

**Step 3: Commit**

```bash
git add supabase/functions/send-email/index.ts
git commit -m "feat: add email sending edge function"
```

---

## Summary

This plan implements:
- ✅ Database schema with 6 new tables
- ✅ Role-based authentication (admin/reviewer/user)
- ✅ Reviewer invitation system
- ✅ Reviewer assignment workflow
- ✅ Review submission with recommendations
- ✅ In-app notifications
- ✅ Email notifications (via Edge Function)
- ✅ Article search
- ✅ Article detail page
- ✅ Enhanced about page
- ✅ Author submission tracking

**Total Tasks:** ~15 major tasks
**Estimated Commits:** ~12-15

---

**Execution Choice:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
