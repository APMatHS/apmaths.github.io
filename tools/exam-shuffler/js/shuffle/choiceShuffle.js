/* =====================================================
   choiceShuffle.js v2.6
   - Trộn A/B/C/D.
   - Dựng lại layout 4 dòng / 2 dòng Tab / 1 dòng Tab.
   - Không dùng table.
   - Làm sạch định dạng đáp án: không bold/italic/underline/màu.
===================================================== */

const LABELS = ["A", "B", "C", "D"];
const W_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function shuffleChoicesArray(choices) {
    const shuffled = [...choices];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function updateChoiceLabelInNodes(nodes, newLabel) {
    for (const node of nodes) {
        if (!node || typeof node.getElementsByTagNameNS !== "function") continue;

        const textNodes = node.getElementsByTagNameNS(W_NAMESPACE, "t");
        for (let i = 0; i < textNodes.length; i++) {
            const text = textNodes[i].textContent || "";
            if (/^\s*[A-D]\s*[\.\:\)]/.test(text)) {
                textNodes[i].textContent = text.replace(
                    /^(\s*)[A-D](\s*[\.\:\)])/, 
                    `$1${newLabel}$2`
                );
                return true;
            }
        }
    }
    return false;
}

function removeDescendants(node, localName) {
    if (!node || typeof node.getElementsByTagNameNS !== "function") return;
    const list = node.getElementsByTagNameNS(W_NAMESPACE, localName);
    for (let i = list.length - 1; i >= 0; i--) {
        const item = list[i];
        if (item.parentNode) item.parentNode.removeChild(item);
    }
}

function ensureRunProperty(run, localName, value) {
    const doc = run.ownerDocument;
    let rPr = Array.from(run.childNodes || []).find(
        child => child.nodeType === 1 && (child.localName === "rPr" || child.nodeName === "w:rPr")
    );

    if (!rPr) {
        rPr = doc.createElementNS(W_NAMESPACE, "w:rPr");
        run.insertBefore(rPr, run.firstChild);
    }

    const prop = doc.createElementNS(W_NAMESPACE, `w:${localName}`);
    if (value != null) prop.setAttributeNS(W_NAMESPACE, "w:val", value);
    rPr.appendChild(prop);
}

function normalizeAnswerFormatting(node) {
    if (!node || typeof node.getElementsByTagNameNS !== "function") return;

    const runs = [];
    if (node.nodeType === 1 && (node.localName === "r" || node.nodeName === "w:r")) runs.push(node);

    const nested = node.getElementsByTagNameNS(W_NAMESPACE, "r");
    for (let i = 0; i < nested.length; i++) runs.push(nested[i]);

    for (const run of runs) {
        ["b", "bCs", "i", "iCs", "u", "color", "rStyle"].forEach(name => removeDescendants(run, name));
        ensureRunProperty(run, "b", "0");
        ensureRunProperty(run, "bCs", "0");
        ensureRunProperty(run, "i", "0");
        ensureRunProperty(run, "iCs", "0");
        ensureRunProperty(run, "u", "none");
        ensureRunProperty(run, "color", "auto");
    }
}

function stripTabs(node) {
    removeDescendants(node, "tab");
}

function makeTabRun(doc) {
    const run = doc.createElementNS(W_NAMESPACE, "w:r");
    const tab = doc.createElementNS(W_NAMESPACE, "w:tab");
    run.appendChild(tab);
    return run;
}

function buildAnswerRows(question, choices) {
    const rows = [];
    let cursor = 0;
    const layoutRows = Array.isArray(question.layoutRows) ? question.layoutRows : [];

    for (const row of layoutRows) {
        if (row.passthrough) {
            if (row.node && typeof row.node.cloneNode === "function") {
                rows.push(row.node.cloneNode(true));
            }
            continue;
        }

        if (!row.template || typeof row.template.cloneNode !== "function") continue;

        const paragraph = row.template.cloneNode(true);
        const slotCount = Math.max(1, Number(row.slotCount) || (row.choiceIndexes?.length ?? 1));

        for (let slot = 0; slot < slotCount; slot++) {
            const choice = choices[cursor++];
            if (!choice) break;

            const segmentNodes = Array.isArray(choice.nodes)
                ? choice.nodes.map(node => node && typeof node.cloneNode === "function" ? node.cloneNode(true) : node)
                : [];

            for (const segmentNode of segmentNodes) {
                if (!segmentNode) continue;
                stripTabs(segmentNode);
                normalizeAnswerFormatting(segmentNode);
                paragraph.appendChild(segmentNode);
            }

            if (slot < slotCount - 1) {
                paragraph.appendChild(makeTabRun(paragraph.ownerDocument));
            }
        }

        rows.push(paragraph);
    }

    if (rows.length === 0 && choices.length === 4) {
        for (const choice of choices) {
            const doc = choice.nodes?.[0]?.ownerDocument;
            if (!doc) continue;
            const p = doc.createElementNS(W_NAMESPACE, "w:p");
            for (const node of choice.nodes ?? []) {
                const clone = node.cloneNode(true);
                stripTabs(clone);
                normalizeAnswerFormatting(clone);
                p.appendChild(clone);
            }
            rows.push(p);
        }
    }

    return rows;
}

export function shuffleChoices(question) {
    if (!question || !Array.isArray(question.choices)) return question;

    if (question.choices.length !== 4) {
        throw new Error(
            `Question ${question.number || "unknown"}: cần đúng 4 phương án A/B/C/D, ` +
            `nhưng phát hiện ${question.choices.length}.`
        );
    }

    const newQuestion = { ...question };

    const shuffledChoices = shuffleChoicesArray(question.choices).map((choice, index) => {
        const cloned = {
            ...choice,
            label: LABELS[index],
            nodes: Array.isArray(choice.nodes)
                ? choice.nodes.map(node => node && typeof node.cloneNode === "function" ? node.cloneNode(true) : node)
                : []
        };

        updateChoiceLabelInNodes(cloned.nodes, cloned.label);
        return cloned;
    });

    const correctChoices = shuffledChoices.filter(choice => choice.correct);
    if (correctChoices.length !== 1) {
        throw new Error(
            `Question ${question.number || "unknown"}: phải có đúng 1 đáp án được đánh dấu; ` +
            `phát hiện ${correctChoices.length}.`
        );
    }

    newQuestion.correct = correctChoices[0].label;
    newQuestion.choices = shuffledChoices;

    const answerRows = buildAnswerRows(newQuestion, shuffledChoices);

    newQuestion.nodes = [
        ...(Array.isArray(question.stem) ? question.stem : []),
        ...answerRows,
        ...(Array.isArray(question.trailing) ? question.trailing : [])
    ];

    return newQuestion;
}

export function shuffleAllChoices(questions) {
    if (!Array.isArray(questions)) {
        throw new TypeError("questions phải là Array.");
    }
    return questions.map(shuffleChoices);
}
