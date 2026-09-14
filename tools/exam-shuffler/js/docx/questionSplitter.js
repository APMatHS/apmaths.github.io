/* =====================================================
   questionSplitter.js v2.2
   - Nhận diện Câu 1 / Câu 1. / Câu 1: / Câu 1) / Q1 / Question 1.
   - Dùng expectedQuestionCount để tìm đúng một KHỐI N câu bắt đầu từ Câu 1.
   - Không bắt buộc nhãn nguồn phải liên tục 1..N; khi xuất sẽ đánh lại số.
   - Nếu file chứa nhiều đề nối tiếp, chỉ giữ header gần nhất của khối được chọn.
===================================================== */

const W_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const ELEMENT_NODE = typeof Node !== "undefined" ? Node.ELEMENT_NODE : 1;

function getParagraphText(paragraph) {
    if (!paragraph || typeof paragraph.getElementsByTagNameNS !== "function") return "";
    const textNodes = paragraph.getElementsByTagNameNS(W_NAMESPACE, "t");
    let text = "";
    for (let i = 0; i < textNodes.length; i++) text += textNodes[i].textContent || "";
    return text.replace(/\u00a0/g, " ");
}

function isSectPr(node) {
    return node && node.nodeType === ELEMENT_NODE &&
        (node.localName === "sectPr" || node.nodeName === "w:sectPr");
}

function parseQuestionStart(paragraph) {
    if (!paragraph || paragraph.nodeType !== ELEMENT_NODE) return null;
    if (!(paragraph.localName === "p" || paragraph.nodeName === "w:p")) return null;

    const text = getParagraphText(paragraph).replace(/\s+/g, " ").trim();
    if (!text) return null;

    let match = text.match(/^(Câu|Question)\s*(\d+)(?=\s|$|[\.\:\)\-–—])/i);
    if (match) return { number: Number(match[2]), kind: "named", text };

    match = text.match(/^Q\s*(\d+)(?=\s|$|[\.\:\)\-–—])/i);
    if (match) return { number: Number(match[1]), kind: "q", text };

    match = text.match(/^(\d+)\s*[\.\:\)](?=\s|$)/);
    if (match) return { number: Number(match[1]), kind: "numeric", text };

    return null;
}

function candidatePools(candidates) {
    const preferred = candidates.filter(c => c.kind !== "numeric");
    return preferred.length ? [preferred, candidates] : [candidates];
}

function findQuestionBlock(candidates, expectedCount) {
    if (!Number.isInteger(expectedCount) || expectedCount <= 0) return null;

    for (const pool of candidatePools(candidates)) {
        for (let start = 0; start < pool.length; start++) {
            if (pool[start].number !== 1) continue;

            const slice = pool.slice(start, start + expectedCount);
            if (slice.length !== expectedCount) continue;
            if (slice.slice(1).some(item => item.number === 1)) continue;
            return slice;
        }
    }
    return null;
}

function choiceLabelsInText(text) {
    const labels = [];
    const regex = /(?:^|[\s\t])([A-D])\s*[\.\:\)]/g;
    let match;
    while ((match = regex.exec(text)) !== null) labels.push(match[1]);

    if (labels.length === 0) {
        const fallback = /([A-D])\s*[\.\:\)]/g;
        while ((match = fallback.exec(text)) !== null) labels.push(match[1]);
    }
    return labels;
}

function findLastQuestionEnd(nodes, startIndex) {
    const seen = new Set();
    for (let i = startIndex; i < nodes.length; i++) {
        const node = nodes[i];
        if (isSectPr(node)) continue;
        if (!node || node.nodeType !== ELEMENT_NODE) continue;

        choiceLabelsInText(getParagraphText(node)).forEach(label => seen.add(label));
        if (seen.has("A") && seen.has("B") && seen.has("C") && seen.has("D")) return i + 1;
    }
    return nodes.length;
}

