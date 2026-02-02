import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const { invited_email, inviter_name, group_name } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:3000";
    // From address. Use a domain verified in Resend (SPF + DKIM) to avoid spam.
    // Override with FROM_EMAIL secret if you verify a subdomain (e.g. no-reply@send.budgieee.com).
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Budgieee <no-reply@budgieee.com>";

    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY secret");
      throw new Error("Missing RESEND_API_KEY");
    }

    console.log(`Sending invite email to ${invited_email} from ${FROM_EMAIL}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: invited_email,
        subject: `${inviter_name} invited you to ${group_name} on Budgieee`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e293b;">You've been invited to ${group_name}</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.5;">
              <strong>${inviter_name}</strong> invited you to join a group on Budgieee.
            </p>
            <p style="margin: 24px 0;">
              <a href="${SITE_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
                Sign in to join
              </a>
            </p>
            <p style="color: #94a3b8; font-size: 14px;">
              If you don't have an account yet, you can create one after clicking the link.
            </p>
          </div>
        `,
      }),
    });

    const responseText = await res.text();
    console.log(`Resend response (${res.status}):`, responseText);

    if (!res.ok) {
      throw new Error(`Resend error: ${responseText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-invite-email error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
