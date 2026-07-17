// ============================================
// exportMark.js
// Version 7.1 - Native ES Module (GitHub Pages)
// ============================================

// Import ExcelJS ESM từ jsDelivr
import ExcelJS from "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/+esm";

// Import formatter
import { formatWorksheet } from "./formatter.js";

/**
 * Xuất file Excel bảng điểm (Marks)
 * @param {Object} answerData Dữ liệu đáp án & CLO
 * @param {Object} untData Dữ liệu bài làm sinh viên
 */
export async function exportMark(answerData, untData) {

    // Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Marks");

    // Danh sách CLO
    const cloList = getCLOList(answerData);

    // Tạo cột
    setupWorksheetColumns(worksheet, cloList);

    // Ghi dữ liệu
    createMarkData(worksheet, untData, cloList);

    // Định dạng
    formatWorksheet(worksheet);

    // Xuất file
    await saveWorkbook(workbook, "Marks.xlsx");
}

//------------------------------------------------
// Lấy danh sách CLO
//------------------------------------------------
function getCLOList(answerData) {

    const exams = Object.keys(answerData?.exams || {});

    if (exams.length === 0) return [];

    const exam = answerData.exams[exams[0]];

    return Object.keys(exam?.cloCount || {});
}

//------------------------------------------------
// Khai báo cột
//------------------------------------------------
function setupWorksheetColumns(worksheet, cloList) {

    worksheet.columns = [

        {
            header: "STT",
            key: "stt"
        },

        {
            header: "SBD",
            key: "sbd"
        },

        ...cloList.map(clo => ({
            header: "CLO" + clo,
            key: "clo_" + clo
        })),

        {
            header: "GPA",
            key: "gpa"
        },

        {
            header: "GPA (Chữ)",
            key: "gpaWord"
        },

        {
            header: "Tổng đúng",
            key: "correct"
        }

    ];

}

//------------------------------------------------
// Ghi dữ liệu
//------------------------------------------------
function createMarkData(worksheet, untData, cloList) {

    let stt = 1;

    for (const student of untData?.students || []) {

        if (!student.result) continue;

        const row = {

            stt: stt++,

            sbd: student.sbd,

            gpa: student.result.marks?.GPA,

            gpaWord: numberToVietnamese(student.result.marks?.GPA),

            correct: student.result.correct

        };

        for (const clo of cloList) {

            row["clo_" + clo] = student.result.marks?.[clo];

        }

        worksheet.addRow(row);

    }

}

//------------------------------------------------
// Điểm thành chữ
//------------------------------------------------
function numberToVietnamese(score) {

    if (score == null || isNaN(score)) return "";

    score = Number(score).toFixed(1);

    const [a, b] = score.split(".");

    const words = [

        "Không",
        "Một",
        "Hai",
        "Ba",
        "Bốn",
        "Năm",
        "Sáu",
        "Bảy",
        "Tám",
        "Chín",
        "Mười"

    ];

    let text = Number(a) <= 10

        ? words[Number(a)]

        : a;

    text += " phẩy ";

    text += Number(b) <= 9

        ? words[Number(b)].toLowerCase()

        : b;

    return text;

}

//------------------------------------------------
// Xuất Workbook
//------------------------------------------------
async function saveWorkbook(workbook, filename) {

    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob(
        [buffer],
        {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = filename;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);

}