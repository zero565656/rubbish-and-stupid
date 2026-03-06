import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createTransport } from "npm:nodemailer@6";
import { createClient } from "npm:@supabase/supabase-js@2";

const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.163.com";
const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587", 10);
const smtpUser = Deno.env.get("SMTP_USER") || "";
const smtpPass = Deno.env.get("SMTP_PASS") || "";
const smtpFrom = Deno.env.get("SMTP_FROM") || "";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const transporter = createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BasicEmailPayload = {
  to: string;
  subject: string;
  body?: string;
  html?: string;
  mode?: string;
};

type CreateReviewerAccountPayload = {
  mode: "create_reviewer_account";
  reviewerEmail: string;
  reviewerName: string;
  loginUrl?: string;
};

const randomNumericPassword = (length = 8) => {
  const firstDigit = Math.floor(Math.random() * 9) + 1;
  const rest = Array.from({ length: Math.max(length - 1, 0) }, () => Math.floor(Math.random() * 10)).join("");
  return `${firstDigit}${rest}`.slice(0, length);
};

const isEmailAlreadyRegisteredError = (error: unknown) => {
  const message = String((error as any)?.message || "").toLowerCase();
  return message.includes("already been registered") || message.includes("already exists");
};

const findAuthUserByEmail = async (
  adminClient: ReturnType<typeof createClient>,
  email: string
) => {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    const matched = users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (matched) return matched;

    if (users.length < perPage) break;
    page += 1;
  }

  return null;
};

const parseBearerToken = (authorization: string | null) => {
  if (!authorization) return "";
  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  if (!scheme || !token) return "";
  if (scheme.toLowerCase() !== "bearer") return "";
  return token.trim();
};

const applyTemporaryPassword = async (
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  reviewerName: string,
  temporaryPassword: string
) => {
  const { data: existingUserData, error: existingUserError } = await adminClient.auth.admin.getUserById(userId);
  if (existingUserError || !existingUserData.user) {
    throw new Error(existingUserError?.message || "Failed to load target user for password reset.");
  }

  const { error: resetPasswordError } = await adminClient.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
    email_confirm: true,
    ban_duration: "none",
    user_metadata: {
      ...(existingUserData.user.user_metadata || {}),
      full_name: reviewerName,
    },
  });

  if (resetPasswordError) {
    throw new Error(resetPasswordError.message || "Failed to reset reviewer password.");
  }
};

const verifyReviewerCredentials = async (
  reviewerEmail: string,
  temporaryPassword: string
) => {
  // Verify the generated password can actually sign in before emailing credentials.
  const verificationClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: verifyError } = await verificationClient.auth.signInWithPassword({
    email: reviewerEmail,
    password: temporaryPassword,
  });

  if (verifyError) {
    throw new Error(`Credential verification failed: ${verifyError.message}`);
  }

  await verificationClient.auth.signOut();
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sendBasicEmail = async (payload: BasicEmailPayload) => {
  const { to, subject, body, html } = payload;

  if (!to || !subject || (!body && !html)) {
    return jsonResponse(400, { error: "Missing required fields: to, subject, body/html" });
  }

  await transporter.sendMail({
    from: smtpFrom || smtpUser,
    to,
    subject,
    text: body,
    html: html || undefined,
  });

  return jsonResponse(200, { success: true });
};

