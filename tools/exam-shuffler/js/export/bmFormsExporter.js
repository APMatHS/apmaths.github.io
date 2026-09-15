/* =====================================================
   bmFormsExporter.js v1.1
   - Xuất BM06 + BM08 theo mẫu PTIT người dùng cung cấp.
   - BM06 giữ khung ma trận nhưng để trống phần nội dung trong bảng.
   - BM08 tự điền đáp án; cột "Nội dung đánh giá" để trống.
===================================================== */

const esc = value => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");

function run(text, { bold = false, italic = false, size = 22 } = {}) {
    return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${bold ? "<w:b/><w:bCs/>" : ""}${italic ? "<w:i/><w:iCs/>" : ""}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

function p(text, { bold = false, italic = false, align = "left", size = 22, before = 0, after = 0 } = {}) {
    return `<w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:before="${before}" w:after="${after}" w:line="240" w:lineRule="auto"/></w:pPr>${run(text, { bold, italic, size })}</w:p>`;
}

function pRuns(runs, { align = "left", before = 0, after = 0 } = {}) {
    return `<w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:before="${before}" w:after="${after}" w:line="240" w:lineRule="auto"/></w:pPr>${runs.map(r => run(r.text, r)).join("")}</w:p>`;
}

function cell(body, { bold = false, width = 1600, align = "center", span = 1, vMerge = "" } = {}) {
    const content = String(body || "").startsWith("<w:p") ? body : p(body, { bold, align });
    return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ""}${vMerge ? `<w:vMerge${vMerge === "restart" ? ' w:val="restart"' : ""}/>` : ""}<w:vAlign w:val="center"/><w:tcMar><w:top w:w="45" w:type="dxa"/><w:left w:w="55" w:type="dxa"/><w:bottom w:w="45" w:type="dxa"/><w:right w:w="55" w:type="dxa"/></w:tcMar></w:tcPr>${content}</w:tc>`;
}

function row(cells, { header = false, height = 0 } = {}) {
    return `<w:tr><w:trPr>${header ? "<w:tblHeader/>" : ""}<w:cantSplit/>${height ? `<w:trHeight w:val="${height}" w:hRule="atLeast"/>` : ""}</w:trPr>${cells.join("")}</w:tr>`;
}

function table(rows, widths, borders = true) {
    const total = widths.reduce((a, b) => a + b, 0);
    const edge = borders ? "single" : "nil";
    const sz = borders ? "6" : "0";
    return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/><w:tblBorders>${["top","left","bottom","right","insideH","insideV"].map(k => `<w:${k} w:val="${edge}" w:sz="${sz}" w:space="0" w:color="000000"/>`).join("")}</w:tblBorders></w:tblPr><w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>`;
}

function styles() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
}