function looksLikeExamTitle(text) {
    const normalized = String(text || "").replace(/\s+/g, " ").trim().toUpperCase();
    if (!normalized) return false;
    return /^(ĐỀ|DE)\s+(THI|KIỂM TRA|KIEM TRA)/i.test(normalized) ||
           /^(BÀI|BAI)\s+(THI|KIỂM TRA|KIEM TRA)/i.test(normalized);
}

/**
 * Khi đã có một khối câu khác trước khối được chọn, tìm tiêu đề đề gần nhất để cắt bỏ đề cũ.
 * Nếu không thấy tiêu đề rõ ràng thì giữ header từ đầu tài liệu như hành vi truyền thống.
 */
function findHeaderStart(nodes, firstStart, candidates) {
    const earlierQuestionExists = candidates.some(c => c.nodeIndex < firstStart && c.number === 1);
    if (!earlierQuestionExists) return 0;

    for (let i = firstStart - 1; i >= 0; i--) {
        if (isSectPr(nodes[i])) continue;
        const text = getParagraphText(nodes[i]);
        if (looksLikeExamTitle(text)) return i;
    }
    return 0;
}

export function splitQuestions(bodyNode, expectedQuestionCount = null) {
    if (!bodyNode || typeof bodyNode.childNodes === "undefined") {
        return { headerNodes: [], questionBlocks: [], footerNodes: [], totalNodes: 0, detectedQuestionStarts: 0 };
    }

    const nodes = Array.from(bodyNode.childNodes);
    const candidates = [];

    nodes.forEach((node, index) => {
        if (isSectPr(node)) return;
        const parsed = parseQuestionStart(node);
        if (parsed) candidates.push({ ...parsed, nodeIndex: index });
    });

    let selectedStarts;
    if (Number.isInteger(expectedQuestionCount) && expectedQuestionCount > 0) {
        selectedStarts = findQuestionBlock(candidates, expectedQuestionCount);
        if (!selectedStarts) {
            throw new Error(
                `Không tìm được một khối gồm ${expectedQuestionCount} câu bắt đầu từ Câu 1. ` +
                `Đã phát hiện ${candidates.length} mốc có dạng đầu câu.`
            );
        }
    } else {
        selectedStarts = candidates;
    }

    if (selectedStarts.length === 0) {
        return {
            headerNodes: nodes.filter(node => !isSectPr(node)),
            questionBlocks: [], footerNodes: [], totalNodes: nodes.length,
            detectedQuestionStarts: candidates.length
        };
    }

    const firstStart = selectedStarts[0].nodeIndex;
    const headerStart = findHeaderStart(nodes, firstStart, candidates);
    const headerNodes = nodes.slice(headerStart, firstStart).filter(node => !isSectPr(node));
    const questionBlocks = [];
    let footerNodes = [];

    for (let q = 0; q < selectedStarts.length; q++) {
        const startIndex = selectedStarts[q].nodeIndex;
        let endIndex;

        if (q < selectedStarts.length - 1) {
            endIndex = selectedStarts[q + 1].nodeIndex;
        } else if (Number.isInteger(expectedQuestionCount) && expectedQuestionCount > 0) {
            endIndex = findLastQuestionEnd(nodes, startIndex);
            footerNodes = nodes.slice(endIndex).filter(node => !isSectPr(node));
        } else {
            endIndex = nodes.length;
        }

        questionBlocks.push({
            index: q + 1,
            startNodeIndex: startIndex,
            questionNumber: selectedStarts[q].number,
            nodes: nodes.slice(startIndex, endIndex).filter(node => !isSectPr(node)),
            answers: [], correctAnswer: null
        });
    }

    return {
        headerNodes, questionBlocks, footerNodes,
        totalNodes: nodes.length,
        detectedQuestionStarts: candidates.length,
        selectedSourceNumbers: selectedStarts.map(item => item.number),
        headerStartNodeIndex: headerStart
    };
}

export function isQuestionStart(paragraph) {
    return Boolean(parseQuestionStart(paragraph));
}
