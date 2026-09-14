/* =====================================================
   answerExtractor.js v2.6
   - CLO: (CLO1), (CLO 1), [CLO1], [CLO 1].
   - Đáp án có thể nằm 4 dòng, 2 dòng dùng Tab, hoặc 1 dòng dùng Tab.
   - Đáp án đúng có thể được đánh dấu bằng underline, màu đỏ, hoặc bold phần nội dung.
   - Lưu layout hàng/slot để choiceShuffle dựng lại bằng w:tab, không dùng table.
===================================================== */

const W_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const M_NAMESPACE = "http://schemas.openxmlformats.org/officeDocument/2006/math";
const REDS = new Set(["FF0000", "EE0000", "E60000", "D90000", "CC0000", "C00000", "RED"]);

function isElement(node, localName) {
    return Boolean(node && node.nodeType === 1 &&
        (node.localName === localName || node.nodeName === `w:${localName}`));
}

function allText(node) {
    if (!node || typeof node.getElementsByTagNameNS !== "function") return "";

    let text = "";
    const wText = node.getElementsByTagNameNS(W_NAMESPACE, "t");
    for (let i = 0; i < wText.length; i++) text += wText[i].textContent || "";

    const mathText = node.getElementsByTagNameNS(M_NAMESPACE, "t");
    for (let i = 0; i < mathText.length; i++) text += mathText[i].textContent || "";

    return text;
}

export function getParagraphText(node) {
    if (!node) return "";
    const text = allText(node);
    return text ? text.trim() : (node.textContent ? node.textContent.trim() : "");
}

function directRunText(run) {
    if (!run || typeof run.getElementsByTagNameNS !== "function") return "";
    return allText(run);
}

function choiceLabelFromText(text) {
    const match = (text || "").match(/^\s*([A-D])\s*[\.\:\)]/);
    return match ? match[1] : null;
}

function cloneRunWithChildren(run, children) {
    const clone = run.cloneNode(false);
    const rPr = Array.from(run.childNodes).find(child => isElement(child, "rPr"));
    if (rPr) clone.appendChild(rPr.cloneNode(true));
    children.forEach(child => clone.appendChild(child.cloneNode(true)));
    return clone;
}

function splitRunAtChoiceLabels(run) {
    if (!isElement(run, "r")) return [run];

    const contentChildren = Array.from(run.childNodes).filter(child => !isElement(child, "rPr"));
    const boundaries = [];

    contentChildren.forEach((child, index) => {
        if (isElement(child, "t") && choiceLabelFromText(child.textContent || "")) {
            boundaries.push(index);
        }
    });

    if (boundaries.length <= 1) return [run];

    const pieces = [];
    const starts = [0, ...boundaries.slice(1)];
    for (let i = 0; i < starts.length; i++) {
        const from = starts[i];
        const to = i + 1 < starts.length ? starts[i + 1] : contentChildren.length;
        pieces.push(cloneRunWithChildren(run, contentChildren.slice(from, to)));
    }
    return pieces;
}

function normalizeChoiceParagraph(paragraph) {
    const clone = paragraph.cloneNode(true);
    const children = Array.from(clone.childNodes);

    for (const child of children) {
        if (!isElement(child, "r")) continue;
        const parts = splitRunAtChoiceLabels(child);
        if (parts.length <= 1) continue;

        for (const part of parts) clone.insertBefore(part, child);
        clone.removeChild(child);
    }
    return clone;
}

function getRuns(nodes) {
    const runs = [];

    for (const node of nodes) {
        if (!node || node.nodeType !== 1) continue;
        if (isElement(node, "r")) runs.push(node);

        if (typeof node.getElementsByTagNameNS === "function") {
            const nested = node.getElementsByTagNameNS(W_NAMESPACE, "r");
            for (let i = 0; i < nested.length; i++) runs.push(nested[i]);
        }
    }

    return runs;
}

function propertyEnabled(run, localName) {
    if (!run || typeof run.getElementsByTagNameNS !== "function") return false;
    const props = run.getElementsByTagNameNS(W_NAMESPACE, localName);

    for (let i = 0; i < props.length; i++) {
        const value = (
            props[i].getAttributeNS(W_NAMESPACE, "val") ||
            props[i].getAttribute("w:val") ||
            props[i].getAttribute("val") ||
            ""
        ).toLowerCase();

        if (!["0", "false", "off", "none"].includes(value)) return true;
    }
    return false;
}

function hasUnderline(nodes) {
    return getRuns(nodes).some(run => propertyEnabled(run, "u"));
}

function hasRed(nodes) {
    for (const run of getRuns(nodes)) {
        const colors = run.getElementsByTagNameNS(W_NAMESPACE, "color");
        for (let i = 0; i < colors.length; i++) {
            const value = (
                colors[i].getAttributeNS(W_NAMESPACE, "val") ||
                colors[i].getAttribute("w:val") ||
                colors[i].getAttribute("val") ||
                ""
            ).trim().toUpperCase();
            if (REDS.has(value)) return true;
        }
    }
    return false;
}

