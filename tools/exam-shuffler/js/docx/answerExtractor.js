/* =====================================================
   answerExtractor.js
   Exam Shuffler v2.2 - Lean Pure-Nodes Engine

   Chức năng:
   - Phân tích và đóng gói cấu trúc câu hỏi nguyên bản dưới dạng XML Nodes.
   - Cấu trúc dữ liệu được tối giản tối đa: Loại bỏ hoàn toàn dư thừa reference.
===================================================== */

const W_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/**
 * Lấy toàn bộ text thuần của một XML Node (Hỗ trợ OpenXML Namespace & Fallback)
 * @param {Element} node - Node XML (<w:p>, <w:tbl>, ...)
 * @returns {string} Text thuần đã trim
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
 * Kiểm tra xem một XML Node có chứa thẻ gạch chân hợp lệ hay không
 * (Bỏ qua trường hợp thẻ w:u có thuộc tính w:val="none")
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
 * Phân tích một khối câu hỏi (questionBlock) sang cấu trúc Lean Pure-Nodes v2.2
 * @param {Object|Array} questionInput - Khối câu hỏi từ questionSplitter
 */
export function analyzeQuestion(questionInput) {
    let questionNodes = [];
    if (Array.isArray(questionInput)) {
        questionNodes = questionInput;
    } else if (questionInput && typeof questionInput === "object") {
        questionNodes = questionInput.nodes ?? [];
    }

    // Cấu trúc dữ liệu tinh gọn 100%
    const result = {
        number: 0,
        clo: "",
        nodes: [...questionNodes], // Nguồn sự thật duy nhất cho Renderer
        stem: [],                  // Các Node thuộc thân câu hỏi
        stemText: "",              // Text thuần cho debug
        choices: [],               // Danh sách các Lựa chọn
        correct: ""                // Nhãn đáp án đúng (A, B, C, D)
    };

    if (questionNodes.length === 0) {
        return result;
    }

    let currentChoice = null;

    for (const node of questionNodes) {
        const text = getParagraphText(node);

        /* ---------- 1. Nhận diện Số câu ---------- */
        const qMatch = text.match(/^Câu\s+(\d+)/i) || text.match(/^Question\s+(\d+)/i) || text.match(/^(\d+)[\.\)]/);
        if (qMatch && result.number === 0) {
            result.number = Number(qMatch[1]);
        }

        /* ---------- 2. Nhận diện CLO ---------- */
        const cloMatch = text.match(/\(CLO\s*(\d+)\)/i);
        if (cloMatch && !result.clo) {
            result.clo = cloMatch[1];
        }

        /* ---------- 3. Nhận diện các lựa chọn A/B/C/D ---------- */
        const choiceMatch = text.match(/^([ABCD])[\.\)]/);
        
        if (choiceMatch) {
            // Choice tinh gọn: Dùng nodes[0] thay cho xml hay paragraph
            currentChoice = {
                label: choiceMatch[1],
                choiceIndex: result.choices.length,
                nodes: [node],               // Mảng toàn bộ XML Nodes thuộc lựa chọn này
                correct: hasUnderline(node),
                text                         // Phục vụ debug
            };

            result.choices.push(currentChoice);

            if (currentChoice.correct) {
                result.correct = currentChoice.label;
            }
            continue;
        }

        /* ---------- 4. Phân loại Node nối tiếp (Multi-line Choice hoặc Stem) ---------- */
        if (currentChoice) {
            currentChoice.nodes.push(node);

            if (!currentChoice.correct && hasUnderline(node)) {
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
 * Phân tích toàn bộ tập hợp các khối câu hỏi trong đề
 * @param {Array} questionBlocks - Mảng các khối câu hỏi từ questionSplitter
 */
export function analyzeQuestions(questionBlocks) {
    if (!Array.isArray(questionBlocks)) {
        throw new TypeError("questionBlocks must be an array.");
    }
    
    return questionBlocks.map(block => analyzeQuestion(block));
}