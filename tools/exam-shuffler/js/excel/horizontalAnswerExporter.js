/* =====================================================
   horizontalAnswerExporter.js v1.1
   - Sheet "Đáp án ngang" là chuyển vị trực tiếp của sheet "Đáp án".
   - Mỗi mã đề có 2 dòng liên tiếp: Đáp án và CLO.
===================================================== */

export function exportHorizontalAnswers(worksheet, exams) {
    if (!worksheet || !Array.isArray(exams) || exams.length === 0) return;

    const questionCount = exams[0].questions?.length ?? 0;
    worksheet.addRow([
        "Mã đề",
        "Loại",
        ...Array.from({ length: questionCount }, (_, i) => `Câu ${i + 1}`)
    ]);

    exams.forEach(exam => {
        const questions = exam.questions || [];
        worksheet.addRow([
            String(exam.examCode ?? ""),
            "Đáp án",
            ...questions.map(q => String(q.correct ?? "").trim().toUpperCase())
        ]);
        worksheet.addRow([
            String(exam.examCode ?? ""),
            "CLO",
            ...questions.map(q => q.clo != null && String(q.clo).trim() !== ""
                ? `CLO${String(q.clo).replace(/^CLO\s*/i, "").trim()}`
                : "")
        ]);
    });
}
