// ============================================
// exportDetail.js
// Version 7.1 - Native ES Module (ExcelJS)
// ============================================

import ExcelJS from "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/+esm";
import { formatWorksheet } from "./formatter.js";

/**
 * Xuất file Excel bảng chi tiết điểm và số câu đúng theo CLO (Detail)
 * @param {Object} answerData Dữ liệu đáp án & cấu trúc CLO
 * @param {Object} untData Dữ liệu kết quả bài làm học sinh
 */
export async function exportDetail(answerData, untData) {
    // 1. Khởi tạo Workbook & Worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("ChiTiet");

    // 2. Chuẩn bị danh sách CLO
    const cloList = getCLOList(answerData);

    // 3. Xây dựng Cột & Dòng Tiêu Đề
    setupWorksheetColumns(worksheet, cloList);

    // 4. Đổ dữ liệu chi tiết sinh viên
    createDetailData(worksheet, untData, cloList);

    // 5. Áp dụng định dạng chung từ formatter.js
    formatWorksheet(worksheet);

    // 6. Lưu và tải xuống file Excel
    await saveWorkbook(workbook, "Detail.xlsx");
}

//------------------------------------------------
// Trích xuất danh sách CLO
//------------------------------------------------
function getCLOList(answerData) {
    const exams = Object.keys(answerData?.exams || {});
    if (exams.length > 0) {
        const exam = answerData.exams[exams[0]];
        return Object.keys(exam?.cloCount || {});
    }
    return [];
}

//------------------------------------------------
// Khởi tạo các cột
//------------------------------------------------
function setupWorksheetColumns(worksheet, cloList) {
    const columns = [
        { header: "STT", key: "stt" },
        { header: "SBD", key: "sbd" }
    ];

    // Tạo 2 cột cho mỗi CLO: Số câu đúng và Điểm
    for (const clo of cloList) {
        columns.push({
            header: "Số câu đúng CLO" + clo,
            key: "clo_correct_" + clo
        });
        columns.push({
            header: "Điểm CLO" + clo,
            key: "clo_score_" + clo
        });
    }

    // Cột tổng hợp GPA
    columns.push({ header: "GPA", key: "gpa" });

    worksheet.columns = columns;
}

//------------------------------------------------
// Đổ dữ liệu vào các dòng
//------------------------------------------------
function createDetailData(worksheet, untData, cloList) {
    let stt = 1;

    for (const student of untData?.students || []) {
        if (!student.result) {
            continue;
        }

        const rowData = {
            stt: stt++,
            sbd: student.sbd,
            gpa: student.result.marks?.GPA
        };

        // Điền số câu đúng và điểm cho từng CLO
        for (const clo of cloList) {
            rowData["clo_correct_" + clo] = student.result.clo?.[clo]?.correctCount;
            rowData["clo_score_" + clo] = student.result.detail?.[clo]?.score;
        }

        worksheet.addRow(rowData);
    }
}

//------------------------------------------------
// Tải xuống file Excel trên Trình duyệt
//------------------------------------------------
async function saveWorkbook(workbook, filename) {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}