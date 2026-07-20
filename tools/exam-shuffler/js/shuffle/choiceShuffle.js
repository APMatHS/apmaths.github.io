/* =====================================================
   choiceShuffle.js
   Exam Shuffler v2.2 - Nodes-Preserving Choice Shuffler

   Chức năng:
   - Trộn thứ tự phương án A/B/C/D cho từng câu hỏi.
   - Cập nhật lại nhãn hiển thị trong XML DOM.
   - Tái cấu trúc mảng q.nodes để đồng bộ với Renderer.
===================================================== */

const LABELS = ["A", "B", "C", "D"];
const W_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/* =====================================================
   Cập nhật nhãn A/B/C/D trực tiếp trong XML DOM
===================================================== */
function updateChoiceLabelInXml(choiceNode, newLabel) {
    if (!choiceNode || typeof choiceNode.getElementsByTagNameNS !== "function") {
        return;
    }

    const textNodes = choiceNode.getElementsByTagNameNS(W_NAMESPACE, "t");

    for (let i = 0; i < textNodes.length; i++) {
        const textNode = textNodes[i];
        const text = textNode.textContent || "";

        // Hỗ trợ:
        // A.
        // A)
        // A .
        // A )
        if (/^\s*[ABCD]\s*[\.\)]/.test(text)) {
            textNode.textContent = text.replace(
                /^(\s*)[ABCD](\s*[\.\)])/,
                `$1${newLabel}$2`
            );
            return;
        }
    }
}

/* =====================================================
   Fisher-Yates Shuffle
===================================================== */
function shuffleChoicesArray(choices) {
    if (!Array.isArray(choices)) return [];

    const shuffled = [...choices];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

/* =====================================================
   Shuffle phương án
===================================================== */
export function shuffleChoices(question) {

    if (!question ||
        !Array.isArray(question.choices) ||
        question.choices.length === 0) {
        return question;
    }

    const newQuestion = { ...question };

    /* ---------------------------------------------
       1. Shuffle lựa chọn
    --------------------------------------------- */

    const shuffledChoices = shuffleChoicesArray(question.choices).map((choice, index) => {

        const newLabel = LABELS[index] ?? choice.label;

        const updatedChoice = {
            ...choice,
            label: newLabel
        };

        // Cập nhật nhãn trên toàn bộ XML Node của lựa chọn
        if (Array.isArray(updatedChoice.nodes)) {
            for (const node of updatedChoice.nodes) {
                updateChoiceLabelInXml(node, newLabel);
            }
        }

        return updatedChoice;
    });

    /* ---------------------------------------------
       2. Xác định đáp án đúng
    --------------------------------------------- */

    const correctChoice = shuffledChoices.find(choice => choice.correct);

    if (!correctChoice) {
        throw new Error(
            `Question ${question.number || "unknown"}: không tìm thấy đáp án đúng.`
        );
    }

    newQuestion.correct = correctChoice.label;
    newQuestion.choices = shuffledChoices;

    /* ---------------------------------------------
       3. Tái cấu trúc q.nodes
    --------------------------------------------- */

    const newNodes = [];

    // Stem
    if (Array.isArray(question.stem)) {
        newNodes.push(...question.stem);
    }

    // Choices
    for (const choice of shuffledChoices) {
        if (Array.isArray(choice.nodes)) {
            newNodes.push(...choice.nodes);
        }
    }

    newQuestion.nodes = newNodes;

    return newQuestion;
}

/* =====================================================
   Shuffle toàn bộ đề
===================================================== */
export function shuffleAllChoices(questions) {

    if (!Array.isArray(questions)) {
        throw new TypeError("questions phải là Array.");
    }

    return questions.map(shuffleChoices);
}