async function makeDocx(body, { pageWidth = 11907, pageHeight = 16840, marginTop = 426, marginRight = 851, marginBottom = 709, marginLeft = 851 } = {}) {
    if (typeof JSZip === "undefined") throw new Error("Không tải được JSZip để tạo BM06/BM08.");
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="${pageWidth}" w:h="${pageHeight}"/><w:pgMar w:top="${marginTop}" w:right="${marginRight}" w:bottom="${marginBottom}" w:left="${marginLeft}" w:header="360" w:footer="360"/></w:sectPr></w:body></w:document>`;
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

function vnDateWords(value = new Date()) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "TP.HCM, ngày …… tháng …… năm 20…";
    return `TP.HCM, ngày ${String(d.getDate()).padStart(2,"0")} tháng ${String(d.getMonth()+1).padStart(2,"0")} năm ${d.getFullYear()}`;
}

function bm06Header(metadata, examCode) {
    const faculty = metadata.faculty || "KHOA CƠ BẢN 2";
    const department = metadata.department || "BỘ MÔN TOÁN";
    const headerRows = [row([
        cell(`${faculty}\n${department}`, { width: 5000, bold: true }),
        cell(`${p("CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM", { bold: true, align: "center" })}${p("Độc lập - Tự do - Hạnh phúc", { bold: true, align: "center" })}`, { width: 5846 })
    ])];
    return [
        p("Biểu mẫu BM06", { align: "right", bold: true, size: 20 }),
        table(headerRows, [5000, 5846], false),
        p(vnDateWords(), { align: "right", italic: true, after: 45 }),
        p(`MA TRẬN ĐỀ THI – ĐỀ THI ${examCode || ""}`, { align: "center", bold: true, size: 28, after: 70 })
    ].join("");
}

function buildBM06Body(firstExam, metadata = {}) {
    const examCode = firstExam?.examCode || "";
    const widths = [2400, 1600, 1600, 1600, 1600, 2046];
    const rows = [
        row([
            cell("Tên chương/\nbài/ chủ đề", { width: widths[0], bold: true, vMerge: "restart" }),
            cell("Phân phối tỉ lệ", { width: widths[1], bold: true, vMerge: "restart" }),
            cell("Số câu hỏi giữa các mức độ tư duy", { width: widths[2] + widths[3] + widths[4], bold: true, span: 3 }),
            cell("Cộng\n(%)", { width: widths[5], bold: true, vMerge: "restart" })
        ], { header: true }),
        row([
            cell("", { width: widths[0], vMerge: "continue" }),
            cell("", { width: widths[1], vMerge: "continue" }),
            cell("CLO1\n(%)", { width: widths[2], bold: true }),
            cell("CLO2\n(%)", { width: widths[3], bold: true }),
            cell("CLO3\n(%)", { width: widths[4], bold: true }),
            cell("", { width: widths[5], vMerge: "continue" })
        ], { header: true }),
        row(["(1)","(4)","(2)","(3)","(6)","(6)"].map((x, i) => cell(x, { width: widths[i], bold: true })), { header: true })
    ];

    for (let i = 0; i < 6; i++) rows.push(row(widths.map(w => cell("", { width: w })), { height: 850 }));
    rows.push(row([
        cell("TỔNG CỘNG:", { width: widths[0], bold: true }),
        ...widths.slice(1).map(w => cell("", { width: w }))
    ], { height: 700 }));

    const subject = metadata.subject || "";
    const code = metadata.courseCode || "";
    const credits = metadata.credits || "";
    const semester = metadata.semester || "";
    const year = metadata.academicYear || "";
    const className = metadata.className || "";
    const trainingProgram = metadata.trainingProgram || "";

    return [
        bm06Header(metadata, examCode),
        pRuns([{ text: "Kỳ thi: ", bold: true }, { text: semester ? `Học kỳ ${semester}` : "" }, { text: "    Năm học: ", bold: true }, { text: year }, { text: "    Lớp: ", bold: true }, { text: className }]),
        pRuns([{ text: "Chương trình đào tạo đại học ngành: ", bold: true }, { text: trainingProgram }]),
        pRuns([{ text: "Tên học phần: ", bold: true }, { text: subject }]),
        pRuns([{ text: "Mã học phần: ", bold: true }, { text: code }, { text: "    Số tín chỉ: ", bold: true }, { text: credits }]),
        pRuns([{ text: "Ngày thi: ", bold: true }, { text: viDate(metadata.examDate) }, { text: ".    Ca thi: ", bold: true }, { text: metadata.examSession || "" }, { text: ".    Thời gian làm bài thi: ", bold: true }, { text: metadata.durationMinutes ? `${metadata.durationMinutes} phút` : "" }], { after: 70 }),
        table(rows, widths),
        p("TRƯỞNG BỘ MÔN", { align: "right", bold: true, before: 100 }),
        p(metadata.approvedBy || "", { align: "right", bold: true, before: 420 })
    ].join("");
}

function bm08Metadata(metadata = {}) {
    return [
        pRuns([{ text: "Tên học phần: ", bold: true }, { text: metadata.subject || "" }]),
        pRuns([{ text: "Mã học phần: ", bold: true }, { text: metadata.courseCode || "" }]),
        pRuns([{ text: "Số tín chỉ: ", bold: true }, { text: metadata.credits || "" }]),
        pRuns([{ text: "Học kỳ/Năm học: ", bold: true }, { text: `${metadata.semester || ""}${metadata.semester || metadata.academicYear ? "/" : ""}${metadata.academicYear || ""}` }]),
        pRuns([{ text: "Giảng viên ra đề: ", bold: true }, { text: metadata.preparedBy || "" }]),
        pRuns([{ text: "Ngày thi: ", bold: true }, { text: viDate(metadata.examDate) }, { text: "    Ca thi: ", bold: true }, { text: metadata.examSession || "" }]),
        pRuns([{ text: "Hình thức thi: ", bold: true }, { text: metadata.examFormat || "Trắc nghiệm" }], { after: 55 })
    ].join("");
}

function buildBM08Body(exam, metadata = {}) {
    const questions = exam?.questions || [];
    const total = questions.length || 1;
    const point = 10 / total;
    const out = [
        p("Mẫu BM08", { align: "right", bold: true, size: 20 }),
        p(`Mẫu đáp án/hướng dẫn chấm (phiếu chấm theo CLO)-Mã đề ${exam?.examCode || ""}`, { align: "center", bold: true, size: 24, after: 55 }),
        bm08Metadata(metadata),
        p("1. Đáp án & Thang điểm:", { bold: true, after: 30 }),
        p(`Mỗi câu ${String(point.toFixed(2)).replace(".", ",")} điểm.`, { after: 35 })
    ];

    for (let start = 0; start < questions.length; start += 20) {
        const part = questions.slice(start, start + 20);
        const widths = [860, ...part.map(() => 477)];
        out.push(table([
            row([cell("Câu", { width: 860, bold: true }), ...part.map((_, i) => cell(String(start + i + 1), { width: 477 }))]),
            row([cell("Đáp án", { width: 860, bold: true }), ...part.map(q => cell(String(q.correct || "").toUpperCase(), { width: 477, bold: true }))])
        ], widths));
    }

    out.push(p("2. Phiếu chấm theo CLO", { bold: true, before: 50, after: 30 }));
    const cloWidths = [780, 2600, 1900, 1100, 1100, 1300, 1100];
    const cloValues = [...new Set(questions.map(q => normClo(q.clo)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
    const cloRows = [row([
        cell("CLO", { width: cloWidths[0], bold: true }),
        cell("Nội dung đánh giá", { width: cloWidths[1], bold: true }),
        cell("Câu hỏi liên quan", { width: cloWidths[2], bold: true }),
        cell("Trọng số (%)", { width: cloWidths[3], bold: true }),
        cell("Điểm tối đa", { width: cloWidths[4], bold: true }),
        cell("Điểm đạt được", { width: cloWidths[5], bold: true }),
        cell("Nhận xét", { width: cloWidths[6], bold: true })
    ], { header: true })];

    for (const clo of cloValues) {
        const nums = questions.map((q, i) => normClo(q.clo) === clo ? i + 1 : null).filter(Boolean);
        cloRows.push(row([
            cell(clo, { width: cloWidths[0], bold: true }),
            cell("", { width: cloWidths[1] }),
            cell(nums.map(n => `Câu ${n}`).join(", "), { width: cloWidths[2] }),
            cell(`${String((nums.length * 100 / total).toFixed(1)).replace(".0", "")}%`, { width: cloWidths[3] }),
            cell(String((nums.length * point).toFixed(1)).replace(".", ","), { width: cloWidths[4] }),
            cell("…", { width: cloWidths[5] }),
            cell("", { width: cloWidths[6] })
        ], { height: 520 }));
    }
    out.push(table(cloRows, cloWidths));
    out.push(p("Tổng điểm: ……/10", { align: "center", bold: true, before: 40, after: 45 }));
    out.push(p("3. Ghi chú cho giảng viên chấm thi", { bold: true, after: 20 }));
    out.push(p("• Chấm theo ý, không trừ điểm kiểu “lỗi chính tả” nếu không làm sai lệch nội dung."));
    out.push(p("• Với ý trả lời tương đương (không giống đáp án nhưng đúng bản chất), giảng viên cho điểm tương ứng."));
    out.push(p("• Điểm làm tròn đến 0,1.", { after: 60 }));
    out.push(p("TP.HCM, ngày ……… tháng…… năm 20…", { align: "right", italic: true }));
    out.push(table([row([
        cell(`${p("TRƯỞNG BỘ MÔN", { bold: true, align: "center" })}${p("(Ký và ghi rõ họ tên)", { italic: true, align: "center" })}${p(metadata.approvedBy || "", { bold: true, align: "center", before: 340 })}`, { width: 5200 }),
        cell(`${p("GIẢNG VIÊN RA ĐỀ", { bold: true, align: "center" })}${p("(Ký và ghi rõ họ tên)", { italic: true, align: "center" })}${p(metadata.preparedBy || "", { bold: true, align: "center", before: 340 })}`, { width: 5200 })
    ])], [5200, 5200], false));
    return out.join("");
}

export async function exportBMForms(exams, metadata = {}) {
    if (!Array.isArray(exams) || !exams.length) return [];
    const docs = [];
    docs.push({
        name: "BM06_Ma_tran_de_thi.docx",
        blob: await makeDocx(buildBM06Body(exams[0], metadata), {
            pageWidth: 12240, pageHeight: 15840, marginTop: 1440, marginRight: 1440, marginBottom: 1440, marginLeft: 1440
        })
    });
    for (const exam of exams) {
        docs.push({
            name: `BM08_${exam.examCode}.docx`,
            blob: await makeDocx(buildBM08Body(exam, metadata))
        });
    }
    return docs;
}
