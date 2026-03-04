-- =====================================================
-- Journal System Expansion - Migration 001
-- Requires manual execution in Supabase SQL Editor
-- =====================================================

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
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, 'user', NEW.raw_user_meta_data->>'full_name');
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
