/* =====================================================
   answerExporter.js
   Exam Shuffler v1.2 - Pure Data Writer for Excel Answer Sheet

   Chức năng:
   - Ghi dữ liệu thô (Mã đề, Cột câu hỏi, Đáp án đúng, CLO) từ mảng `exams` vào Worksheet.
   - Kiểm tra tính hợp lệ và sự đồng nhất về số lượng câu hỏi giữa các mã đề (Fail-Fast).
   - Tuyệt đối KHÔNG can thiệp vào Style, Border, Font, Width, Alignment hay Fill.
   - Xử lý Falsy-safe cho cả đáp án và CLO (an toàn với 0, "", null, undefined).
===================================================== */

/**
 * Hàm chính: Đổ dữ liệu đáp án của tất cả các đề thi vào Worksheet
 * 
 * @param {Object} worksheet - Đối tượng ExcelJS Worksheet
 * @param {Array<Object>} exams - Mảng chứa danh sách các bộ đề thi
 */
export function exportAnswers(worksheet, exams) {
    // 1. Validate dữ liệu đầu vào
    if (!worksheet) {
        throw new Error("[answerExporter] Worksheet không được để trống.");
    }
    if (!Array.isArray(exams) || exams.length === 0) {
        throw new Error("[answerExporter] Danh sách bộ đề (exams) rỗng hoặc không hợp lệ.");
    }

    // 2. Validate tính nhất quán về số câu hỏi giữa tất cả mã đề (Fail-Fast)
    const questionCount = validateAndGetQuestionCount(exams);

    // 3. Thực thi ghi dữ liệu theo thứ tự cấu trúc
    writeHeader(worksheet, exams);
    writeQuestionNumbers(worksheet, questionCount);
    writeAnswerData(worksheet, exams);
}

/**
 * Kiểm tra tính đồng nhất về số lượng câu hỏi của các mã đề
 * 
 * @param {Array<Object>} exams - Danh sách các mã đề
 * @returns {number} Số câu hỏi của mỗi đề
 */
function validateAndGetQuestionCount(exams) {
    const firstExamCount = exams[0].questions?.length ?? 0;

    if (firstExamCount === 0) {
        throw new Error(`[answerExporter] Đề số ${exams[0].examCode} không chứa câu hỏi nào.`);
    }

    for (let i = 1; i < exams.length; i++) {
        const currentCount = exams[i].questions?.length ?? 0;
        if (currentCount !== firstExamCount) {
            throw new Error(
                `[answerExporter] Không đồng nhất số lượng câu hỏi giữa các đề: ` +
                `Mã đề ${exams[0].examCode} có ${firstExamCount} câu, ` +
                `nhưng mã đề ${exams[i].examCode} có ${currentCount} câu.`
            );
        }
    }

    return firstExamCount;
}

/**
 * 1. Ghi Dòng Header (Dòng 1)
 * Cấu trúc: [ "Câu", ExamCode_1, "CLO", ExamCode_2, "CLO", ... ]
 */
function writeHeader(worksheet, exams) {
    const headerRow = worksheet.getRow(1);
    
    headerRow.getCell(1).value = "Câu";

    exams.forEach((exam, index) => {
        const codeColIndex = 2 + index * 2; // Cột 2, 4, 6, 8...
        const cloColIndex = codeColIndex + 1; // Cột 3, 5, 7, 9...

        headerRow.getCell(codeColIndex).value = exam.examCode ?? "";
        headerRow.getCell(cloColIndex).value = "CLO";
    });
}

/**
 * 2. Ghi Cột Số Thứ Tự Câu Hỏi (Cột A, từ Dòng 2 trở đi)
 * Giá trị: 1, 2, 3, ..., questionCount
 */
function writeQuestionNumbers(worksheet, questionCount) {
    for (let qIndex = 0; qIndex < questionCount; qIndex++) {
        const rowIndex = 2 + qIndex; // Bắt đầu từ dòng 2
        const row = worksheet.getRow(rowIndex);
        
        row.getCell(1).value = qIndex + 1; // Số thứ tự câu hỏi (1-indexed)
    }
}

/**
 * 3. Ghi Dữ Liệu Đáp Án & CLO Tương Ứng Cho Tất Cả Mã Đề
 */
function writeAnswerData(worksheet, exams) {
    exams.forEach((exam, examIndex) => {
        const codeColIndex = 2 + examIndex * 2;
        const cloColIndex = codeColIndex + 1;

        const questions = exam.questions ?? [];

        questions.forEach((q, qIndex) => {
            const rowIndex = 2 + qIndex;
            const row = worksheet.getRow(rowIndex);

            // Chuyển đổi dữ liệu về dạng String chuẩn (Falsy-safe với giá trị 0)
            const correctChar = q.correct != null ? String(q.correct).trim().toUpperCase() : "";
            const cloValue = q.clo != null ? String(q.clo).trim() : "";

            row.getCell(codeColIndex).value = correctChar;
            row.getCell(cloColIndex).value = cloValue;
        });
    });
}