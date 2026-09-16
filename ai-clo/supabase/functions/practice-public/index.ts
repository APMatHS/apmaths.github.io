import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeCode(v: unknown) {
  return clean(v).toUpperCase().replace(/\s+/g, "");
}

function normalizeSeed(v: unknown) {
  return clean(v).toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
}

function randomSeed(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], salt: string) {
  const seed = xmur3(salt)();
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function getConfigByCode(code: string) {
  const { data: config, error: configError } = await admin
    .from("practice_configs")
    .select("id,subject_id,access_code,is_enabled,question_count,matrix,include_answers,allow_unlimited_redraw,open_at,close_at,title")
    .eq("access_code", code)
    .maybeSingle();
  if (configError) throw configError;
  if (!config) return { error: "Mã truy cập không hợp lệ.", status: 404 } as const;

  const now = Date.now();
  if (!config.is_enabled) return { error: "Môn này hiện chưa mở rút đề ôn tập.", status: 403 } as const;
  if (config.open_at && now < new Date(config.open_at).getTime()) {
    return { error: "Chức năng rút đề của môn này chưa đến thời gian mở.", status: 403 } as const;
  }
  if (config.close_at && now > new Date(config.close_at).getTime()) {
    return { error: "Chức năng rút đề của môn này đã đóng.", status: 403 } as const;
  }

  const { data: subject, error: subjectError } = await admin
    .from("subjects")
    .select("id,name,semester,academic_year,question_bank_id")
    .eq("id", config.subject_id)
    .single();
  if (subjectError || !subject) throw subjectError || new Error("Không tìm thấy học phần.");
  return { config, subject } as const;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Chỉ hỗ trợ POST." }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = clean(body.action || "resolve").toLowerCase();
    const code = normalizeCode(body.code);
    if (!/^[A-Z0-9-]{4,32}$/.test(code)) return json({ success: false, error: "Mã truy cập không hợp lệ." }, 400);

    const state = await getConfigByCode(code);
    if ("error" in state) return json({ success: false, error: state.error }, state.status);
    const { config, subject } = state;

    if (action === "resolve") {
      return json({
        success: true,
        subject: {
          name: subject.name,
          semester: subject.semester,
          academic_year: subject.academic_year,
        },
        practice: {
          title: config.title || `Đề ôn tập – ${subject.name}`,
          question_count: config.question_count,
          include_answers: config.include_answers,
          allow_unlimited_redraw: config.allow_unlimited_redraw,
        },
      });
    }

    if (action !== "draw") return json({ success: false, error: "Action không hợp lệ." }, 400);

    let seed = normalizeSeed(body.seed);
    if (!seed) seed = randomSeed();
    if (seed.length < 4) return json({ success: false, error: "Seed không hợp lệ." }, 400);

    let selectedIds: string[] | null = null;
    const { data: oldDraw, error: oldDrawError } = await admin
      .from("practice_draws")
      .select("selected_question_ids")
      .eq("subject_id", subject.id)
      .eq("seed", seed)
      .maybeSingle();
    if (oldDrawError) throw oldDrawError;
    if (oldDraw?.selected_question_ids?.length) selectedIds = oldDraw.selected_question_ids;

    const { data: poolRows, error: poolError } = await admin
      .from("questions")
      .select("id,content,correct_answer,explanation,chapter_id,clo_id,display_code")
      .eq("question_bank_id", subject.question_bank_id)
      .eq("question_scope", "practice")
      .eq("approval_status", "approved")
      .eq("status", "active")
      .order("id", { ascending: true });
    if (poolError) throw poolError;
    const pool = poolRows || [];
    if (!pool.length) return json({ success: false, error: "Ngân hàng chưa có câu hỏi luyện tập đã duyệt." }, 409);

    if (!selectedIds) {
      const matrix = Array.isArray(config.matrix) ? config.matrix : [];
      const requested = matrix
        .map((x: any) => ({ chapter_id: clean(x.chapter_id), clo_id: clean(x.clo_id), count: Number(x.count || 0) }))
        .filter((x: any) => x.chapter_id && x.clo_id && Number.isInteger(x.count) && x.count > 0);

      const picked: string[] = [];
      if (requested.length) {
        for (const cell of requested) {
          const candidates = pool.filter((q: any) => q.chapter_id === cell.chapter_id && q.clo_id === cell.clo_id);
          if (candidates.length < cell.count) {
            return json({ success: false, error: `Ngân hàng không còn đủ câu theo ma trận đã cấu hình (${cell.count} cần, ${candidates.length} có).` }, 409);
          }
          const chosen = shuffled(candidates, `${seed}|${cell.chapter_id}|${cell.clo_id}`).slice(0, cell.count);
          picked.push(...chosen.map((q: any) => q.id));
        }
      } else {
        const count = Math.min(Number(config.question_count || 20), pool.length);
        picked.push(...shuffled(pool, `${seed}|ALL`).slice(0, count).map((q: any) => q.id));
      }
      selectedIds = picked;

      const { error: logError } = await admin.from("practice_draws").insert({
        subject_id: subject.id,
        seed,
        selected_question_ids: selectedIds,
      });
      if (logError && !/duplicate/i.test(logError.message || "")) throw logError;
    }

    const byId = new Map(pool.map((q: any) => [q.id, q]));
    const selected = selectedIds.map((id) => byId.get(id)).filter(Boolean);
    if (!selected.length) return json({ success: false, error: "Không thể tái tạo đề từ seed này." }, 409);

    const { data: optionRows, error: optionError } = await admin
      .from("question_options")
      .select("question_id,option_key,content,image_path")
      .in("question_id", selectedIds)
      .order("option_key", { ascending: true });
    if (optionError) throw optionError;

    const optionsByQuestion = new Map<string, any[]>();
    for (const opt of optionRows || []) {
      const arr = optionsByQuestion.get(opt.question_id) || [];
      arr.push({ key: opt.option_key, content: opt.content, image_path: opt.image_path || null });
      optionsByQuestion.set(opt.question_id, arr);
    }

    const questions = selected.map((q: any, index: number) => {
      const base: Record<string, unknown> = {
        number: index + 1,
        display_code: q.display_code,
        content: q.content,
        options: optionsByQuestion.get(q.id) || [],
      };
      if (config.include_answers) {
        base.correct_answer = q.correct_answer;
        base.explanation = q.explanation || null;
      }
      return base;
    });

    return json({
      success: true,
      seed,
      subject: {
        name: subject.name,
        semester: subject.semester,
        academic_year: subject.academic_year,
      },
      practice: {
        title: config.title || `Đề ôn tập – ${subject.name}`,
        include_answers: config.include_answers,
        allow_unlimited_redraw: config.allow_unlimited_redraw,
      },
      questions,
    });
  } catch (error) {
    console.error(error);
    return json({ success: false, error: "Không thể rút đề lúc này. Vui lòng thử lại." }, 500);
  }
});
