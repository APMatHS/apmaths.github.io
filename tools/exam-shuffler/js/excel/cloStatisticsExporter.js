/* =====================================================
   cloStatisticsExporter.js
   Exam Shuffler v1.0

   Chức năng:
   - Xuất Sheet "CLO Statistics".
   - Liệt kê các số câu thuộc từng CLO theo từng mã đề.
===================================================== */

export function exportCLOStatistics(worksheet, exams) {

    if (!worksheet || !Array.isArray(exams)) return;

    const cloSet = new Set();

    exams.forEach(exam => {
        exam.questions.forEach(q => {
            if (q.clo) {
                cloSet.add(String(q.clo));
            }
        });
    });

    const cloList = [...cloSet].sort((a, b) => Number(a) - Number(b));

    worksheet.addRow([
        "CLO",
        ...exams.map(exam => `Đề ${exam.examCode}`)
    ]);

    cloList.forEach(clo => {

        const row = [`CLO ${clo}`];

        exams.forEach(exam => {

            const questionNumbers = exam.questions
                .filter(q => String(q.clo) === clo)
                .map(q => q.number)
                .join(", ");

            row.push(questionNumbers);

        });

        worksheet.addRow(row);

    });

}