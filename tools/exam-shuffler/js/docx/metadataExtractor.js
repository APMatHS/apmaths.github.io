/* =====================================================
   metadataExtractor.js v1.0
   Đọc phần trước Câu 1 và suy ra các trường hồ sơ đề thi.
===================================================== */

import { readDocx } from "./docxReader.js";
import { loadDocument, getDocumentBody } from "./docxWriter.js";
import { splitQuestions } from "./questionSplitter.js";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function nodeText(node) {
    if (!node?.getElementsByTagNameNS) return "";
    const texts = node.getElementsByTagNameNS(W_NS, "t");
    let out = "";
    for (let i = 0; i < texts.length; i++) out += texts[i].textContent || "";
    return out.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function allHeaderText(nodes) {
    return (nodes || []).map(nodeText).filter(Boolean).join("\n");
}

function take(text, patterns) {
    for (const re of patterns) {
        const m = text.match(re);
        if (m?.[1]) return m[1].trim().replace(/[;,.]+$/, "");
    }
    return "";
}

function normalizeDate(value) {
    const s = String(value || "").trim();
    let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m) return `${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
    m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
    return s;
}

export function inferMetadataFromText(text) {
    const src = String(text || "");
    const subject = take(src, [
        /(?:Tên\s*học\s*phần|Học\s*phần|Môn(?:\s*học)?)[\s:.-]+([^\n]+)/i
    ]);
    const courseCode = take(src, [
        /(?:Mã\s*học\s*phần|Mã\s*HP|Mã\s*môn)[\s:.-]+([^\n]+)/i
    ]);
    const semester = take(src, [/(?:Học\s*kỳ|HK)[\s:.-]+([^\n]+)/i]);
    const academicYear = take(src, [/(?:Năm\s*học)[\s:.-]+([^\n]+)/i]);
    const examDate = normalizeDate(take(src, [/(?:Ngày\s*thi|Ngày)[\s:.-]+([^\n]+)/i]));
    const examSession = take(src, [/(?:Ca\s*thi|Ca)[\s:.-]+([^\n]+)/i]);
    const duration = take(src, [/(?:Thời\s*gian(?:\s*làm\s*bài)?)[\s:.-]+(\d{1,3})\s*(?:phút|phut)?/i]);
    const preparedBy = take(src, [/(?:Giảng\s*viên\s*ra\s*đề|Người\s*ra\s*đề)[\s:.-]+([^\n]+)/i]);
    const approvedBy = take(src, [/(?:Trưởng\s*bộ\s*môn|Người\s*duyệt|Phê\s*duyệt)[\s:.-]+([^\n]+)/i]);

    return {
        subject,
        courseCode,
        semester,
        academicYear,
        examDate,
        examSession,
        durationMinutes: duration ? Number(duration) : "",
        preparedBy,
        approvedBy,
        rawHeaderText: src
    };
}

export async function inferMetadataFromFile(file, expectedQuestionCount) {
    const zip = await readDocx(file);
    const xmlDoc = await loadDocument(zip);
    const body = getDocumentBody(xmlDoc);
    const split = splitQuestions(body, Number(expectedQuestionCount));
    const rawHeaderText = allHeaderText(split.headerNodes || []);
    return inferMetadataFromText(rawHeaderText);
}
