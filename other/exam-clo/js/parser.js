// =========================================
// parser.js
// Version 3.0 - Native ES Module
// Phân tích dữ liệu từ file UnT
// =========================================

/**
 * Phân tích dữ liệu từ mảng dữ liệu 2D (Array of Arrays) của file UnT
 * @param {Array<Array<any>>} data Mảng 2D chứa dữ liệu các dòng trong Sheet UnT
 * @returns {Object} Object dữ liệu chứa danh sách sinh viên và thống kê mã đề
 */
export function parseUntData(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return {
            totalStudent: 0,
            examCount: {},
            students: []
        };
    }

    // Dòng bắt đầu danh sách sinh viên (Dòng 7 trong Excel, index = 6)
    const FIRST_ROW = 6;

    // Cấu hình các chỉ số cột (0-indexed)
    const COL_SBD = 2;        // Cột C: SBD
    const COL_EXAM = 4;       // Cột E: Mã đề
    const FIRST_ANSWER = 5;   // Cột F trở đi: Đáp án sinh viên

    const students = [];
    const examCount = {};

    // Đọc từng sinh viên
    for (let r = FIRST_ROW; r < data.length; r++) {
        const row = data[r];
        if (!row || row.length <= COL_SBD) continue;

        // 1. Lấy Số báo danh
        const sbd = String(row[COL_SBD] ?? "").trim();
        if (sbd === "") continue;

        // 2. Lấy Mã đề (Chuẩn hóa 3 chữ số, VD: 1 -> "001")
        let examCode = String(row[COL_EXAM] ?? "").trim();
        if (examCode !== "" && !isNaN(examCode)) {
            examCode = examCode.padStart(3, "0");
        }

        // 3. Thống kê số lượng theo từng mã đề
        if (!examCount[examCode]) {
            examCount[examCode] = 0;
        }
        examCount[examCode]++;

        // 4. Lấy danh sách đáp án sinh viên (mỗi đáp án cách nhau 2 cột)
        const answers = [];
        for (let c = FIRST_ANSWER; c < row.length; c += 2) {
            let value = String(row[c] ?? "").trim().toUpperCase();
            answers.push(value);
        }

        // 5. Thêm thông tin sinh viên vào danh sách
        students.push({
            rowIndex: r,
            sbd: sbd,
            examCode: examCode,
            answers: answers
        });
    }

    // Trả về Object dữ liệu thuần
    return {
        totalStudent: students.length,
        examCount: examCount,
        students: students
    };
}

/**
 * Hiển thị dữ liệu ra Console để debug/kiểm tra
 * @param {Object} untData Object dữ liệu sinh viên từ parseUntData
 */
export function debugStudents(untData) {
    console.clear();
    console.log("===== DANH SÁCH SINH VIÊN =====");
    console.log(untData?.students || []);
    console.log("");
    console.log("===== THỐNG KÊ MÃ ĐỀ =====");
    console.log(untData?.examCount || {});
}