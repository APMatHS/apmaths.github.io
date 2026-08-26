// =========================================
// excel.js
// Version 4.0 - Local SheetJS (không phụ thuộc CDN)
// =========================================

function getXLSX() {
    const lib = globalThis.XLSX;
    if (!lib) {
        throw new Error("Không tải được thư viện đọc Excel (SheetJS). Vui lòng kiểm tra thư mục libs.");
    }
    return lib;
}

/**
 * Đọc File/Blob Excel thành SheetJS Workbook.
 */
export async function readExcel(file) {
    const XLSX = getXLSX();
    const arrayBuffer = await file.arrayBuffer();
    return XLSX.read(arrayBuffer, { type: "array" });
}

/**
 * Chuyển worksheet đầu tiên (hoặc sheet được chỉ định) thành mảng 2D.
 */
export function sheetToArray(workbook, sheetName) {
    const XLSX = getXLSX();
    const targetSheetName = sheetName || workbook.SheetNames?.[0];
    const sheet = workbook.Sheets?.[targetSheetName];

    if (!sheet) {
        throw new Error("Không tìm thấy sheet: " + targetSheetName);
    }

    return XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: true
    });
}

function normalizeExamCode(value) {
    let code = String(value ?? "").trim();
    if (/^\d+$/.test(code)) code = code.padStart(3, "0");
    return code;
}

/**
 * Phân tích Workbook đáp án thành Object answerData.
 */
export function readAnswerWorkbook(workbook) {
    const sheetName = workbook.SheetNames?.[0];
    const data = sheetToArray(workbook, sheetName);

    if (data.length < 2) {
        throw new Error("File đáp án không chứa đủ dòng dữ liệu.");
    }

    const header = data[0] || [];

    if (String(header[0] ?? "").trim().toLowerCase() !== "câu") {
        throw new Error(
            'Bạn đã chọn nhầm file.\n\nĐây không phải File Đáp Án.\nCột đầu tiên phải là "Câu".'
        );
    }

    const exams = {};
    const columnMap = {};

    for (let c = 1; c < header.length; c += 2) {
        const rawCode = String(header[c] ?? "").trim();
        if (!rawCode || rawCode.toUpperCase() === "CLO") continue;

        const cloHeader = String(header[c + 1] ?? "").trim().toUpperCase();
        if (cloHeader !== "" && cloHeader !== "CLO") {
            throw new Error("File đáp án không đúng định dạng.\n\nSau mỗi mã đề phải là một cột CLO.");
        }

        const examCode = normalizeExamCode(rawCode);
        if (exams[examCode]) {
            throw new Error(`Mã đề ${examCode} xuất hiện nhiều lần trong file đáp án.`);
        }

        exams[examCode] = {
            totalQuestion: 0,
            cloCount: {},
            questions: {}
        };
        columnMap[examCode] = { answerColumn: c, cloColumn: c + 1 };
    }

    const examCodes = Object.keys(exams);
    if (examCodes.length === 0) {
        throw new Error("Không tìm thấy mã đề trong file đáp án.");
    }

    // Chỉ nhận các dòng câu hỏi 1, 2, 3, ...; sau đó kiểm tra không bị thiếu số.
    const questionRows = [];
    for (let r = 1; r < data.length; r++) {
        const q = Number(data[r]?.[0]);
        if (Number.isInteger(q) && q > 0) questionRows.push({ q, row: data[r] });
    }

    questionRows.sort((a, b) => a.q - b.q);
    if (questionRows.length === 0) {
        throw new Error("File đáp án không có câu hỏi hợp lệ.");
    }

    for (let i = 0; i < questionRows.length; i++) {
        const expected = i + 1;
        if (questionRows[i].q !== expected) {
            throw new Error(`File đáp án phải có đủ câu liên tục từ 1 đến N. Thiếu hoặc sai số câu ${expected}.`);
        }
    }

    for (const { q: questionNum, row } of questionRows) {
        for (const code of examCodes) {
            const info = exams[code];
            const cols = columnMap[code];
            const answer = String(row?.[cols.answerColumn] ?? "").trim().toUpperCase();
            const clo = String(row?.[cols.cloColumn] ?? "").trim();

            if (!answer) {
                throw new Error(`Mã đề ${code} thiếu đáp án ở câu ${questionNum}.`);
            }
            if (!["A", "B", "C", "D"].includes(answer)) {
                throw new Error(
                    `Đáp án không hợp lệ.\n\nMã đề: ${code}\nCâu: ${questionNum}\nĐáp án: ${answer}`
                );
            }

            info.totalQuestion++;
            if (clo !== "") info.cloCount[clo] = (info.cloCount[clo] || 0) + 1;
            info.questions[questionNum] = { answer, clo };
        }
    }

    let useCLO = false;
    for (const code of examCodes) {
        if (Object.values(exams[code].questions).some(q => q.clo !== "")) {
            useCLO = true;
            break;
        }
    }

    if (useCLO) {
        for (const code of examCodes) {
            const missing = [];
            for (const [questionNum, q] of Object.entries(exams[code].questions)) {
                if (q.clo === "") missing.push(questionNum);
            }
            if (missing.length > 0) {
                throw new Error(`Mã đề ${code} thiếu CLO ở câu:\n\n${missing.join(", ")}`);
            }
        }
    }

    const totalQuestion = exams[examCodes[0]].totalQuestion;
    for (const code of examCodes) {
        if (exams[code].totalQuestion !== totalQuestion) {
            const detail = examCodes.map(c => `${c}: ${exams[c].totalQuestion} câu`).join("\n");
            throw new Error("Số câu giữa các mã đề không đồng nhất.\n\n" + detail);
        }
    }

    // CLO phải có cùng phân bố giữa các mã đề để điểm CLO có ý nghĩa thống nhất.
    if (useCLO) {
        const standard = JSON.stringify(exams[examCodes[0]].cloCount);
        for (const code of examCodes.slice(1)) {
            if (JSON.stringify(exams[code].cloCount) !== standard) {
                throw new Error("Phân bố số câu theo CLO giữa các mã đề không đồng nhất.");
            }
        }
    }

    return {
        sheetName,
        totalQuestion,
        useCLO,
        exams
    };
}
