// =========================================
// excel.js
// Version 3.1 - Native ES Module (SheetJS for Reading)
// Đọc và phân tích file đáp án
// =========================================

import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";

/**
 * Đọc File/Blob Excel thành SheetJS Workbook
 * @param {File|Blob} file File excel người dùng upload
 * @returns {Promise<Object>} SheetJS Workbook object
 */
export async function readExcel(file) {
    const arrayBuffer = await file.arrayBuffer();
    return XLSX.read(arrayBuffer, { type: "array" });
}

/**
 * Chuyển một Worksheet thành mảng 2D (Array of Arrays)
 * @param {Object} workbook SheetJS Workbook object
 * @param {string} [sheetName] Tên sheet (mặc định lấy sheet đầu tiên)
 * @returns {Array<Array<any>>} Mảng 2D dữ liệu
 */
export function sheetToArray(workbook, sheetName) {
    const targetSheetName = sheetName || workbook.SheetNames[0];
    const sheet = workbook.Sheets[targetSheetName];

    if (!sheet) {
        throw new Error("Không tìm thấy sheet: " + targetSheetName);
    }

    // Chuyển sheet sang mảng 2D với header dạng index
    return XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: ""
    });
}

/**
 * Phân tích Workbook đáp án thành Object answerData
 * @param {Object} workbook SheetJS Workbook object
 * @returns {Object} answerData chứa thông tin các mã đề, đáp án từng câu và đếm CLO
 */
export function readAnswerWorkbook(workbook) {
    const sheetName = workbook.SheetNames[0];
    const data = sheetToArray(workbook, sheetName);

    if (data.length < 2) {
        throw new Error("File đáp án không chứa đủ dòng dữ liệu.");
    }

    // 1. Đọc dòng Tiêu Đề (Header) để xác định các mã đề và lưu vị trí cột tạm thời
    const header = data[0];
    
    console.log("HEADER =", header);

    // =======================================
// Kiểm tra đúng định dạng file đáp án
// =======================================

if (String(header[0] ?? "").trim() !== "Câu") {

    throw new Error(
`Bạn đã chọn nhầm file.

Đây không phải File Đáp Án.

Cột đầu tiên phải là "Câu".`
    );

}

let examColumnFound = false;

for (let c = 1; c < header.length; c += 2) {

    const exam = String(header[c] ?? "").trim();

    if (exam === "") continue;

    if (exam.toUpperCase() === "CLO") continue;

    examColumnFound = true;

    const cloHeader =
        String(header[c + 1] ?? "")
        .trim()
        .toUpperCase();

    if (cloHeader !== "" && cloHeader !== "CLO") {

        throw new Error(
`File đáp án không đúng định dạng.

Sau mỗi mã đề phải là một cột CLO.`
        );

    }

}

if (!examColumnFound) {

    throw new Error(
`Không tìm thấy mã đề trong file đáp án.`
    );

}
    const exams = {};
    const columnMap = {}; // Lưu tạm chỉ số cột để parse, không đưa vào output cuối

    for (let c = 1; c < header.length; c += 2) {
        let examCode = String(header[c] ?? "").trim();
        if (examCode === "") continue;

        if (examCode.toUpperCase() === "CLO") continue;

        // Chuẩn hóa mã đề thành 3 chữ số (ví dụ: 1 -> "001")
        if (!isNaN(examCode)) {
            examCode = examCode.padStart(3, "0");
        }

        // Lưu thông tin mã đề thuần túy (Không chứa answerColumn / cloColumn)
        exams[examCode] = {
            totalQuestion: 0,
            cloCount: {},
            questions: {}
        };

        // Lưu mapping vị trí cột riêng biệt
        columnMap[examCode] = {
            answerColumn: c,
            cloColumn: c + 1
        };
    }
    console.log("EXAMS =", Object.keys(exams));

    // 2. Đọc từng câu hỏi và đáp án
    for (let r = 1; r < data.length; r++) {
        const questionNum = Number(data[r][0]);
        if (!questionNum || isNaN(questionNum)) continue;

        for (const code in exams) {
            const info = exams[code];
            const cols = columnMap[code];

            const answer = String(data[r][cols.answerColumn] ?? "")
                .trim()
                .toUpperCase();

            const clo = String(data[r][cols.cloColumn] ?? "").trim();

            // Kiểm tra đáp án
if (answer === "") {
    throw new Error(
        `Mã đề ${code} thiếu đáp án ở câu ${questionNum}.`
    );
}

if (!["A", "B", "C", "D"].includes(answer)) {
    throw new Error(
        `Đáp án không hợp lệ.\n\nMã đề: ${code}\nCâu: ${questionNum}\nĐáp án: ${answer}`
    );
}


            info.totalQuestion++;

            if (clo !== "") {
                if (!info.cloCount[clo]) {
                    info.cloCount[clo] = 0;
                }
                info.cloCount[clo]++;
            }

            info.questions[questionNum] = {
                answer: answer,
                clo: clo
            };
        }
    }

  // =======================================
// Kiểm tra dữ liệu CLO
// =======================================

// Có sử dụng CLO hay không?
let hasCLO = false;

for (const code of Object.keys(exams)) {
    for (const q of Object.values(exams[code].questions)) {
        if (q.clo !== "") {
            hasCLO = true;
            break;
        }
    }
    if (hasCLO) break;
}

// Lưu trạng thái có sử dụng CLO
const useCLO = hasCLO;

// Nếu có sử dụng CLO thì mọi câu đều phải có CLO
if (useCLO) {

    for (const code of Object.keys(exams)) {

        const missing = [];

        for (const [questionNum, q] of Object.entries(exams[code].questions)) {

            if (q.clo === "") {
                missing.push(questionNum);
            }

        }

        if (missing.length > 0) {

            throw new Error(
                `Mã đề ${code} thiếu CLO ở câu:\n\n${missing.join(", ")}`
            );

        }

    }

}
    // Kiểm tra tất cả mã đề có cùng số câu
const examCodes = Object.keys(exams);

if (examCodes.length > 0) {

    const standardCount = exams[examCodes[0]].totalQuestion;

    for (const code of examCodes) {
        if (exams[code].totalQuestion !== standardCount) {

            let detail = "";

            for (const c of examCodes) {
                detail += `${c}: ${exams[c].totalQuestion} câu\n`;
            }

            throw new Error(
                "Số câu giữa các mã đề không đồng nhất.\n\n" + detail
            );
        }
    }
}

    // Lấy số câu của đề đầu tiên để kiểm tra với file UnT
const totalQuestion =
    examCodes.length > 0
        ? exams[examCodes[0]].totalQuestion
        : 0;

// Trả về Object thuần túy gọn nhẹ
return {
    sheetName: sheetName,
    totalQuestion: totalQuestion,
    useCLO: useCLO,
    exams: exams
};
}