function hasBoldContent(nodes) {
    const runs = getRuns(nodes);
    const runTexts = runs.map(directRunText);
    const combined = runTexts.join("");
    const label = combined.match(/^\s*[A-D]\s*[\.\:\)]\s*/);
    const labelEnd = label ? label[0].length : 0;

    let offset = 0;
    for (let i = 0; i < runs.length; i++) {
        const text = runTexts[i];
        const start = offset;
        const end = offset + text.length;
        offset = end;

        if (!propertyEnabled(runs[i], "b") && !propertyEnabled(runs[i], "bCs")) continue;

        const contentStart = Math.max(start, labelEnd);
        if (contentStart >= end) continue;

        const localStart = contentStart - start;
        if (text.slice(localStart).trim().length > 0) return true;
    }

    return false;
}

function isCorrectChoice(nodes) {
    return hasUnderline(nodes) || hasRed(nodes) || hasBoldContent(nodes);
}

function createRowTemplate(paragraph) {
    const template = paragraph.cloneNode(false);
    const pPr = Array.from(paragraph.childNodes).find(child => isElement(child, "pPr"));
    if (pPr) template.appendChild(pPr.cloneNode(true));
    return template;
}

function parseChoiceRow(paragraph) {
    if (!isElement(paragraph, "p")) return null;

    const normalized = normalizeChoiceParagraph(paragraph);
    const children = Array.from(normalized.childNodes).filter(child => !isElement(child, "pPr"));
    const starts = [];

    children.forEach((child, index) => {
        const label = choiceLabelFromText(directRunText(child));
        if (label) starts.push({ index, label });
    });

    if (starts.length === 0) return null;

    const segments = starts.map((start, idx) => {
        const end = idx + 1 < starts.length ? starts[idx + 1].index : children.length;
        const nodes = children.slice(start.index, end).map(node => node.cloneNode(true));
        return {
            label: start.label,
            nodes,
            text: nodes.map(allText).join("").trim(),
            correct: isCorrectChoice(nodes)
        };
    });

    return {
        template: createRowTemplate(normalized),
        segments
    };
}

function parseQuestionNumber(text) {
    let match = text.match(/^\s*(?:Câu|Question)\s*(\d+)(?=\s|$|[\.\:\)\-–—])/i);
    if (match) return Number(match[1]);

    match = text.match(/^\s*Q\s*(\d+)(?=\s|$|[\.\:\)\-–—])/i);
    if (match) return Number(match[1]);

    match = text.match(/^\s*(\d+)\s*[\.\:\)]/);
    return match ? Number(match[1]) : 0;
}

export function analyzeQuestion(questionInput) {
    const sourceNodes = Array.isArray(questionInput)
        ? questionInput
        : (questionInput && typeof questionInput === "object" ? questionInput.nodes ?? [] : []);

    const questionNodes = sourceNodes.map(node =>
        node && typeof node.cloneNode === "function" ? node.cloneNode(true) : node
    );

    const result = {
        number: 0,
        clo: "",
        nodes: [],
        stem: [],
        stemText: "",
        choices: [],
        layoutRows: [],
        trailing: [],
        correct: ""
    };

    if (questionNodes.length === 0) return result;

    const fullText = questionNodes.map(getParagraphText).join("\n");
    result.number = parseQuestionNumber(fullText);

    const cloMatch = fullText.match(/[\(\[]\s*CLO\s*(\d+)\s*[\)\]]/i);
    if (cloMatch) result.clo = cloMatch[1];

    let choicesStarted = false;

    for (const node of questionNodes) {
        const row = parseChoiceRow(node);

        if (row) {
            choicesStarted = true;
            const indexes = [];

            for (const segment of row.segments) {
                const choiceIndex = result.choices.length;
                indexes.push(choiceIndex);

                result.choices.push({
                    label: segment.label,
                    choiceIndex,
                    nodes: segment.nodes,
                    correct: segment.correct,
                    text: segment.text
                });

                if (segment.correct) result.correct = segment.label;
            }

            result.layoutRows.push({
                passthrough: false,
                template: row.template,
                choiceIndexes: indexes,
                slotCount: indexes.length
            });
            continue;
        }

        if (!choicesStarted) {
            result.stem.push(node);
        } else if (result.choices.length < 4) {
            result.layoutRows.push({
                passthrough: true,
                node
            });
        } else {
            result.trailing.push(node);
        }
    }

    result.stemText = result.stem
        .map(getParagraphText)
        .filter(Boolean)
        .join("\n");

    result.nodes = [
        ...result.stem,
        ...result.layoutRows.map(row => row.passthrough ? row.node : row.template),
        ...result.trailing
    ].filter(Boolean);

    return result;
}

export function analyzeQuestions(questionBlocks) {
    if (!Array.isArray(questionBlocks)) {
        throw new TypeError("questionBlocks must be an array.");
    }
    return questionBlocks.map(block => analyzeQuestion(block));
}
