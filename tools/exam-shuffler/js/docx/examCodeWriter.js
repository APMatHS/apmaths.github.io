/* =====================================================
   examCodeWriter.js
   Exam Shuffler v2.1 - Robust Multi-Node Replacement Engine

   Chức năng:
   - Nhận mảng Header Nodes và mã đề mới (ví dụ: "101").
   - Duyệt theo từng đoạn văn <w:p> để ghép chuỗi hoàn chỉnh, chống lỗi Run Splitting của Word.
   - Ghi mã đề mới vào thẻ <w:t> đầu tiên của đoạn văn và xóa sạch các thẻ <w:t> thừa kế tiếp.
   - Chỉ thay thế đúng giá trị số của mã đề, bảo toàn 100% văn bản đứng sau (ví dụ: "Thời gian: 60 phút").
===================================================== */

const W_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/**
 * Cập nhật chuỗi Mã đề hiển thị trong một tập hợp XML Nodes (Cấp độ Paragraph)
 * 
 * @param {Array<Node>} headerNodes - Mảng các XML Nodes đại diện cho phần Header đề thi
 * @param {string|number} examCode - Mã đề thi cần ghi vào tài liệu (VD: "101")
 * @returns {boolean} True nếu tìm thấy placeholder và cập nhật thành công, False nếu không tìm thấy
 */
export function updateExamCodeInNodes(headerNodes, examCode) {
    if (!Array.isArray(headerNodes) || headerNodes.length === 0) {
        return false;
    }

    let updated = false;

    for (const topNode of headerNodes) {
        if (!topNode || typeof topNode.getElementsByTagNameNS !== "function") continue;

        // Lấy tất cả các đoạn văn <w:p> bên trong topNode (hoặc chính topNode nếu nó là <w:p>)
        let paragraphs = [];
        if (topNode.nodeName === "w:p") {
            paragraphs = [topNode];
        } else {
            const pNodes = topNode.getElementsByTagNameNS(W_NAMESPACE, "p");
            paragraphs = Array.from(pNodes);
        }

        for (const pNode of paragraphs) {
            const textNodes = Array.from(pNode.getElementsByTagNameNS(W_NAMESPACE, "t"));
            if (textNodes.length === 0) continue;

            // 1. Gom toàn bộ văn bản của đoạn văn lại để kiểm tra regex chuẩn xác
            const fullParagraphText = textNodes.map(t => t.textContent ?? "").join("");

            // 2. Nhận diện đoạn văn có chứa các mẫu tiền tố: "Mã đề:", "Đề số:", "Code:"
            if (/(\s*)(Mã\s+đề|Đề\s+số|Code)\s*:/i.test(fullParagraphText)) {
                
                // 3. Chỉ thay thế phần tiền tố và số mã đề cũ, giữ lại các nội dung phía sau (như Thời gian, Trang...)
                const updatedFullText = fullParagraphText.replace(
                    /(\s*)(Mã\s+đề|Đề\s+số|Code)\s*:\s*\d+/i,
                    `$1$2: ${examCode}`
                );

                // 4. Ghi chuỗi đã cập nhật vào thẻ <w:t> đầu tiên
                textNodes[0].textContent = updatedFullText;

                // 5. Xóa rỗng tất cả các thẻ <w:t> còn lại trong đoạn văn để triệt tiêu các phân mảnh text cũ
                for (let i = 1; i < textNodes.length; i++) {
                    textNodes[i].textContent = "";
                }

                updated = true;
                break;
            }
        }

        if (updated) break;
    }

    return updated;
}

/**
 * Cập nhật Mã đề cho một đối tượng Exam trong Pipeline
 * 
 * @param {Object} exam - Object chứa dữ liệu bộ đề (bao gồm exam.header và exam.examCode)
 * @param {boolean} strict - Nếu true sẽ throw Error khi không tìm thấy placeholder "Mã đề:"
 */
export function applyExamCodeToExam(exam, strict = false) {
    if (!exam) {
        throw new TypeError("Tham số 'exam' không được để trống.");
    }

    const examCode = exam.examCode;
    const headerNodes = exam.header ?? [];

    const isSuccess = updateExamCodeInNodes(headerNodes, examCode);

    if (!isSuccess && strict) {
        throw new Error(`Không tìm thấy vị trí ghi 'Mã đề:' trong Header của đề thi.`);
    }

    return isSuccess;
}