/* =====================================================
   answerExtractor.js
   Exam Shuffler v2.3 - Lean Pure-Nodes Engine

   Chức năng:
   - Phân tích và đóng gói cấu trúc câu hỏi nguyên bản dưới dạng XML Nodes.
   - Cấu trúc dữ liệu được tối giản tối đa.
   - Nhận diện đáp án đúng bằng:
       + Gạch chân (w:u)
       + Màu đỏ EE0000
       + Màu đỏ FF0000
===================================================== */

const W_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/**
 * Lấy toàn bộ text thuần của một XML Node
 * @param {Element} node
 * @returns {string}
 */
export function getParagraphText(node) {
    if (!node) return "";

    if (typeof node.getElementsByTagNameNS === "function") {
        const textNodes = node.getElementsByTagNameNS(W_NAMESPACE, "t");
        if (textNodes.length > 0) {
            let text = "";
            for (let i = 0; i < textNodes.length; i++) {
                text += textNodes[i].textContent;
            }
            return text.trim();
        }
    }

    return node.textContent ? node.textContent.trim() : "";
}

/**
 * Kiểm tra XML Node có chứa gạch chân hợp lệ hay không
 * (bỏ qua w:val="none")
 * @param {Element} node
 * @returns {boolean}
 */
export function hasUnderline(node) {
    if (!node || typeof node.getElementsByTagName !== "function") return false;

    const runs = node.getElementsByTagName("w:r");

    for (const run of runs) {
        const u = run.getElementsByTagName("w:u");

        if (u.length > 0) {
            const val = u[0].getAttribute("w:val");

            if (val !== "none") {
                return true;
            }
        }
    }

    return false;
}

/**
 * Kiểm tra XML Node có chứa chữ màu đỏ hay không
 * Hỗ trợ:
 *   - EE0000
 *   - FF0000
 * @param {Element} node
 * @returns {boolean}
 */
export function hasRedColor(node) {
    if (!node || typeof node.getElementsByTagName !== "function") return false;

    const colors = node.getElementsByTagName("w:color");

    for (const color of colors) {
        const val = (color.getAttribute("w:val") || "").toUpperCase();

        if (val === "EE0000" || val === "FF0000") {
            return true;
        }
    }

    return false;
}

/**
 * Kiểm tra một Node có phải đáp án đúng hay không
 * @param {Element} node
 * @returns {boolean}
 */
export function isCorrectAnswer(node) {
    return hasUnderline(node) || hasRedColor(node);
}

/**
 * Phân tích một khối câu hỏi (questionBlock)
 * sang cấu trúc Lean Pure-Nodes
 * @param {Object|Array} questionInput
 */
export function analyzeQuestion(questionInput) {

    let questionNodes = [];

    if (Array.isArray(questionInput)) {
        questionNodes = questionInput;
    } else if (questionInput && typeof questionInput === "object") {
        questionNodes = questionInput.nodes ?? [];
    }

    const result = {
        number: 0,
        clo: "",
        nodes: [...questionNodes],
        stem: [],
        stemText: "",
        choices: [],
        correct: ""
    };

    if (questionNodes.length === 0) {
        return result;
    }

    let currentChoice = null;

    for (const node of questionNodes) {

        const text = getParagraphText(node);

        /* ---------- 1. Số câu ---------- */

        const qMatch =
            text.match(/^Câu\s+(\d+)/i) ||
            text.match(/^Question\s+(\d+)/i) ||
            text.match(/^(\d+)[\.\)]/);

        if (qMatch && result.number === 0) {
            result.number = Number(qMatch[1]);
        }

        /* ---------- 2. CLO ---------- */

        const cloMatch = text.match(/\(CLO\s*(\d+)\)/i);

        if (cloMatch && !result.clo) {
            result.clo = cloMatch[1];
        }

        /* ---------- 3. Lựa chọn A/B/C/D ---------- */

        const choiceMatch = text.match(/^([ABCD])[\.\)]/);

        if (choiceMatch) {

            currentChoice = {
                label: choiceMatch[1],
                choiceIndex: result.choices.length,
                nodes: [node],
                correct: isCorrectAnswer(node),
                text
            };

            result.choices.push(currentChoice);

            if (currentChoice.correct) {
                result.correct = currentChoice.label;
            }

            continue;
        }

        /* ---------- 4. Choice nhiều dòng ---------- */

        if (currentChoice) {

            currentChoice.nodes.push(node);

            if (!currentChoice.correct && isCorrectAnswer(node)) {
                currentChoice.correct = true;
                result.correct = currentChoice.label;
            }

        } else {

            result.stem.push(node);

        }
    }

    result.stemText = result.stem
        .map(getParagraphText)
        .filter(Boolean)
        .join("\n");

    return result;
}

/**
 * Phân tích toàn bộ đề
 * @param {Array} questionBlocks
 * @returns {Array}
 */
export function analyzeQuestions(questionBlocks) {

    if (!Array.isArray(questionBlocks)) {
        throw new TypeError("questionBlocks must be an array.");
    }

    return questionBlocks.map(block => analyzeQuestion(block));
}