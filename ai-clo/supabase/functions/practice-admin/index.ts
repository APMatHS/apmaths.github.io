import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const url = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const teacherRoles = new Set(["teacher", "lecturer", "giangvien"]);

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function clean(v: unknown) { return String(v ?? "").trim(); }
function normalizeCode(v: unknown) { return clean(v).toUpperCase().replace(/\s+/g, ""); }
function asBool(v: unknown, fallback = false) { return typeof v === "boolean" ? v : fallback; }
function randomCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
async function uniqueCode() {
  for (let i = 0; i < 8; i++) {
    const code = randomCode();
    const { data } = await admin.from("practice_configs").select("id").eq("access_code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Không tạo được mã truy cập duy nhất.");
}
async function getCaller(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData.user) return null;
  const { data: profile } = await admin.from("profiles").select("id,role,is_active,full_name,email").eq("id", userData.user.id).maybeSingle();
  if (!profile || profile.is_active === false) return null;
  return profile;
}
async function allowedSubjectIds(profile: any) {
  if (clean(profile.role) === "admin") return null;
  const { data, error } = await admin.from("subject_members").select("subject_id,role").eq("user_id", profile.id);
  if (error) throw error;
  return (data || []).filter((x: any) => teacherRoles.has(clean(x.role))).map((x: any) => x.subject_id);
}
async function assertAccess(profile: any, subjectId: string) {
  if (clean(profile.role) === "admin") return true;
  const { data, error } = await admin.from("subject_members").select("id,role").eq("subject_id", subjectId).eq("user_id", profile.id).maybeSingle();
  if (error) throw error;
  return !!data && teacherRoles.has(clean(data.role));
}
async function subjectMeta(subjectId: string) {
  const { data, error } = await admin.from("subjects").select("id,name,semester,academic_year,question_bank_id").eq("id", subjectId).single();
  if (error || !data) throw error || new Error("Không tìm thấy học phần.");
  return data;
}
async function availability(questionBankId: string) {
  const { data, error } = await admin.from("questions")
    .select("id,chapter_id,clo_id")
    .eq("question_bank_id", questionBankId)
    .eq("question_scope", "practice")
    .eq("approval_status", "approved")
    .eq("status", "active");
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const q of data || []) {
    const key = `${q.chapter_id}|${q.clo_id}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return { rows: data || [], counts };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ success: false, error: "Chỉ hỗ trợ POST." }, 405);
  try {
    const profile = await getCaller(req);
    if (!profile) return reply({ success: false, error: "Phiên đăng nhập không hợp lệ." }, 401);
    const body = await req.json().catch(() => ({}));
    const action = clean(body.action || "list").toLowerCase();

    if (action === "list") {
      const allowed = await allowedSubjectIds(profile);
      if (Array.isArray(allowed) && !allowed.length) return reply({ success: true, subjects: [] });
      let query = admin.from("subjects").select("id,name,semester,academic_year,question_bank_id").order("name");
      if (Array.isArray(allowed)) query = query.in("id", allowed);
      const { data: subjects, error } = await query;
      if (error) throw error;
      const ids = (subjects || []).map((s: any) => s.id);
      let configs: any[] = [];
      if (ids.length) {
        const { data, error: configError } = await admin.from("practice_configs")
          .select("subject_id,access_code,is_enabled,question_count,include_answers,allow_unlimited_redraw,open_at,close_at,title,updated_at")
          .in("subject_id", ids);
        if (configError) throw configError;
        configs = data || [];
      }
      const bySubject = new Map(configs.map((c: any) => [c.subject_id, c]));
      return reply({
        success: true,
        subjects: (subjects || []).map((s: any) => ({ ...s, practice: bySubject.get(s.id) || null })),
      });
    }

    const subjectId = clean(body.subject_id);
    if (!subjectId) return reply({ success: false, error: "Thiếu subject_id." }, 400);
    if (!(await assertAccess(profile, subjectId))) return reply({ success: false, error: "Bạn không có quyền quản lý học phần này." }, 403);
    const subject = await subjectMeta(subjectId);

    if (action === "detail") {
      const [{ data: config, error: configError }, { data: chapters, error: chapterError }, { data: clos, error: cloError }, avail] = await Promise.all([
        admin.from("practice_configs").select("*").eq("subject_id", subjectId).maybeSingle(),
        admin.from("chapters").select("id,name,order_index").eq("question_bank_id", subject.question_bank_id).order("order_index"),
        admin.from("clos").select("id,code,description,short_description").eq("question_bank_id", subject.question_bank_id).order("code"),
        availability(subject.question_bank_id),
      ]);
      if (configError || chapterError || cloError) throw configError || chapterError || cloError;
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [{ count: totalDraws }, { count: weekDraws }] = await Promise.all([
        admin.from("practice_draws").select("id", { count: "exact", head: true }).eq("subject_id", subjectId),
        admin.from("practice_draws").select("id", { count: "exact", head: true }).eq("subject_id", subjectId).gte("drawn_at", sevenDaysAgo),
      ]);
      return reply({
        success: true,
        subject,
        config: config || null,
        chapters: chapters || [],
        clos: clos || [],
        availability: avail.counts,
        total_available: avail.rows.length,
        stats: { total_draws: totalDraws || 0, week_draws: weekDraws || 0 },
      });
    }

    if (action === "rotate_code") {
      const code = await uniqueCode();
      const now = new Date().toISOString();
      const { data: existing } = await admin.from("practice_configs").select("id").eq("subject_id", subjectId).maybeSingle();
      let result;
      if (existing) {
        result = await admin.from("practice_configs").update({ access_code: code, updated_by: profile.id, updated_at: now }).eq("subject_id", subjectId).select("*").single();
      } else {
        result = await admin.from("practice_configs").insert({ subject_id: subjectId, access_code: code, is_enabled: false, updated_by: profile.id }).select("*").single();
      }
      if (result.error) throw result.error;
      return reply({ success: true, config: result.data });
    }

    if (action !== "save") return reply({ success: false, error: "Action không hợp lệ." }, 400);

    let accessCode = normalizeCode(body.access_code);
    if (!accessCode) accessCode = await uniqueCode();
    if (!/^[A-Z0-9-]{4,32}$/.test(accessCode)) {
      return reply({ success: false, error: "Mã truy cập chỉ dùng A-Z, 0-9, dấu gạch ngang; dài 4-32 ký tự." }, 400);
    }

    const { data: chapters, error: chapterError } = await admin.from("chapters").select("id").eq("question_bank_id", subject.question_bank_id);
    const { data: clos, error: cloError } = await admin.from("clos").select("id").eq("question_bank_id", subject.question_bank_id);
    if (chapterError || cloError) throw chapterError || cloError;
    const chapterIds = new Set((chapters || []).map((x: any) => x.id));
    const cloIds = new Set((clos || []).map((x: any) => x.id));
    const rawMatrix = Array.isArray(body.matrix) ? body.matrix : [];
    const matrix: Array<{ chapter_id: string; clo_id: string; count: number }> = [];
    for (const raw of rawMatrix) {
      const chapter_id = clean(raw.chapter_id), clo_id = clean(raw.clo_id), count = Number(raw.count || 0);
      if (!count) continue;
      if (!chapterIds.has(chapter_id) || !cloIds.has(clo_id) || !Number.isInteger(count) || count < 0 || count > 200) {
        return reply({ success: false, error: "Ma trận Chương × CLO không hợp lệ." }, 400);
      }
      matrix.push({ chapter_id, clo_id, count });
    }

    const avail = await availability(subject.question_bank_id);
    let questionCount = Number(body.question_count || 20);
    if (matrix.length) {
      questionCount = matrix.reduce((sum, x) => sum + x.count, 0);
      for (const cell of matrix) {
        const have = avail.counts[`${cell.chapter_id}|${cell.clo_id}`] || 0;
        if (have < cell.count) {
          return reply({ success: false, error: `Ma trận yêu cầu ${cell.count} câu nhưng ô tương ứng chỉ có ${have} câu đã duyệt.` }, 409);
        }
      }
    } else {
      if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 200) return reply({ success: false, error: "Số câu phải từ 1 đến 200." }, 400);
      if (questionCount > avail.rows.length) return reply({ success: false, error: `Ngân hàng chỉ có ${avail.rows.length} câu luyện tập đã duyệt.` }, 409);
    }
    if (questionCount < 1 || questionCount > 200) return reply({ success: false, error: "Tổng số câu trong ma trận phải từ 1 đến 200." }, 400);

    const openAt = clean(body.open_at) || null;
    const closeAt = clean(body.close_at) || null;
    if (openAt && Number.isNaN(Date.parse(openAt))) return reply({ success: false, error: "Thời gian mở không hợp lệ." }, 400);
    if (closeAt && Number.isNaN(Date.parse(closeAt))) return reply({ success: false, error: "Thời gian đóng không hợp lệ." }, 400);
    if (openAt && closeAt && new Date(openAt) >= new Date(closeAt)) return reply({ success: false, error: "Thời gian đóng phải sau thời gian mở." }, 400);

    const payload = {
      subject_id: subjectId,
      access_code: accessCode,
      is_enabled: asBool(body.is_enabled, false),
      question_count: questionCount,
      matrix,
      include_answers: asBool(body.include_answers, false),
      allow_unlimited_redraw: asBool(body.allow_unlimited_redraw, true),
      open_at: openAt,
      close_at: closeAt,
      title: clean(body.title) || null,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await admin.from("practice_configs").upsert(payload, { onConflict: "subject_id" }).select("*").single();
    if (error) {
      if (/duplicate|unique/i.test(error.message || "")) return reply({ success: false, error: "Mã truy cập này đang được môn khác sử dụng." }, 409);
      throw error;
    }
    return reply({ success: true, config: data });
  } catch (error) {
    console.error(error);
    return reply({ success: false, error: "Không thể xử lý cấu hình rút đề lúc này." }, 500);
  }
});
