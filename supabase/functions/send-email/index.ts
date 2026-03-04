// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createTransport } from "https://deno.land/x/nodemailer/mod.ts";

const smtpHost = Deno.env.get("SMTP_HOST") ?? "";
const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
const smtpUser = Deno.env.get("SMTP_USER") ?? "";
const smtpPass = Deno.env.get("SMTP_PASS") ?? "";
const smtpFrom = Deno.env.get("SMTP_FROM") || "noreply@rs-journal.com";

const transporter = createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    auth: {
        user: smtpUser,
        pass: smtpPass,
    },
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { to, subject, body, html } = await req.json();

        if (!to || !subject || (!body && !html)) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: to, subject, body/html" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        await transporter.sendMail({
            from: smtpFrom,
            to,
            subject,
            text: body,
            html: html || undefined,
        });

        return new Response(
            JSON.stringify({ success: true }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
