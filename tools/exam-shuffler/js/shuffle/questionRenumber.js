/* =====================================================
   questionRenumber.js
   Exam Shuffler v1.1 - Production Question Renumbering Engine

   Chức năng:
   - Duyệt qua danh sách câu hỏi đã xáo trộn theo thứ tự mới (1, 2, 3...).
   - Tìm thẻ <w:t> đầu tiên chứa chuỗi "Câu x." hoặc "Question x.".
   - Cập nhật số câu hiển thị trực tiếp trong XML DOM.
   - Bảo toàn nguyên vẹn 100% Bảng, Hình ảnh, MathType và các Lựa chọn.
===================================================== */

const W_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/**
 * Cập nhật số câu hiển thị trong XML DOM cho một câu hỏi cụ thể
 * 
 * @param {Object} question - Đối tượng câu hỏi chứa mảng nodes[]
 * @param {number} newNumber - Số thứ tự mới (1, 2, 3, ...)
 */
export function renumberQuestion(question, newNumber) {
    if (!question || !Array.isArray(question.nodes) || question.nodes.length === 0) {
        return question;
    }

    // Duyệt qua từng XML Node trong mảng nodes[] để tìm thẻ <w:t> chứa số câu
    for (const node of question.nodes) {
        if (!node || typeof node.getElementsByTagNameNS !== "function") continue;

        const textNodes = node.getElementsByTagNameNS(W_NAMESPACE, "t");
        let updated = false;

        for (let i = 0; i < textNodes.length; i++) {
            const text = textNodes[i].textContent ?? "";

            // Nhận diện chính xác tiền tố "Câu x." hoặc "Question x." (Giữ nguyên khoảng trắng gốc)
            if (/^(\s*)(Câu|Question)\s+\d+([\.\:\)])/i.test(text)) {
                textNodes[i].textContent = text.replace(
                    /^(\s*)(Câu|Question)\s+\d+([\.\:\)])/i,
                    `$1$2 ${newNumber}$3`
                );
                updated = true;
                break;
            }
        }

        // Đã cập nhật xong nhãn Số câu ở Node đầu tiên tìm thấy -> Bỏ qua các Node còn lại
        if (updated) break;
    }

    // Cập nhật thuộc tính metadata
    question.number = newNumber;
    return question;
}

/**
 * Đánh lại số thứ tự cho toàn bộ danh sách câu hỏi trong một bộ đề
 * 
 * @param {Array} questions - Mảng danh sách câu hỏi đã hoán vị
 * @returns {Array} Danh sách câu hỏi đã được cập nhật số câu tuần tự (1..N)
 */
export function renumberAllQuestions(questions) {
    if (!Array.isArray(questions)) {
        throw new TypeError("Tham số 'questions' phải là một mảng.");
    }

    return questions.map((q, index) => renumberQuestion(q, index + 1));
}