const sendReviewerOnboardingEmail = async (
  reviewerEmail: string,
  reviewerName: string,
  tempPassword: string,
  loginUrl: string
) => {
  const subject = "R&S Journal Reviewer Account Created";
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reviewer Invitation - R&S Journal</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f2f4f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

    <!-- 外部容器：模拟灰色背景 -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f2f4f6; padding: 40px 0;">
        <tr>
            <td align="center">
                
                <!-- 核心卡片 -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e1e4e8;">
                    
                    <!-- 1. 顶部 LOGO 区域：极具官方感的深红色 -->
                    <tr>
                        <td align="center" style="background-color: #8B0000; padding: 35px 40px; border-bottom: 4px solid #5a0000;">
                            <!-- 纯CSS绘制的Logo -->
                            <div style="font-family: 'Georgia', 'Times New Roman', serif; color: #ffffff; letter-spacing: 2px; text-transform: uppercase;">
                                <div style="font-size: 36px; font-weight: bold; line-height: 1; margin-bottom: 5px;">R<span style="color: #ffcccc;">&</span>S</div>
                                <div style="font-size: 12px; opacity: 0.9; letter-spacing: 4px; border-top: 1px solid rgba(255,255,255,0.3); border-bottom: 1px solid rgba(255,255,255,0.3); padding: 4px 0; display: inline-block;">Rubbish & Stupid</div>
                            </div>
                            <div style="color: #ffcccc; font-size: 10px; margin-top: 8px; font-style: italic; font-family: serif;">Est. 2026 • The Journal of Questionable Integrity</div>
                        </td>
                    </tr>

                    <!-- 2. 正文区域 -->
                    <tr>
                        <td style="padding: 40px 50px; color: #333333;">
                            <h2 style="margin: 0 0 20px; font-family: 'Georgia', serif; color: #111; font-size: 22px;">
                                Appointment Notification
                            </h2>
                            
                            <p style="margin: 0 0 16px; line-height: 1.6; font-size: 15px;">
                                Dear <strong>${reviewerName}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 20px; line-height: 1.6; font-size: 15px; color: #555;">
                                We are pleased (and slightly apologetic) to inform you that you have been selected as a distinguished peer reviewer for the <strong>R&S Journal</strong>. 
                            </p>

                            <!-- 3. 账号密码框：设计成“机密卡片”的样子 -->
                            <div style="background-color: #fff9f9; border-left: 4px solid #8B0000; padding: 20px; margin: 25px 0; border-radius: 4px; border: 1px solid #eee; border-left-width: 4px; border-left-color: #8B0000;">
                                <p style="margin: 0 0 10px; font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 1px; font-weight: bold;">Reviewer Credentials</p>
                                
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td width="30%" style="font-size: 14px; color: #555; padding-bottom: 5px;">ID / Email:</td>
                                        <td style="font-size: 14px; color: #111; font-weight: bold; padding-bottom: 5px; font-family: monospace;">${reviewerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="font-size: 14px; color: #555;">Password:</td>
                                        <td style="font-size: 14px; color: #111; font-weight: bold; background-color: #eee; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${tempPassword}</td>
                                    </tr>
                                </table>
                            </div>

                            <p style="margin: 0 0 25px; line-height: 1.6; font-size: 14px; color: #666;">
                                <em>Security Notice: For the safety of our dubious data, please change your password immediately upon your first login.</em>
                            </p>

                            <!-- 4. 按钮：显眼、权威 -->
                            <div style="text-align: center; margin-bottom: 10px;">
                                <a href="${loginUrl}" style="display: inline-block; background-color: #2c3e50; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 4px; font-weight: bold; font-size: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                                    Access Reviewer Portal &rarr;
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- 5. 底部版权 -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 40px; border-top: 1px solid #e1e4e8; text-align: center;">
                            <p style="margin: 0 0 10px; font-size: 11px; color: #999; line-height: 1.5;">
                                © 2026 R&S Journal (Rubbish & Stupid). All rights reserved.<br>
                                101 Trash Can Avenue, Recycled City, RC 00000
                            </p>
                            <p style="margin: 0; font-size: 10px; color: #bbb; font-style: italic;">
                                You received this email because your academic standards matched our criteria. <br>To unsubscribe, simply throw your computer in the bin.
                            </p>
                        </td>
                    </tr>
                </table>

            </td>
        </tr>
    </table>

</body>
</html>
  `;

  await transporter.sendMail({
    from: smtpFrom || smtpUser,
    to: reviewerEmail,
    subject,
    html,
    text: `Dear ${reviewerName},

You have been added as a reviewer for R&S Journal.
Account: ${reviewerEmail}
Temporary Password: ${tempPassword}
Login: ${loginUrl}

Please sign in and change your password as soon as possible.`,
  });
};

const handleCreateReviewerAccount = async (
  payload: CreateReviewerAccountPayload,
  authorizationHeader: string | null
) => {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(500, { error: "Function is missing Supabase service configuration." });
  }

  const reviewerEmail = payload.reviewerEmail?.trim().toLowerCase();
  const reviewerName = payload.reviewerName?.trim();
  const loginUrl = (payload.loginUrl || "").trim() || "https://example.com/admin/login";

  if (!reviewerEmail || !reviewerName) {
    return jsonResponse(400, { error: "Missing reviewerEmail or reviewerName." });
  }

  const accessToken = parseBearerToken(authorizationHeader);
  if (!accessToken) {
    return jsonResponse(401, { error: "Missing Authorization bearer token." });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Validate caller session with anon key client; admin client is used only for privileged ops.
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return jsonResponse(401, { error: "Invalid or expired session." });
  }

  const { data: requesterProfile, error: requesterProfileError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (requesterProfileError) {
    return jsonResponse(500, { error: requesterProfileError.message });
  }
  if (!requesterProfile || requesterProfile.role !== "admin") {
    return jsonResponse(403, { error: "Admin permission required." });
  }

  const temporaryPassword = randomNumericPassword(8);
  let createdNewUser = false;
  let accountAlreadyExisted = false;
  let targetUserId = "";

  const { data: createdUserData, error: createUserError } = await adminClient.auth.admin.createUser({
    email: reviewerEmail,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: reviewerName },
  });

  if (createUserError) {
    if (!isEmailAlreadyRegisteredError(createUserError)) {
      return jsonResponse(400, {
        error: createUserError.message || "Failed to create reviewer account.",
      });
    }

    const existingUser = await findAuthUserByEmail(adminClient, reviewerEmail);
    if (!existingUser?.id) {
      return jsonResponse(400, { error: "This email is already registered, but user lookup failed." });
    }

    targetUserId = existingUser.id;
    accountAlreadyExisted = true;
  } else if (createdUserData?.user?.id) {
    targetUserId = createdUserData.user.id;
    createdNewUser = true;
  } else {
    return jsonResponse(500, { error: "Failed to create reviewer account." });
  }

  try {
    await applyTemporaryPassword(adminClient, targetUserId, reviewerName, temporaryPassword);
    await verifyReviewerCredentials(reviewerEmail, temporaryPassword);

    const { data: upsertedProfile, error: upsertProfileError } = await adminClient.from("profiles").upsert(
      {
        id: targetUserId,
        role: "reviewer",
        full_name: reviewerName,
        is_active: true,
      } as any,
      { onConflict: "id" }
    ).select("*").single();

    if (upsertProfileError) {
      throw new Error(upsertProfileError.message);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invitationData, error: invitationUpsertError } = await adminClient.from("reviewer_invitations").upsert(
      {
        email: reviewerEmail,
        token: crypto.randomUUID(),
        invited_by: authData.user.id,
        status: "registered",
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "email" }
    ).select("*").single();

    if (invitationUpsertError) {
      throw new Error(invitationUpsertError.message);
    }

    await sendReviewerOnboardingEmail(reviewerEmail, reviewerName, temporaryPassword, loginUrl);

    return jsonResponse(200, {
      success: true,
      message: accountAlreadyExisted
        ? "Reviewer account already existed. Password reset verified and onboarding email sent."
        : "Reviewer account created. Password verified and onboarding email sent.",
      invitation: invitationData,
      profile: upsertedProfile,
    });
  } catch (error) {
    if (createdNewUser && targetUserId) {
      await adminClient.auth.admin.deleteUser(targetUserId);
    }
    await adminClient.from("reviewer_invitations").delete().eq("email", reviewerEmail);
    throw error;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    if (payload?.mode === "create_reviewer_account") {
      return await handleCreateReviewerAccount(
        payload as CreateReviewerAccountPayload,
        req.headers.get("Authorization")
      );
    }

    return await sendBasicEmail(payload as BasicEmailPayload);
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) });
  }
});
