/* =====================================================
   questionSplitter.js v2.0
   - Nhận diện Câu 1 / Câu 1. / Câu 1: / Câu 1) / Q1 / Question 1.
   - Có thể dùng expectedQuestionCount để khóa đúng chuỗi Câu 1..N.
   - Tách phần trước Câu 1 thành header và phần sau đáp án D của câu N thành footer.
===================================================== */

const W_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const ELEMENT_NODE = typeof Node !== "undefined" ? Node.ELEMENT_NODE : 1;

function getParagraphText(paragraph) {
    if (!paragraph || typeof paragraph.getElementsByTagNameNS !== "function") return "";
    const textNodes = paragraph.getElementsByTagNameNS(W_NAMESPACE, "t");
    let text = "";
    for (let i = 0; i < textNodes.length; i++) {
        text += textNodes[i].textContent || "";
    }
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
    if (match) {
        return { number: Number(match[2]), kind: "named", text };
    }

    match = text.match(/^Q\s*(\d+)(?=\s|$|[\.\:\)\-–—])/i);
    if (match) {
        return { number: Number(match[1]), kind: "q", text };
    }

    match = text.match(/^(\d+)\s*[\.\:\)](?=\s|$)/);
    if (match) {
        return { number: Number(match[1]), kind: "numeric", text };
    }

    return null;
}

function findSequentialQuestionStarts(candidates, expectedCount) {
    if (!Number.isInteger(expectedCount) || expectedCount <= 0) return null;

    const preferred = candidates.filter(c => c.kind !== "numeric");
    const pools = preferred.length >= expectedCount ? [preferred, candidates] : [candidates];

    for (const pool of pools) {
        for (let start = 0; start < pool.length; start++) {
            if (pool[start].number !== 1) continue;

            const selected = [pool[start]];
            let nextNumber = 2;

            for (let i = start + 1; i < pool.length && nextNumber <= expectedCount; i++) {
                if (pool[i].number === nextNumber) {
                    selected.push(pool[i]);
                    nextNumber++;
                }
            }

            if (selected.length === expectedCount) return selected;
        }
    }

    return null;
}

function choiceLabelsInText(text) {
    const labels = [];
    const regex = /(?:^|[\s\t])([A-D])\s*[\.\:\)]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        labels.push(match[1]);
    }

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

        const text = getParagraphText(node);
        const labels = choiceLabelsInText(text);
        labels.forEach(label => seen.add(label));

        if (seen.has("A") && seen.has("B") && seen.has("C") && seen.has("D")) {
            return i + 1;
        }
    }

    return nodes.length;
}

export function splitQuestions(bodyNode, expectedQuestionCount = null) {
    if (!bodyNode || typeof bodyNode.childNodes === "undefined") {
        return {
            headerNodes: [],
            questionBlocks: [],
            footerNodes: [],
            totalNodes: 0,
            detectedQuestionStarts: 0
        };
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
        selectedStarts = findSequentialQuestionStarts(candidates, expectedQuestionCount);
        if (!selectedStarts) {
            throw new Error(
                `Không tìm được đúng chuỗi Câu 1 đến Câu ${expectedQuestionCount}. ` +
                `Đã phát hiện ${candidates.length} mốc có dạng đầu câu.`
            );
        }
    } else {
        selectedStarts = candidates;
    }

    if (selectedStarts.length === 0) {
        return {
            headerNodes: nodes.filter(node => !isSectPr(node)),
            questionBlocks: [],
            footerNodes: [],
            totalNodes: nodes.length,
            detectedQuestionStarts: candidates.length
        };
    }

    const firstStart = selectedStarts[0].nodeIndex;
    const headerNodes = nodes
        .slice(0, firstStart)
        .filter(node => !isSectPr(node));

    const questionBlocks = [];
    let footerNodes = [];

    for (let q = 0; q < selectedStarts.length; q++) {
        const startIndex = selectedStarts[q].nodeIndex;
        let endIndex;

        if (q < selectedStarts.length - 1) {
            endIndex = selectedStarts[q + 1].nodeIndex;
        } else if (Number.isInteger(expectedQuestionCount) && expectedQuestionCount > 0) {
            endIndex = findLastQuestionEnd(nodes, startIndex);
            footerNodes = nodes
                .slice(endIndex)
                .filter(node => !isSectPr(node));
        } else {
            endIndex = nodes.length;
        }

        questionBlocks.push({
            index: q + 1,
            startNodeIndex: startIndex,
            questionNumber: selectedStarts[q].number,
            nodes: nodes.slice(startIndex, endIndex).filter(node => !isSectPr(node)),
            answers: [],
            correctAnswer: null
        });
    }

    return {
        headerNodes,
        questionBlocks,
        footerNodes,
        totalNodes: nodes.length,
        detectedQuestionStarts: candidates.length
    };
}

export function isQuestionStart(paragraph) {
    return Boolean(parseQuestionStart(paragraph));
}
