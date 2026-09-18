import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://apmaths.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);

function cors(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://apmaths.github.io";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ ok: false, error: "Origin không được phép." }, 403, origin);
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(origin) });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Chỉ hỗ trợ POST." }, 405, origin);
  }

  // The Edge Function is deployed with verify_jwt=true. Keep this explicit
  // guard as defense in depth and to avoid accidental unauthenticated use if
  // the deployment setting is changed later.
  const authorization = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) {
    return json({ ok: false, error: "Bạn chưa đăng nhập." }, 401, origin);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI_LIVE_API_KEY");
  if (!apiKey) {
    return json({ ok: false, error: "Chưa cấu hình Gemini API key." }, 500, origin);
  }

  const now = Date.now();
  const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(now + 5 * 60 * 1000).toISOString();

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/auth_tokens",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({ uses: 1, expireTime, newSessionExpireTime }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.name) {
      console.error("Gemini auth token error", response.status, data);
      return json(
        {
          ok: false,
          error: "Không tạo được Live token.",
          detail: `Gemini HTTP ${response.status}`,
        },
        502,
        origin,
      );
    }
    return json(
      {
        ok: true,
        token: data.name,
        expire_time: data.expireTime || expireTime,
      },
      200,
      origin,
    );
  } catch (error) {
    console.error("ai_live_token error", error);
    return json({ ok: false, error: "Không tạo được Live token." }, 500, origin);
  }
});
