/* =====================================================
   mappingExporter.js v1.0
   - Sheet đối chiếu câu sau trộn với đề gốc.
   - Sheet phân tích đề gốc: đáp án, CLO, nội dung, A/B/C/D.
===================================================== */

function cleanText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function exportQuestionMapping(worksheet, exams) {
    if (!worksheet || !Array.isArray(exams)) return;

    worksheet.addRow([
        "Mã đề",
        "Câu mới",
        "Câu gốc (vị trí)",
        "Nhãn câu gốc",
        "Đáp án mới",
        "Đáp án gốc",
        "CLO"
    ]);

    exams.forEach(exam => {
        (exam.questions || []).forEach((q, index) => {
            worksheet.addRow([
                String(exam.examCode ?? ""),
                index + 1,
                q.sourceIndex ?? "",
                q.originalNumber ?? "",
                String(q.correct ?? "").toUpperCase(),
                String(q.originalCorrect ?? "").toUpperCase(),
                q.clo ? `CLO${q.clo}` : ""
            ]);
        });
    });
}

export function exportSourceAnalysis(worksheet, sourceQuestions) {
    if (!worksheet || !Array.isArray(sourceQuestions)) return;

    worksheet.addRow([
        "Vị trí gốc",
        "Nhãn câu gốc",
        "Đáp án đúng",
        "CLO",
        "Nội dung câu hỏi",
        "A",
        "B",
        "C",
        "D"
    ]);

    sourceQuestions.forEach((q, index) => {
        const byLabel = {};
        (q.choices || []).forEach(choice => {
            byLabel[String(choice.label || "").toUpperCase()] = cleanText(choice.text)
                .replace(/^\s*[A-D]\s*[\.\:\)]\s*/i, "");
        });

        worksheet.addRow([
            q.sourceIndex ?? index + 1,
            q.originalNumber ?? q.number ?? index + 1,
            String(q.originalCorrect || q.correct || "").toUpperCase(),
            q.clo ? `CLO${q.clo}` : "",
            cleanText(q.stemText),
            byLabel.A || "",
            byLabel.B || "",
            byLabel.C || "",
            byLabel.D || ""
        ]);
    });
}
