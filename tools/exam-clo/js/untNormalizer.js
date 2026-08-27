// =====================================================
// untNormalizer.js
// Nhận diện cấu trúc UnT linh hoạt: có/mất 6 dòng đầu,
// có/mất các cột Điểm xen kẽ.
// =====================================================

const ANSWERS = new Set(["A", "B", "C", "D"]);

function stripAccents(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/gi, "d")
        .trim()
        .toLowerCase();
}

function compact(value) {
    return stripAccents(value).replace(/[^a-z0-9]/g, "");
}

export function normalizeExamCode(value) {
    let code = String(value ?? "").trim();
    if (/^\d+$/.test(code)) code = code.padStart(3, "0");
    return code;
}

export function isValidSbd(value) {
    return /^\d+$/.test(String(value ?? "").trim());
}

function isMissingSbd(value) {
    const s = String(value ?? "").trim();
    return !s || /^[-–—_]+$/.test(s);
}

function findHeader(data, questionCount) {
    const maxRows = Math.min(data.length, 20);

    for (let r = 0; r < maxRows; r++) {
        const row = data[r] || [];
        let sbdCol = -1;
        let examCol = -1;

        for (let c = 0; c < row.length; c++) {
            const text = compact(row[c]);
            if (text === "sbd" || text === "sobaodanh" || text === "maphach") sbdCol = c;
            if (text === "made" || text === "madethi") examCol = c;
        }

        if (sbdCol < 0 || examCol < 0) continue;

        const questionCols = [];
        for (let q = 1; q <= questionCount; q++) {
            let found = -1;
            for (let c = 0; c < row.length; c++) {
                const raw = String(row[c] ?? "").trim();
                if (/^\d+$/.test(raw) && Number(raw) === q) {
                    found = c;
                    break;
                }
            }
            if (found < 0) break;
            questionCols.push(found);
        }

        if (questionCols.length === questionCount) {
            return { headerRow: r, sbdCol, examCol, questionCols, mode: "header" };
        }
    }

    return null;
}

function rowLooksLikeStudent(row, examCol, answerCols, validExamCodes) {
    const exam = normalizeExamCode(row?.[examCol]);
    if (!validExamCodes.has(exam)) return false;

    let validAnswer = 0;
    const probe = Math.min(answerCols.length, 8);
    for (let i = 0; i < probe; i++) {
        if (ANSWERS.has(String(row?.[answerCols[i]] ?? "").trim().toUpperCase())) validAnswer++;
    }
    return probe > 0 && validAnswer >= Math.max(2, Math.ceil(probe * 0.5));
}

function scoreExamColumn(data, col, validExamCodes) {
    let checked = 0;
    let matches = 0;
    for (let r = 0; r < Math.min(data.length, 80); r++) {
        const raw = String(data[r]?.[col] ?? "").trim();
        if (!raw) continue;
        checked++;
        if (validExamCodes.has(normalizeExamCode(raw))) matches++;
    }
    if (checked === 0) return 0;
    return matches / checked;
}

function answerRatio(data, col, validRows) {
    let checked = 0;
    let matches = 0;
    for (const r of validRows.slice(0, 50)) {
        const raw = String(data[r]?.[col] ?? "").trim().toUpperCase();
        if (!raw) continue;
        checked++;
        if (ANSWERS.has(raw)) matches++;
    }
    return checked === 0 ? 0 : matches / checked;
}

