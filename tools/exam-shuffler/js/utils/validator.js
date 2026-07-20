/* =====================================================
   validator.js
   Exam Shuffler v2.0
  
   Chức năng:
- Kiểm tra tính hợp lệ của đề
- Kiểm tra số câu
- Kiểm tra CLO
- Kiểm tra AnswerKey
- Kiểm tra phân bố CLO
- Kiểm tra nhiều mã đề
===================================================== */

const LABELS = ["A", "B", "C", "D"];

function countByCLO(questions) {
    const map = {};
    questions.forEach(q => {
        map[q.clo] = (map[q.clo] || 0) + 1;
    });
    return map;
}

/* =====================================================
   Kiểm tra một đề
===================================================== */
export function validateExam(exam, options = {}) {
    const {
        expectedQuestionCount = null,
        expectedCLO = null,
        answerKey = null
    } = options;

    const errors = [];
    const questions = exam.questions ?? [];

    // 1. Kiểm tra số câu
    if (
        expectedQuestionCount !== null &&
        questions.length !== expectedQuestionCount
    ) {
        errors.push(
            `Expected ${expectedQuestionCount} questions, found ${questions.length}.`
        );
    }

    // 2. Kiểm tra trùng/thiếu câu gốc
    const originalNumbers = questions.map(q => q.number);
    const duplicate = originalNumbers.filter(
        (n, i) => originalNumbers.indexOf(n) !== i
    );

    if (duplicate.length > 0) {
        errors.push(
            `Duplicate original questions: ${[...new Set(duplicate)].join(", ")}`
        );
    }

    if (expectedQuestionCount !== null) {
        for (let i = 1; i <= expectedQuestionCount; i++) {
            if (!originalNumbers.includes(i)) {
                errors.push(`Missing original question: ${i}`);
            }
        }
    }

    // 3. Kiểm tra từng câu hỏi
    questions.forEach((q, index) => {
        if (!q.clo) {
            errors.push(`Question ${index + 1}: Missing CLO`);
        }

        if (!LABELS.includes(q.correct)) {
            errors.push(`Question ${index + 1}: Invalid correct answer`);
        }

        // CẢI TIẾN: Kiểm tra chắc chắn là mảng và có đúng 4 phần tử
        if (!Array.isArray(q.choices) || q.choices.length !== 4) {
            errors.push(
                `Question ${index + 1}: Must have exactly 4 choices`
            );
            return; // Dừng kiểm tra các thuộc tính của choices cho câu này, chuyển sang câu kế tiếp
        }

        // Bọc trong block an toàn, lúc này q.choices chắc chắn là mảng 4 phần tử
        const correctCount = q.choices.filter(c => c.correct).length;
        if (correctCount !== 1) {
            errors.push(
                `Question ${index + 1}: Expected exactly one correct choice`
            );
        }

        const labels = q.choices.map(c => c.label);
        LABELS.forEach(label => {
            if (!labels.includes(label)) {
                errors.push(`Question ${index + 1}: Missing choice ${label}`);
            }
        });
    }); // <-- Đã đóng đúng ngoặc cho questions.forEach ở đây

    // 4. Kiểm tra phân bố CLO (Đã đưa ra ngoài vòng lặp từng câu)
    if (expectedCLO) {
        const actual = countByCLO(questions);
        Object.keys(expectedCLO).forEach(clo => {
            if ((actual[clo] || 0) !== expectedCLO[clo]) {
                errors.push(
                    `CLO ${clo}: expected ${expectedCLO[clo]}, found ${actual[clo] || 0}`
                );
            }
        });
    }

    // 5. Kiểm tra AnswerKey (Đã đưa ra ngoài vòng lặp từng câu)
    if (Array.isArray(answerKey)) {
        answerKey.forEach((row, i) => {
            if (!questions[i]) return;
            if (row.answer !== questions[i].correct) {
                errors.push(`AnswerKey mismatch at question ${i + 1}`);
            }
        });
    }

    return {
        valid: errors.length === 0,
        totalErrors: errors.length,
        errors
    };
}

export function validateExamSet(exams, options = {}) {
    return exams.map(exam => ({
        examCode: exam.examCode,
        ...validateExam(exam, options)
    }));
}