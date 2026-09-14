/* =====================================================
   docxFormatter.js v2.1
   - Làm sạch định dạng đánh dấu ở các phương án.
   - Không bold nhãn A/B/C/D.
   - Chỉ làm đậm đúng phần nhãn "Câu n"/"Question n"/"Qn", không làm đậm nội dung câu.
===================================================== */

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function paragraphText(pNode) {
    if (!pNode || typeof pNode.getElementsByTagNameNS !== "function") return "";
    const nodes = pNode.getElementsByTagNameNS(W_NS, "t");
    let text = "";
    for (let i = 0; i < nodes.length; i++) text += nodes[i].textContent || "";
    return text;
}

function isAnswerParagraph(pNode) {
    const text = paragraphText(pNode);
    return /(?:^|[\s\t])A\s*[\.\:\)]/.test(text) ||
           /(?:^|[\s\t])B\s*[\.\:\)]/.test(text) ||
           /(?:^|[\s\t])C\s*[\.\:\)]/.test(text) ||
           /(?:^|[\s\t])D\s*[\.\:\)]/.test(text);
}

function removeProps(run, names) {
    for (const name of names) {
        const list = run.getElementsByTagNameNS(W_NS, name);
        for (let i = list.length - 1; i >= 0; i--) {
            const node = list[i];
            if (node.parentNode) node.parentNode.removeChild(node);
        }
    }
}

function ensureProp(run, localName, value) {
    const doc = run.ownerDocument;
    let rPr = Array.from(run.childNodes || []).find(
        child => child.nodeType === 1 && (child.localName === "rPr" || child.nodeName === "w:rPr")
    );

    if (!rPr) {
        rPr = doc.createElementNS(W_NS, "w:rPr");
        run.insertBefore(rPr, run.firstChild);
    }

    const prop = doc.createElementNS(W_NS, `w:${localName}`);
    prop.setAttributeNS(W_NS, "w:val", value);
    rPr.appendChild(prop);
}

function normalizeAnswerParagraph(pNode) {
    const runs = pNode.getElementsByTagNameNS(W_NS, "r");
    for (let i = 0; i < runs.length; i++) {
        const run = runs[i];
        removeProps(run, ["b", "bCs", "i", "iCs", "u", "color", "rStyle"]);
        ensureProp(run, "b", "0");
        ensureProp(run, "bCs", "0");
        ensureProp(run, "i", "0");
        ensureProp(run, "iCs", "0");
        ensureProp(run, "u", "none");
        ensureProp(run, "color", "auto");
    }
}

function ensureBold(run) {
    const doc = run.ownerDocument;
    let rPr = Array.from(run.childNodes || []).find(
        child => child.nodeType === 1 && (child.localName === "rPr" || child.nodeName === "w:rPr")
    );

    if (!rPr) {
        rPr = doc.createElementNS(W_NS, "w:rPr");
        run.insertBefore(rPr, run.firstChild);
    }

    const existing = rPr.getElementsByTagNameNS(W_NS, "b");
    if (existing.length === 0) {
        rPr.appendChild(doc.createElementNS(W_NS, "w:b"));
    } else {
        existing[0].removeAttributeNS(W_NS, "val");
        existing[0].removeAttribute("w:val");
        existing[0].removeAttribute("val");
    }
}

function getDirectRunsWithText(pNode) {
    const result = [];
    for (const node of Array.from(pNode.childNodes || [])) {
        if (node.nodeType !== 1 || !(node.localName === "r" || node.nodeName === "w:r")) continue;

        const tNodes = node.getElementsByTagNameNS(W_NS, "t");
        let text = "";
        for (let i = 0; i < tNodes.length; i++) text += tNodes[i].textContent || "";
        if (text) result.push({ runNode: node, text });
    }
    return result;
}

function setRunText(run, text) {
    const tNodes = run.getElementsByTagNameNS(W_NS, "t");
    if (tNodes.length !== 1) return false;

    const t = tNodes[0];
    t.textContent = text;
    t.removeAttribute("xml:space");
    t.removeAttributeNS("http://www.w3.org/XML/1998/namespace", "space");

    if (/^\s|\s$/.test(text)) {
        t.setAttributeNS(
            "http://www.w3.org/XML/1998/namespace",
            "xml:space",
            "preserve"
        );
    }
    return true;
}

function boldQuestionLabel(paragraph) {
    const runsInfo = getDirectRunsWithText(paragraph);
    if (runsInfo.length === 0) return;

    const combined = runsInfo.map(item => item.text).join("");
    const match = combined.match(/^\s*(?:(?:Câu|Question)\s*\d+|Q\s*\d+)[\.\:\)]?/i);
    if (!match) return;

    const labelEnd = match[0].length;
    let offset = 0;

    for (const item of runsInfo) {
        const run = item.runNode;
        const text = item.text;
        const start = offset;
        const end = offset + text.length;
        offset = end;

        if (end <= labelEnd) {
            ensureBold(run);
            continue;
        }

        if (start >= labelEnd) break;

        const splitIndex = labelEnd - start;
        const tNodes = run.getElementsByTagNameNS(W_NS, "t");
        if (tNodes.length !== 1 || splitIndex <= 0 || splitIndex >= text.length) break;

        const labelRun = run.cloneNode(true);
        if (!setRunText(labelRun, text.slice(0, splitIndex))) break;
        ensureBold(labelRun);

        if (!setRunText(run, text.slice(splitIndex))) break;
        paragraph.insertBefore(labelRun, run);
        break;
    }
}

export function formatExamDocument(nodes) {
    if (!Array.isArray(nodes)) return nodes;

    for (const node of nodes) {
        if (!node || typeof node.getElementsByTagNameNS !== "function") continue;

        const paragraphs = [];
        if (node.nodeType === 1 && (node.localName === "p" || node.nodeName === "w:p")) {
            paragraphs.push(node);
        }

        const nested = node.getElementsByTagNameNS(W_NS, "p");
        for (let i = 0; i < nested.length; i++) {
            if (!paragraphs.includes(nested[i])) paragraphs.push(nested[i]);
        }

        for (const p of paragraphs) {
            if (isAnswerParagraph(p)) normalizeAnswerParagraph(p);
            else boldQuestionLabel(p);
        }
    }

    return nodes;
}

export function removeAnswerUnderline(nodes) { return formatExamDocument(nodes); }
export function removeAnswerRedColor(nodes) { return formatExamDocument(nodes); }
export function removeAnswerColor(nodes) { return formatExamDocument(nodes); }
export function formatLabelsInParagraphs(nodes) { return formatExamDocument(nodes); }
export function boldQuestionLabels(nodes) { return formatExamDocument(nodes); }
export function boldChoiceLabels(nodes) { return nodes; }
