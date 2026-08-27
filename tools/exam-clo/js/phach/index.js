// js/phach/index.js
import { isValidSbd, validateStudentIds } from "../untNormalizer.js";
import { loadUntWorkbook } from "./excelWorkbook.js";
import { extractPhachImages } from "./imageExtractor.js";
import { preprocessPhachImage } from "./imageProcessor.js";
import { recognizePhach, terminateOcr } from "./ocrEngine.js";
import { reviewSbd } from "./reviewDialog.js";

const HIGH_CONFIDENCE = 90;
const REVIEW_THRESHOLD = 70;

function confidenceLevel(confidence) {
    if (confidence >= HIGH_CONFIDENCE) return "high";
    if (confidence >= REVIEW_THRESHOLD) return "medium";
    return "low";
}

/**
 * Điền SBD còn thiếu bằng ảnh cột B. SBD đã có số được giữ nguyên, không OCR.
 */
export async function processPhach(file, untData, { onProgress } = {}) {
    const needsOcr = (untData?.students || []).some(s => !isValidSbd(s.sbd));
    let imageMap = new Map();

    if (needsOcr) {
        const workbook = await loadUntWorkbook(file);
        imageMap = extractPhachImages(workbook, 0);
    }

    const results = [];
    const total = untData.students.length;

    for (let i = 0; i < total; i++) {
        const student = untData.students[i];

        if (isValidSbd(student.sbd)) {
            const item = {
                student,
                value: student.sbd,
                confidence: 100,
                level: "high",
                status: "existing",
                label: "SBD có sẵn"
            };
            results.push(item);
            onProgress?.({ current: i + 1, total, item, results: [...results] });
            continue;
        }

        const image = imageMap.get(student.sourceRow);
        let recognized = { value: "", confidence: 0, text: "", engineAvailable: false };

        if (image?.blob) {
            const canvas = await preprocessPhachImage(image.blob);
            recognized = await recognizePhach(canvas);
        }

        let value = recognized.value;
        let reviewed = false;
        const reasonParts = [];

        if (!image?.blob) reasonParts.push("Không tìm thấy ảnh số phách ở cột B cùng hàng.");
        else if (!recognized.engineAvailable) reasonParts.push("OCR chưa tải được; vui lòng nhập số trực tiếp.");
        else if (!value) reasonParts.push("OCR chưa đọc được số rõ ràng.");
        else if (recognized.confidence < REVIEW_THRESHOLD) reasonParts.push("Độ tin cậy OCR thấp, cần xác nhận.");

        if (!value || recognized.confidence < REVIEW_THRESHOLD) {
            value = await reviewSbd({
                student,
                imageBlob: image?.blob,
                candidate: value,
                confidence: recognized.confidence,
                reason: reasonParts.join(" ")
            });
            reviewed = true;
        }

        student.sbd = value;

        const item = {
            student,
            imageBlob: image?.blob,
            value,
            rawText: recognized.text,
            confidence: recognized.confidence,
            level: confidenceLevel(recognized.confidence),
            status: reviewed ? "reviewed" : "auto",
            label: reviewed ? "Đã xác nhận" : "OCR tự động"
        };
        results.push(item);
        onProgress?.({ current: i + 1, total, item, results: [...results] });
    }

    // Dừng worker để giải phóng RAM/CPU trên điện thoại.
    await terminateOcr();

    // Nếu trùng SBD, hỏi lại các dòng trùng thay vì dừng ngay.
    let guard = 0;
    while (guard++ < 10) {
        const seen = new Map();
        const duplicateStudents = [];
        for (const student of untData.students) {
            if (seen.has(student.sbd)) duplicateStudents.push(student);
            else seen.set(student.sbd, student);
        }
        if (duplicateStudents.length === 0) break;

        for (const student of duplicateStudents) {
            const image = imageMap.get(student.sourceRow);
            const oldValue = student.sbd;
            student.sbd = await reviewSbd({
                student,
                imageBlob: image?.blob,
                candidate: oldValue,
                confidence: 0,
                reason: `SBD ${oldValue} đang bị trùng với một dòng khác. Vui lòng kiểm tra và sửa nếu cần.`
            });
            const resultItem = results.find(item => item.student === student);
            if (resultItem) {
                resultItem.value = student.sbd;
                resultItem.status = "reviewed";
                resultItem.label = "Đã xác nhận";
            }
        }
    }

    validateStudentIds(untData);
    return results;
}
