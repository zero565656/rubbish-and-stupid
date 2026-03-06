import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface ProfileSettingsProps {
  backPath: string;
  deskTitle: string;
  allowPasswordChange?: boolean;
  homeLogoHref?: string;
}

const ProfileSettings = ({ backPath, deskTitle, allowPasswordChange = false, homeLogoHref }: ProfileSettingsProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [researchField, setResearchField] = useState("");
  const [signature, setSignature] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingAvatar = useMemo(() => profile?.avatar_url || null, [profile?.avatar_url]);

  useEffect(() => {
    setFullName(profile?.full_name || "");
    setInstitution(profile?.institution || "");
    setResearchField(profile?.research_field || "");
    setSignature(profile?.bio || "");
    setEmail(user?.email || "");
    setAvatarPreview(profile?.avatar_url || null);
    setAvatarFile(null);
  }, [profile?.full_name, profile?.institution, profile?.research_field, profile?.bio, profile?.avatar_url, user?.email]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async () => {
    if (!user || !avatarFile) return existingAvatar;

    setUploading(true);
    try {
      const extension = avatarFile.name.split(".").pop() || "png";
      const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-avatars")
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("profile-avatars").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error: any) {
      toast.error(`Failed to upload avatar: ${error.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast.error("Please log in first.");
      return;
    }

    setSaving(true);
    try {
      const avatarUrl = await uploadAvatar();
      if (avatarUrl === null && avatarFile) {
        setSaving(false);
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          institution: institution.trim() || null,
          research_field: researchField.trim() || null,
          bio: signature.trim() || null,
          avatar_url: avatarUrl || null,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      const normalizedEmail = email.trim();
      if (normalizedEmail && normalizedEmail !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: normalizedEmail });
        if (emailError) throw emailError;
        toast.success("Profile saved. Please confirm your new email from inbox.");
      } else {
        toast.success("Profile saved.");
      }

      await refreshProfile();
      setAvatarFile(null);
    } catch (error: any) {
      toast.error(`Failed to save profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const password = newPassword.trim();

    if (!password || !confirmNewPassword.trim()) {
      toast.error("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmNewPassword.trim()) {
      toast.error("Password confirmation does not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Password updated.");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      toast.error(`Failed to update password: ${error.message}`);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            {homeLogoHref ? (
              <Link to={homeLogoHref} className="hover:opacity-80 transition-opacity">
                <h1 className="font-serif italic text-xl tracking-tight text-foreground">r&amp;s {deskTitle}</h1>
              </Link>
            ) : (
              <h1 className="font-serif italic text-xl tracking-tight text-foreground">r&amp;s {deskTitle}</h1>
            )}
            <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground">Profile Settings</p>
          </div>
          <Link to={backPath} className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
            Back
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-3xl border border-border bg-card p-6 md:p-8">
          <h2 className="font-serif text-2xl text-foreground mb-6">Personal Information</h2>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                Avatar
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full border border-border overflow-hidden bg-muted flex items-center justify-center text-muted-foreground text-xs">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    "No Avatar"
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-sans uppercase tracking-widest px-4 py-2 border border-border hover:bg-muted transition-colors"
                  >
                    Upload Avatar
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="full-name" className="block text-sm font-sans text-foreground">
                Full Name
              </label>
              <input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-sans text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="institution" className="block text-sm font-sans text-foreground">
                Institution
              </label>
              <input
                id="institution"
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Your institution"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="research-field" className="block text-sm font-sans text-foreground">
                Research Field
              </label>
              <input
                id="research-field"
                type="text"
                value={researchField}
                onChange={(e) => setResearchField(e.target.value)}
                className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. Computational Physics"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="signature" className="block text-sm font-sans text-foreground">
                Personal Signature
              </label>
              <textarea
                id="signature"
                rows={3}
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Your personal signature..."
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || uploading}
                className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-6 py-3 hover:bg-primary/90 disabled:opacity-50"
              >
                {saving || uploading ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>

        {allowPasswordChange && (
          <div className="max-w-3xl border border-border bg-card p-6 md:p-8 mt-8">
            <h2 className="font-serif text-2xl text-foreground mb-6">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="new-password" className="block text-sm font-sans text-foreground">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                  className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="At least 6 characters"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-new-password" className="block text-sm font-sans text-foreground">
                  Confirm New Password
                </label>
                <input
                  id="confirm-new-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  minLength={6}
                  required
                  className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Re-enter new password"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-6 py-3 hover:bg-primary/90 disabled:opacity-50"
                >
                  {changingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProfileSettings;
