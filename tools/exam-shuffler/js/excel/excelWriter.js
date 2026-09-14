/* =====================================================
   excelWriter.js v1.3
   - Đáp án dọc.
   - Đáp án ngang.
   - CLO Statistics.
   - Đối chiếu đề sau trộn với đề gốc.
   - Phân tích đề gốc.
===================================================== */

import * as ExcelJS from "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/+esm";
const Excel = ExcelJS.default ?? ExcelJS;

import { exportAnswers } from "./answerExporter.js";
import { formatWorksheet } from "./formatter.js";
import { exportCLOStatistics } from "./cloStatisticsExporter.js";
import { exportHorizontalAnswers } from "./horizontalAnswerExporter.js";
import { exportQuestionMapping, exportSourceAnalysis } from "./mappingExporter.js";

function formatAnalysisWorksheet(worksheet) {
    formatWorksheet(worksheet);
    worksheet.eachRow(row => {
        row.eachCell(cell => {
            cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
        });
    });
    if (worksheet.rowCount > 0) {
        worksheet.getRow(1).eachCell(cell => {
            cell.font = { name: "Times New Roman", size: 12, bold: true };
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        });
    }
}

export async function buildAnswerWorkbook(exams, sourceQuestions = []) {
    if (!Array.isArray(exams) || exams.length === 0) {
        throw new Error("[excelWriter] Danh sách bộ đề (exams) không hợp lệ hoặc rỗng.");
    }
    if (!Excel || typeof Excel.Workbook !== "function") {
        throw new Error("[excelWriter] Thư viện ExcelJS chưa được nạp chính xác.");
    }

    const workbook = new Excel.Workbook();
    workbook.creator = "Exam Shuffler";
    workbook.lastModifiedBy = "Exam Shuffler";
    workbook.company = "Exam Shuffler";
    workbook.title = "Exam Answer Key";
    workbook.subject = "Answer Key";
    workbook.description = "Generated automatically by Exam Shuffler Engine";
    workbook.created = new Date();
    workbook.modified = new Date();

    const answerSheet = workbook.addWorksheet("Đáp án", { views: [{ showGridLines: true }] });
    exportAnswers(answerSheet, exams);
    formatWorksheet(answerSheet);

    const horizontalSheet = workbook.addWorksheet("Đáp án ngang", { views: [{ showGridLines: true }] });
    exportHorizontalAnswers(horizontalSheet, exams);
    formatWorksheet(horizontalSheet);
    horizontalSheet.getColumn(1).width = 12;

    const cloSheet = workbook.addWorksheet("CLO Statistics", { views: [{ showGridLines: true }] });
    exportCLOStatistics(cloSheet, exams);
    formatWorksheet(cloSheet);

    const mappingSheet = workbook.addWorksheet("Đối chiếu đề", { views: [{ showGridLines: true }] });
    exportQuestionMapping(mappingSheet, exams);
    formatWorksheet(mappingSheet);
    mappingSheet.getColumn(1).width = 12;
    mappingSheet.getColumn(2).width = 10;
    mappingSheet.getColumn(3).width = 16;
    mappingSheet.getColumn(4).width = 16;
    mappingSheet.getColumn(5).width = 12;
    mappingSheet.getColumn(6).width = 13;
    mappingSheet.getColumn(7).width = 10;

    const sourceSheet = workbook.addWorksheet("Phân tích đề gốc", { views: [{ showGridLines: true }] });
    exportSourceAnalysis(sourceSheet, sourceQuestions);
    formatAnalysisWorksheet(sourceSheet);
    sourceSheet.getColumn(1).width = 12;
    sourceSheet.getColumn(2).width = 14;
    sourceSheet.getColumn(3).width = 13;
    sourceSheet.getColumn(4).width = 10;
    sourceSheet.getColumn(5).width = 50;
    for (let c = 6; c <= 9; c++) sourceSheet.getColumn(c).width = 28;

    return workbook;
}
