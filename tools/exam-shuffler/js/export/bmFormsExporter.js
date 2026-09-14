/* =====================================================
   bmFormsExporter.js v1.0
   - Xuất BM06 + BM08 DOCX cho Exam Shuffler.
   - Dùng dữ liệu đề sau trộn và metadata do người dùng xác nhận.
===================================================== */

const esc = value => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function run(text, { bold = false, size = 24 } = {}) {
    return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${bold ? "<w:b/><w:bCs/>" : ""}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

function p(text, { bold = false, align = "left", size = 24, before = 0, after = 0 } = {}) {
    return `<w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:before="${before}" w:after="${after}"/></w:pPr>${run(text, { bold, size })}</w:p>`;
}

function cell(text, { bold = false, width = 1600, align = "center" } = {}) {
    return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${p(text, { bold, align })}</w:tc>`;
}

function row(cells) {
    return `<w:tr><w:cantSplit/>${cells.join("")}</w:tr>`;
}

function table(rows, widths) {
    const total = widths.reduce((a, b) => a + b, 0);
    return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${["top","left","bottom","right","insideH","insideV"].map(k => `<w:${k} w:val="single" w:sz="6" w:space="0" w:color="000000"/>`).join("")}</w:tblBorders></w:tblPr><w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>`;
}

function styles() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
}

async function makeDocx(body) {
    if (typeof JSZip === "undefined") throw new Error("Không tải được JSZip để tạo BM06/BM08.");
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850"/></w:sectPr></w:body></w:document>`;
    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
    zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.folder("word").file("document.xml", documentXml).file("styles.xml", styles());
    zip.folder("word").folder("_rels").file("document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function normClo(value) {
    const s = String(value ?? "").trim();
    if (!s) return "";
    return /^CLO/i.test(s) ? s.replace(/\s+/g, "") : `CLO${s}`;
}

function viDate(value) {
    const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(value || "");
}

function metaLines(metadata = {}) {
    return [
        p(`Học phần: ${metadata.subject || ""}`, { bold: true }),
        p(`Mã học phần: ${metadata.courseCode || ""}    Học kỳ: ${metadata.semester || ""}    Năm học: ${metadata.academicYear || ""}`),
        p(`Ngày thi: ${viDate(metadata.examDate)}    Ca thi: ${metadata.examSession || ""}    Thời gian: ${metadata.durationMinutes || ""}${metadata.durationMinutes ? " phút" : ""}`, { after: 80 })
    ].join("");
}

function buildBM06Body(firstExam, metadata = {}) {
    const questions = firstExam?.questions || [];
    const total = questions.length || 1;
    const point = 10 / total;
    const groups = new Map();
    questions.forEach((q, i) => {
        const clo = normClo(q.clo) || "Chưa gán CLO";
        if (!groups.has(clo)) groups.set(clo, []);
        groups.get(clo).push(i + 1);
    });

    const widths = [1800, 4200, 1400, 1400];
    const rows = [row([
        cell("CLO", { width: widths[0], bold: true }),
        cell("Câu thuộc CLO", { width: widths[1], bold: true }),
        cell("Tỷ lệ", { width: widths[2], bold: true }),
        cell("Điểm", { width: widths[3], bold: true })
    ])];
    [...groups.entries()].forEach(([clo, nums]) => {
        rows.push(row([
            cell(clo, { width: widths[0], bold: true }),
            cell(nums.join(", "), { width: widths[1] }),
            cell(`${(nums.length * 100 / total).toFixed(1)}%`, { width: widths[2] }),
            cell((nums.length * point).toFixed(2), { width: widths[3] })
        ]));
    });

    return [
        p("Biểu mẫu BM06", { align: "right", bold: true }),
        p("MA TRẬN ĐỀ THI", { align: "center", bold: true, size: 30, after: 100 }),
        metaLines(metadata),
        p(`Đề gốc: Mã đề ${firstExam?.examCode || ""} — ${questions.length} câu`, { bold: true, after: 60 }),
        table(rows, widths),
        p("TRƯỞNG BỘ MÔN", { align: "right", bold: true, before: 160 }),
        p(metadata.approvedBy || "", { align: "right", bold: true, before: 500 })
    ].join("");
}

function buildBM08Body(exam, metadata = {}) {
    const questions = exam?.questions || [];
    const total = questions.length || 1;
    const point = 10 / total;
    const out = [
        p("Mẫu BM08", { align: "right", bold: true }),
        p(`ĐÁP ÁN / HƯỚNG DẪN CHẤM — MÃ ĐỀ ${exam?.examCode || ""}`, { align: "center", bold: true, size: 28, after: 80 }),
        metaLines(metadata),
        p(`Mỗi câu ${(point).toFixed(2)} điểm.`, { bold: true, after: 40 })
    ];

    for (let start = 0; start < questions.length; start += 20) {
        const part = questions.slice(start, start + 20);
        const widths = [900, ...part.map(() => 450)];
        out.push(table([
            row([cell("Câu", { width: 900, bold: true }), ...part.map((_, i) => cell(String(start + i + 1), { width: 450 }))]),
            row([cell("Đáp án", { width: 900, bold: true }), ...part.map(q => cell(String(q.correct || "").toUpperCase(), { width: 450, bold: true }))]),
            row([cell("CLO", { width: 900, bold: true }), ...part.map(q => cell(normClo(q.clo), { width: 450 }))])
        ], widths));
    }

    out.push(p("Tổng điểm: ……/10", { align: "center", bold: true, before: 80 }));
    out.push(p(`GIẢNG VIÊN RA ĐỀ: ${metadata.preparedBy || ""}`, { before: 120 }));
    return out.join("");
}

export async function exportBMForms(exams, metadata = {}) {
    if (!Array.isArray(exams) || !exams.length) return [];
    const docs = [];
    docs.push({ name: "BM06_Ma_tran_de_thi.docx", blob: await makeDocx(buildBM06Body(exams[0], metadata)) });
    for (const exam of exams) {
        docs.push({ name: `BM08_${exam.examCode}.docx`, blob: await makeDocx(buildBM08Body(exam, metadata)) });
    }
    return docs;
}
