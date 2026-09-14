/* =====================================================
   horizontalAnswerExporter.js v1.0
   - Mỗi mã đề một dòng.
   - Các câu nằm theo cột ngang: Mã đề | Câu 1 | Câu 2 | ...
===================================================== */

export function exportHorizontalAnswers(worksheet, exams) {
    if (!worksheet || !Array.isArray(exams) || exams.length === 0) return;

    const questionCount = exams[0].questions?.length ?? 0;
    worksheet.addRow([
        "Mã đề",
        ...Array.from({ length: questionCount }, (_, i) => `Câu ${i + 1}`)
    ]);

    exams.forEach(exam => {
        worksheet.addRow([
            String(exam.examCode ?? ""),
            ...(exam.questions || []).map(q => String(q.correct ?? "").toUpperCase())
        ]);
    });
}
