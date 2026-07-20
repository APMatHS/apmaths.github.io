/* =====================================================
   excelWriter.js
   Exam Shuffler v1.2 - Excel Answer Sheet Orchestrator

   Chức năng:
   - Khởi tạo ExcelJS Workbook và Worksheet "Đáp án".
   - Thiết lập Metadata đầy đủ cho file Excel.
   - Gọi answerExporter để ghi dữ liệu thô và formatter để định dạng giao diện.
   - Chuẩn ES Module thuần cho toàn bộ hệ thống.
===================================================== */

import * as ExcelJS from "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/+esm";
const Excel = ExcelJS.default ?? ExcelJS;
import { exportAnswers } from "./answerExporter.js";
import { formatWorksheet } from "./formatter.js";
console.log("ExcelJS =", ExcelJS);

import { exportCLOStatistics } from "./cloStatisticsExporter.js";
/**
 * Xây dựng và định dạng Excel Workbook bảng đáp án tổng hợp
 * 
 * @param {Array<Object>} exams - Danh sách các bộ đề thi (chứa examCode và mảng questions)
 * @returns {Promise<ExcelJS.Workbook>} Đối tượng ExcelJS Workbook sẵn sàng cho xuất file
 */
export async function buildAnswerWorkbook(exams) {
    // 1. Validation Fail-Fast
    if (!Array.isArray(exams) || exams.length === 0) {
        throw new Error("[excelWriter] Danh sách bộ đề (exams) không hợp lệ hoặc rỗng.");
    }

    if (!Excel || typeof Excel.Workbook !== "function") {
    throw new Error("[excelWriter] Thư viện ExcelJS chưa được nạp chính xác.");
}

    // 2. Khởi tạo Workbook & Cài đặt Metadata
    const workbook = new Excel.Workbook();
    workbook.creator = "Exam Shuffler";
    workbook.lastModifiedBy = "Exam Shuffler";
    workbook.company = "Exam Shuffler";
    workbook.title = "Exam Answer Key";
    workbook.subject = "Answer Key";
    workbook.description = "Generated automatically by Exam Shuffler Engine";
    workbook.created = new Date();
    workbook.modified = new Date();

    // 3. Tạo Worksheet "Đáp án"
    const worksheet = workbook.addWorksheet("Đáp án", {
        views: [{ showGridLines: true }]
    });

    // 4. Đổ dữ liệu đáp án & CLO vào Worksheet
    exportAnswers(worksheet, exams);

    // 5. Áp dụng Định dạng Giao diện (Styles, Borders, Alignment)
    formatWorksheet(worksheet);
    const cloWorksheet = workbook.addWorksheet("CLO Statistics", {
    views: [{ showGridLines: true }]
});

exportCLOStatistics(cloWorksheet, exams);
formatWorksheet(cloWorksheet);

    return workbook;
}