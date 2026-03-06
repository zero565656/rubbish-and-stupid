import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { inviteReviewerWithAutoAccount } from "@/lib/reviewerInvite";
import type { Profile, ReviewerInvitation, UserRole } from "@/types/database.types";

type EditableProfile = {
  id: string;
  full_name: string;
  institution: string;
  research_field: string;
  role: UserRole;
  is_active: boolean;
};

const isEditorRoleConstraintError = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  const code = String(error?.code || "");

  return (
    (code === "23514" || message.includes("check constraint")) &&
    (message.includes("profiles_role_check") ||
      details.includes("profiles_role_check") ||
      message.includes("role"))
  );
};

const UserManagement = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<ReviewerInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [editing, setEditing] = useState<EditableProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, invitationsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("reviewer_invitations").select("*").order("created_at", { ascending: false }),
    ]);

    if (profilesRes.error) {
      toast.error(`Failed to load users: ${profilesRes.error.message}`);
    } else {
      setProfiles((profilesRes.data as Profile[]) || []);
    }

    if (invitationsRes.error) {
      toast.error(`Failed to load invitations: ${invitationsRes.error.message}`);
    } else {
      setInvitations((invitationsRes.data as ReviewerInvitation[]) || []);
    }

    setLoading(false);
  };

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return profiles.filter((item) => {
      const roleMatch = roleFilter === "all" || item.role === roleFilter;
      if (!roleMatch) return false;

      if (!normalizedSearch) return true;

      const target = [
        item.id,
        item.full_name || "",
        item.research_field || "",
        item.institution || "",
        item.role,
      ]
        .join(" ")
        .toLowerCase();

      return target.includes(normalizedSearch);
    });
  }, [profiles, roleFilter, search]);

  const hasOtherAdmin = (excludeId?: string) =>
    profiles.some((item) => item.role === "admin" && item.id !== excludeId);

  const openEdit = (profile: Profile) => {
    setEditing({
      id: profile.id,
      full_name: profile.full_name || "",
      institution: profile.institution || "",
      research_field: profile.research_field || "",
      role: profile.role,
      is_active: profile.is_active,
    });
  };

  const saveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;

    if (editing.role === "admin" && hasOtherAdmin(editing.id)) {
      toast.error("Only one admin account is allowed.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editing.full_name.trim() || null,
        institution: editing.institution.trim() || null,
        research_field: editing.research_field.trim() || null,
        role: editing.role,
        is_active: editing.is_active,
      })
      .eq("id", editing.id);

    setSaving(false);

    if (error) {
      if (editing.role === "editor" && isEditorRoleConstraintError(error)) {
        toast.error("Database role constraint has not enabled editor yet. Please run migration 009 in Supabase SQL Editor.");
        return;
      }
      toast.error(`Failed to update user: ${error.message}`);
      return;
    }

    toast.success("User updated.");
    setEditing(null);
    fetchData();
  };

  const updateRole = async (profileId: string, role: UserRole) => {
    if (role === "admin" && hasOtherAdmin(profileId)) {
      toast.error("Only one admin account is allowed.");
      return;
    }

    const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
    if (error) {
      if (role === "editor" && isEditorRoleConstraintError(error)) {
        toast.error("Database role constraint has not enabled editor yet. Please run migration 009 in Supabase SQL Editor.");
        return;
      }
      toast.error(`Failed to change role: ${error.message}`);
      return;
    }

    toast.success(`Role changed to ${role}.`);
    fetchData();
  };

  const toggleActive = async (profile: Profile) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !profile.is_active })
      .eq("id", profile.id);

    if (error) {
      toast.error(`Failed to update status: ${error.message}`);
      return;
    }

    toast.success(profile.is_active ? "User disabled." : "User enabled.");
    fetchData();
  };

  const deleteProfile = async (profile: Profile) => {
    if (profile.id === user?.id) {
      toast.error("You cannot delete your own account.");
      return;
    }

    const confirmDelete = window.confirm("Delete this user profile? This cannot be undone.");
    if (!confirmDelete) return;

    setDeletingId(profile.id);
    try {
      // Clean up or detach rows referencing this profile to satisfy FK constraints.
      const { error: detachSubmissionError } = await supabase
        .from("submissions")
        .update({ author_id: null } as any)
        .eq("author_id", profile.id);
      if (detachSubmissionError) {
        toast.error(`Failed to detach submissions: ${detachSubmissionError.message}`);
        return;
      }

      const { error: deleteReviewerAssignmentsError } = await supabase
        .from("reviewer_assignments")
        .delete()
        .eq("reviewer_id", profile.id);
      if (deleteReviewerAssignmentsError) {
        toast.error(`Failed to clean reviewer assignments: ${deleteReviewerAssignmentsError.message}`);
        return;
      }

      if (user?.id) {
        const { error: reassignInvitationsError } = await supabase
          .from("reviewer_invitations")
          .update({ invited_by: user.id })
          .eq("invited_by", profile.id);
        if (reassignInvitationsError) {
          toast.error(`Failed to reassign invitations: ${reassignInvitationsError.message}`);
          return;
        }

        const { error: reassignAssignmentsError } = await supabase
          .from("reviewer_assignments")
          .update({ assigned_by: user.id })
          .eq("assigned_by", profile.id);
        if (reassignAssignmentsError) {
          toast.error(`Failed to reassign assignments: ${reassignAssignmentsError.message}`);
          return;
        }
      }

      // Remove this user from homepage display lists.
      const { data: journalSettingsData } = await supabase
        .from("journal_settings")
        .select("*")
        .limit(1)
        .single();

      if (journalSettingsData?.id) {
        const cleanedEditors = ((journalSettingsData as any).editors_team || []).filter(
          (member: any) => member?.user_id !== profile.id
        );
        const cleanedReviewers = ((journalSettingsData as any).reviewers_team || []).filter(
          (member: any) => member?.user_id !== profile.id
        );

        const { error: cleanTeamError } = await supabase
          .from("journal_settings")
          .update({
            editors_team: cleanedEditors,
            reviewers_team: cleanedReviewers,
          })
          .eq("id", (journalSettingsData as any).id);

        if (cleanTeamError) {
          toast.error(`Failed to clean homepage team lists: ${cleanTeamError.message}`);
          return;
        }
      }

      const { error } = await supabase.from("profiles").delete().eq("id", profile.id);

      if (!error) {
        toast.success("User deleted.");
        fetchData();
        return;
      }

      const isForeignKeyConflict =
        (error as any)?.code === "23503" ||
        String(error.message || "").toLowerCase().includes("foreign key constraint");

      if (isForeignKeyConflict) {
        // Keep historical records intact and disable account instead of hard delete.
        const { error: disableError } = await supabase
          .from("profiles")
          .update({
            is_active: false,
            role: "user",
          })
          .eq("id", profile.id);

        if (disableError) {
          toast.error(`Delete blocked and disable failed: ${disableError.message}`);
          return;
        }

        toast.warning("User has related records and cannot be hard-deleted. Account disabled instead.");
        fetchData();
        return;
      }

      toast.error(`Delete failed: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const inviteReviewer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast.error("Please log in again.");
      return;
    }
    const email = inviteEmail.trim();
    const reviewerName = inviteName.trim();
    if (!email || !reviewerName) return;

    setSendingInvite(true);
    try {
      const result = await inviteReviewerWithAutoAccount({
        reviewerEmail: email,
        reviewerName,
      });

      toast.success("Reviewer invitation sent.");
      setInviteName("");
      setInviteEmail("");
      if (result?.invitation) {
        setInvitations((prev) => {
          const next = [result.invitation as ReviewerInvitation, ...prev.filter((item) => item.email !== result.invitation.email)];
          return next;
        });
      }
      if (result?.profile) {
        setProfiles((prev) => {
          const existingIndex = prev.findIndex((item) => item.id === result.profile.id);
          if (existingIndex === -1) {
            return [result.profile as Profile, ...prev];
          }
          const next = [...prev];
          next[existingIndex] = result.profile as Profile;
          return next;
        });
      }
    } catch (error: any) {
      toast.error(`Invitation failed: ${error.message}`);
    } finally {
      setSendingInvite(false);
    }
  };

  const revokeInvitation = async (id: string) => {
    const { error } = await supabase.from("reviewer_invitations").delete().eq("id", id);
    if (error) {
      toast.error(`Failed to revoke invitation: ${error.message}`);
      return;
    }

    toast.success("Invitation revoked.");
    fetchData();
  };

  const copyLoginLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/admin/login`);
    toast.success("Login URL copied.");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif italic text-xl tracking-tight text-foreground">r&amp;s Editorial Desk</h1>
            <p className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground">User Management</p>
          </div>
          <Link
            to="/admin"
            className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 space-y-8">
        <section className="border border-border bg-card p-6">
          <h2 className="font-serif text-xl text-foreground mb-4">Create Reviewer (Invite)</h2>
          <form onSubmit={inviteReviewer} className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              required
              placeholder="Reviewer full name"
              className="flex-1 border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="reviewer@example.com"
              className="flex-1 border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={sendingInvite}
              className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-6 py-2 hover:bg-primary/90 disabled:opacity-50"
            >
              {sendingInvite ? "Sending..." : "Send Invite"}
            </button>
          </form>
        </section>

        <section className="border border-border bg-card p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="font-serif text-xl text-foreground">Users</h2>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name / field / institution / id"
                className="w-full md:w-80 border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as "all" | UserRole)}
                className="border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="reviewer">Reviewer</option>
                <option value="user">User</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-muted-foreground animate-pulse">Loading users...</p>
          ) : filteredProfiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Role</th>
                    <th className="py-3 pr-4">Field</th>
                    <th className="py-3 pr-4">Institution</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Created</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map((profile) => (
                    <tr key={profile.id} className="border-b border-border/70 align-top">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground">{profile.full_name || "(No Name)"}</p>
                        <p className="text-xs text-muted-foreground mt-1">{profile.id}</p>
                      </td>
                      <td className="py-3 pr-4 capitalize">{profile.role}</td>
                      <td className="py-3 pr-4">{profile.research_field || "-"}</td>
                      <td className="py-3 pr-4">{profile.institution || "-"}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-semibold px-2 py-1 ${profile.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}>
                          {profile.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{new Date(profile.created_at).toLocaleDateString()}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEdit(profile)}
                            className="text-xs uppercase tracking-widest border border-border px-2 py-1 hover:bg-muted"
                          >
                            Edit
                          </button>

                          {profile.role !== "reviewer" && (
                            <button
                              onClick={() => updateRole(profile.id, "reviewer")}
                              className="text-xs uppercase tracking-widest border border-[#1a2a22] text-[#1a2a22] px-2 py-1 hover:bg-[#1a2a22] hover:text-white"
                            >
                              Promote Reviewer
                            </button>
                          )}

                          {profile.role !== "editor" && (
                            <button
                              onClick={() => updateRole(profile.id, "editor")}
                              className="text-xs uppercase tracking-widest border border-border px-2 py-1 hover:bg-muted"
                            >
                              Set Editor
                            </button>
                          )}

                          {profile.role === "reviewer" && (
                            <button
                              onClick={() => updateRole(profile.id, "user")}
                              className="text-xs uppercase tracking-widest border border-border px-2 py-1 hover:bg-muted"
                            >
                              Set User
                            </button>
                          )}

                          <button
                            onClick={() => toggleActive(profile)}
                            className="text-xs uppercase tracking-widest border border-border px-2 py-1 hover:bg-muted"
                          >
                            {profile.is_active ? "Disable" : "Enable"}
                          </button>

                          <button
                            onClick={() => deleteProfile(profile)}
                            disabled={deletingId === profile.id}
                            className="text-xs uppercase tracking-widest border border-red-300 text-red-600 px-2 py-1 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === profile.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="border border-border bg-card p-6">
          <h2 className="font-serif text-xl text-foreground mb-4">Pending Reviewer Invitations</h2>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invitations.</p>
          ) : (
            <div className="space-y-3">
              {invitations.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 border border-border/60 p-3">
                  <div>
                    <p className="text-sm text-foreground">{item.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.status} | expires {new Date(item.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyLoginLink}
                      className="text-xs uppercase tracking-widest text-primary hover:underline"
                    >
                      Copy Login URL
                    </button>
                    <button
                      onClick={() => revokeInvitation(item.id)}
                      className="text-xs uppercase tracking-widest text-destructive hover:underline"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {editing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl bg-card border border-border p-6">
            <h3 className="font-serif text-xl text-foreground mb-4">Edit User</h3>

            <form onSubmit={saveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-sans uppercase tracking-widest text-foreground">Full Name</label>
                <input
                  value={editing.full_name}
                  onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
                  className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-sans uppercase tracking-widest text-foreground">Institution</label>
                <input
                  value={editing.institution}
                  onChange={(e) => setEditing({ ...editing, institution: e.target.value })}
                  className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-sans uppercase tracking-widest text-foreground">Research Field</label>
                <input
                  value={editing.research_field}
                  onChange={(e) => setEditing({ ...editing, research_field: e.target.value })}
                  className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-sans uppercase tracking-widest text-foreground">Role</label>
                  <select
                    value={editing.role}
                    onChange={(e) => setEditing({ ...editing, role: e.target.value as UserRole })}
                    className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="user">User</option>
                    <option value="editor">Editor</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="admin" disabled={hasOtherAdmin(editing.id)}>
                      Admin
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-sans uppercase tracking-widest text-foreground">Status</label>
                  <select
                    value={editing.is_active ? "active" : "disabled"}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.value === "active" })}
                    className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="flex-1 bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-3 border border-border hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary text-primary-foreground text-xs uppercase tracking-widest px-4 py-3 hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
