// ============================================
// score.js
// Version 5.1 - Safe Detail Object
// ============================================

export function calculateAllScores(answerData, untData, maxScores) {
    const students = untData?.students || [];

    for (const student of students) {
        calculateStudentScore(student, answerData, maxScores);
    }
}

export function calculateStudentScore(student, answerData, maxScores) {
    if (!student.result) {
        return;
    }

    const exam = answerData?.exams?.[student.examCode];
    if (!exam) {
        return;
    }

    const cloStatistic = student.result.clo;
    const marks = {};
    const detail = {}; // Nơi lưu điểm số chi tiết cho từng CLO

    const totalCorrect = student.result.correct;
    const totalQuestion = student.result.total;

    // 1. GPA
    const gpa = calculateGPA(totalCorrect, totalQuestion);

    // 2. Tính từng CLO
    for (const clo in cloStatistic) {
        const correctQuestion = cloStatistic[clo].correctCount;
        const questionCount = cloStatistic[clo].questionCount;

        marks[clo] = calculateMarkScore(correctQuestion, questionCount);

        detail[clo] = {
            correctCount: correctQuestion,
            score: calculateDetailScore(
                correctQuestion,
                questionCount,
                maxScores[clo]
            )
        };
    }

    // 3. Hiệu chỉnh
    adjustDetailScore(detail, gpa, maxScores, cloStatistic);

    // 4. Lưu kết quả mà KHÔNG đè lên questionDetail
    student.result = {
        ...student.result, // Giữ nguyên questionDetail, correct, wrong, total
        marks: {
            ...marks,
            GPA: gpa
        },
        detail: JSON.parse(JSON.stringify(detail)) // Chi tiết điểm CLO
    };
}

function calculateMarkScore(correctQuestion, totalQuestion) {
    if (totalQuestion <= 0) return 0;
    return Math.round((correctQuestion * 10 / totalQuestion) * 10) / 10;
}

function calculateGPA(correctQuestion, totalQuestion) {
    if (totalQuestion <= 0) return 0;
    return Math.round((correctQuestion * 10 / totalQuestion) * 10) / 10;
}

function calculateDetailScore(correctQuestion, totalQuestion, maxScore) {
    if (totalQuestion <= 0) return 0;
    return Math.round((correctQuestion * maxScore / totalQuestion) * 10) / 10;
}

function adjustDetailScore(detail, gpa, maxScores, cloStatistic) {
    let total = 0;
    const clos = Object.keys(detail);

    for (const clo of clos) {
        total += detail[clo].score;
    }

    let delta = Number((gpa - total).toFixed(1));
    if (delta === 0) return;

    for (let i = clos.length - 1; i >= 0; i--) {
        const clo = clos[i];
        const current = detail[clo].score;
        const max = Number(maxScores[clo]);

        if (delta > 0 && current < max) {
            detail[clo].score = Number((current + 0.1).toFixed(1));
            return;
        }

        if (delta < 0 && current > 0) {
            detail[clo].score = Number((current - 0.1).toFixed(1));
            return;
        }
    }
}