function inferStructure(data, questionCount, validExamCodes) {
    const maxCols = Math.max(0, ...data.slice(0, 80).map(row => row?.length || 0));
    let examCol = -1;
    let bestExamScore = 0;

    for (let c = 0; c < maxCols; c++) {
        const score = scoreExamColumn(data, c, validExamCodes);
        if (score > bestExamScore) {
            bestExamScore = score;
            examCol = c;
        }
    }

    if (examCol < 0 || bestExamScore < 0.5) {
        throw new Error('Không xác định được cột "Mã đề" trong file UnT.');
    }

    const examRows = [];
    for (let r = 0; r < data.length; r++) {
        if (validExamCodes.has(normalizeExamCode(data[r]?.[examCol]))) examRows.push(r);
    }

    const questionCols = [];
    for (let c = examCol + 1; c < maxCols; c++) {
        if (answerRatio(data, c, examRows) >= 0.55) questionCols.push(c);
        if (questionCols.length === questionCount) break;
    }

    if (questionCols.length !== questionCount) {
        throw new Error(
            `File UnT không có đủ ${questionCount} cột câu trả lời từ 1 đến ${questionCount}.\n` +
            `Đã nhận diện được ${questionCols.length} cột câu trả lời.`
        );
    }

    // SBD thường nằm trước Mã đề. Chọn cột có nhiều số hoặc dấu ------ nhất.
    let sbdCol = -1;
    let bestSbdScore = -1;
    for (let c = 0; c < examCol; c++) {
        let evidence = 0;
        let checked = 0;
        for (const r of examRows.slice(0, 60)) {
            const raw = String(data[r]?.[c] ?? "").trim();
            if (!raw) continue;
            checked++;
            if (isValidSbd(raw)) evidence += 1;
            else if (isMissingSbd(raw)) evidence += 3;
        }
        const score = checked ? evidence / checked : 0;
        // Ưu tiên cột gần Mã đề hơn khi điểm bằng nhau (C gần E trong mẫu chuẩn).
        if (score > bestSbdScore || (score === bestSbdScore && c > sbdCol)) {
            bestSbdScore = score;
            sbdCol = c;
        }
    }

    if (sbdCol < 0) {
        throw new Error('Không xác định được cột "SBD" trong file UnT.');
    }

    let firstStudentRow = -1;
    for (const r of examRows) {
        if (rowLooksLikeStudent(data[r], examCol, questionCols, validExamCodes)) {
            firstStudentRow = r;
            break;
        }
    }

    if (firstStudentRow < 0) {
        throw new Error("Không tìm thấy dòng dữ liệu sinh viên trong file UnT.");
    }

    return {
        headerRow: -1,
        firstStudentRow,
        sbdCol,
        examCol,
        questionCols,
        mode: "inferred"
    };
}

/**
 * Chuẩn hóa file UnT thành cấu trúc dùng chung cho grader.
 * Không yêu cầu dòng bắt đầu cố định và không yêu cầu cột Điểm.
 */
export function normalizeUntData(data, answerData) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("File UnT không có dữ liệu.");
    }

    const questionCount = Number(answerData?.totalQuestion || 0);
    if (!questionCount) throw new Error("Không xác định được số câu từ file đáp án.");

    const validExamCodes = new Set(Object.keys(answerData?.exams || {}).map(normalizeExamCode));
    if (validExamCodes.size === 0) throw new Error("File đáp án không có mã đề.");

    const header = findHeader(data, questionCount);
    let structure;

    if (header) {
        structure = {
            ...header,
            firstStudentRow: header.headerRow + 1
        };
    } else {
        structure = inferStructure(data, questionCount, validExamCodes);
    }

    const students = [];
    const examCount = {};

    for (let r = structure.firstStudentRow; r < data.length; r++) {
        const row = data[r] || [];
        const examCode = normalizeExamCode(row[structure.examCol]);
        if (!validExamCodes.has(examCode)) continue;

        const answers = structure.questionCols.map(c =>
            String(row[c] ?? "").trim().toUpperCase()
        );

        // Không loại dòng chỉ vì SV có câu trống/ký tự lạ; grader sẽ xem đó là câu sai.
        // Điều bắt buộc là đã nhận diện đủ đúng N cột câu trả lời.
        const rawSbd = String(row[structure.sbdCol] ?? "").trim();
        const sbd = isValidSbd(rawSbd) ? rawSbd : "";

        students.push({
            sourceRow: r,
            excelRow: r + 1,
            sbd,
            rawSbd,
            examCode,
            answers
        });
        examCount[examCode] = (examCount[examCode] || 0) + 1;
    }

    if (students.length === 0) {
        throw new Error("Không tìm thấy bài làm sinh viên hợp lệ trong file UnT.");
    }

    return {
        totalStudent: students.length,
        questionCount,
        examCount,
        students,
        structure
    };
}

export function validateStudentIds(untData) {
    const seen = new Map();
    const duplicates = [];
    const missing = [];

    for (const student of untData?.students || []) {
        const sbd = String(student.sbd ?? "").trim();
        if (!isValidSbd(sbd)) {
            missing.push(student);
            continue;
        }
        if (seen.has(sbd)) duplicates.push([seen.get(sbd), student]);
        else seen.set(sbd, student);
    }

    if (missing.length) {
        throw new Error(`Còn ${missing.length} dòng chưa có SBD hợp lệ.`);
    }
    if (duplicates.length) {
        const ids = [...new Set(duplicates.map(pair => pair[1].sbd))];
        throw new Error(`SBD bị trùng: ${ids.join(", ")}. Vui lòng kiểm tra lại.`);
    }

    return true;
}
