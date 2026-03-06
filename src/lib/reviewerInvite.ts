import { supabase } from "@/lib/supabase";

type InviteReviewerInput = {
  reviewerEmail: string;
  reviewerName: string;
};

export const inviteReviewerWithAutoAccount = async ({
  reviewerEmail,
  reviewerName,
}: InviteReviewerInput) => {
  const reviewerLoginUrl = (import.meta.env.VITE_REVIEWER_LOGIN_URL as string | undefined)?.trim();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error("Session expired. Please sign in again.");
  }

  // Ensure latest token is used by the Supabase client before invoking Edge Function.
  await supabase.auth.refreshSession();

  const { data, error } = await supabase.functions.invoke("send-email", {
    body: {
      mode: "create_reviewer_account",
      reviewerEmail: reviewerEmail.trim(),
      reviewerName: reviewerName.trim(),
      loginUrl: reviewerLoginUrl || `${window.location.origin}/admin/login`,
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to invite reviewer.");
  }

  if ((data as any)?.error) {
    throw new Error((data as any).error);
  }

  return data;
};
