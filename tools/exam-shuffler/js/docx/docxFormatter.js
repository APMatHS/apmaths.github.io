/* =====================================================
   docxFormatter.js
   Exam Shuffler v1.2 - Document Formatting Engine

   Chức năng:
   - Chuẩn hóa định dạng đề thi trước khi xuất.
   - Không thay đổi nội dung XML tổng thể, thứ tự Nodes, Equation, Table, Bookmark...
   - Bảo toàn tuyệt đối các định dạng gốc (Bold, Underline nội dung, Color, Tab, Break).
===================================================== */

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// Danh sách mã màu đỏ phổ biến trong MS Word dùng để đánh dấu đáp án
const RED_COLOR_HEX_REGEX = /^(FF0000|EE0000|E60000|D90000|CC0000|C00000|RED)$/i;

/* =====================================================
   Formatter chính
===================================================== */
export function formatExamDocument(nodes) {
    if (!Array.isArray(nodes)) return nodes;

    removeAnswerUnderline(nodes);
    removeAnswerRedColor(nodes);
    formatLabelsInParagraphs(nodes);

    return nodes;
}

/* =====================================================
   1. Xóa gạch chân đáp án CHỈ ở các dòng phương án A/B/C/D
   (Tránh xóa gạch chân minh họa nội dung như vector, kí hiệu)
===================================================== */
export function removeAnswerUnderline(nodes) {
    for (const p of nodes) {
        const runsInfo = getDirectRunsWithText(p);
        if (runsInfo.length === 0) continue;

        const combinedText = runsInfo.map(item => item.text).join("");

        // Chỉ xử lý gạch chân nếu dòng bắt đầu bằng phương án lựa chọn A/B/C/D
        if (/^\s*[A-D][\.\:\)]/.test(combinedText)) {
            const underlines = p.getElementsByTagNameNS(W_NS, "u");

            // HTMLCollection là live collection nên xóa từ cuối về đầu
            for (let i = underlines.length - 1; i >= 0; i--) {
                const u = underlines[i];
                if (u.parentNode) {
                    u.parentNode.removeChild(u);
                }
            }
        }
    }
}

/* =====================================================
   2. Xóa màu ĐỎ đánh dấu đáp án (Giữ nguyên màu minh họa khác)
===================================================== */
export function removeAnswerRedColor(nodes) {
    for (const p of nodes) {
        const runsInfo = getDirectRunsWithText(p);
        if (runsInfo.length === 0) continue;

        const combinedText = runsInfo.map(item => item.text).join("");

        // Chỉ kiểm tra màu nếu dòng bắt đầu bằng phương án lựa chọn A/B/C/D
        if (/^\s*[A-D][\.\:\)]/.test(combinedText)) {
            const colors = p.getElementsByTagNameNS(W_NS, "color");
            
            for (let i = colors.length - 1; i >= 0; i--) {
                const colorNode = colors[i];
                const val = (
    colorNode.getAttributeNS(W_NS, "val") ||
    colorNode.getAttribute("w:val") ||
    colorNode.getAttribute("val") ||
    ""
).trim().toUpperCase();

                // Chỉ xóa nếu thẻ color có giá trị thuộc tông màu đỏ
                if (RED_COLOR_HEX_REGEX.test(val.trim())) {
                    if (colorNode.parentNode) {
                        colorNode.parentNode.removeChild(colorNode);
                    }
                }
            }
        }
    }
}

// Wrapper tương thích ngược
export function removeAnswerColor(nodes) {
    removeAnswerRedColor(nodes);
}

/* =====================================================
   3. Định dạng nhãn "Câu n." và "A./B./C./D."
===================================================== */
export function formatLabelsInParagraphs(nodes) {
    const questionRegex = /^\s*(Câu\s+\d+[\.:]?)/i;
    const choiceRegex = /^\s*([A-D][\.\:\)])/;

    for (const p of nodes) {
        const runsInfo = getDirectRunsWithText(p);
        if (runsInfo.length === 0) continue;

        const combinedText = runsInfo.map(item => item.text).join("");
        let match = combinedText.match(questionRegex);
        if (!match) {
            match = combinedText.match(choiceRegex);
        }

        if (match) {
            const labelLength = match[0].length;
            processParagraphLabelSplit(p, runsInfo, labelLength);
        }
    }
}

export function boldQuestionLabels(nodes) {
    formatLabelsInParagraphs(nodes);
}

export function boldChoiceLabels(nodes) {
    formatLabelsInParagraphs(nodes);
}

/* =====================================================
   Helper Core: Tách Run chính xác tại vị trí kết thúc nhãn
===================================================== */
function processParagraphLabelSplit(pNode, runsInfo, labelLength) {
    const doc = pNode.ownerDocument;
    let accumulated = 0;

    for (let i = 0; i < runsInfo.length; i++) {
        const item = runsInfo[i];
        const rNode = item.runNode;
        const text = item.text;
        const runStart = accumulated;
        const runEnd = accumulated + text.length;

        if (runEnd <= labelLength) {
            // Run nằm trọn vẹn trong phần Nhãn -> Đảm bảo Bold
            ensureBoldInRun(rNode, doc);
        } else if (runStart >= labelLength) {
            // Run nằm hoàn toàn ở phần Nội dung -> GIỮ NGUYÊN (Không can thiệp bold gốc)
        } else {
            // Run nằm đè lên ranh giới (chứa cả nhãn và một phần nội dung)
            
            // AN TOÀN TUYỆT ĐỐI: Nếu Run phức hợp (>1 <w:t>), bỏ qua không tách để tránh làm sai định dạng
            if (!isSafeToSplitRun(rNode)) {
                continue;
            }

            const splitIndex = labelLength - runStart;
            const labelPart = text.substring(0, splitIndex);
            const contentPart = text.substring(splitIndex);

            // 1. Nhân bản Run để làm Run chứa Nhãn (Label)
            const labelRun = rNode.cloneNode(true);
            setRunText(labelRun, labelPart);
            ensureBoldInRun(labelRun, doc);

            // 2. Cập nhật Run hiện tại thành phần Nội dung (Content), giữ nguyên mọi rPr gốc
            setRunText(rNode, contentPart);

            // 3. Chèn labelRun vào trước rNode trong Paragraph
            pNode.insertBefore(labelRun, rNode);
        }

        accumulated = runEnd;
    }
}

/* =====================================================
   Helper Check: Kiểm tra Run có an toàn để tách hay không
===================================================== */
function isSafeToSplitRun(rNode) {
    const tNodes = rNode.getElementsByTagNameNS(W_NS, "t");
    // Chỉ an toàn khi Run chứa chính xác 1 thẻ <w:t>
    return tNodes.length === 1;
}

/* =====================================================
   Helper 1: Trích xuất danh sách Run LÀ CON TRỰC TIẾP và Text
===================================================== */
function getDirectRunsWithText(pNode) {
    const result = [];
    const children = pNode.childNodes;

    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        
        // Chỉ lọc các node <w:r> là con trực tiếp của <w:p>
        if (node.nodeType === 1 && (node.localName === "r" || node.nodeName === "w:r")) {
            const tNodes = node.getElementsByTagNameNS(W_NS, "t");
            
            let runText = "";
            for (let j = 0; j < tNodes.length; j++) {
                runText += tNodes[j].textContent || "";
            }

            if (runText.length > 0) {
                result.push({
                    runNode: node,
                    text: runText
                });
            }
        }
    }

    return result;
}

/* =====================================================
   Helper 2: Cập nhật nội dung cho thẻ <w:t> duy nhất của Run
===================================================== */
function setRunText(rNode, text) {
    const tNodes = rNode.getElementsByTagNameNS(W_NS, "t");

    if (tNodes.length > 0) {
        const t = tNodes[0];
        t.textContent = text;

        // Xóa xml:space cũ trước
        t.removeAttribute("xml:space");
        t.removeAttributeNS("http://www.w3.org/XML/1998/namespace", "space");

        // Chỉ thêm lại khi thực sự cần
        if (/^\s|\s$/.test(text)) {
            t.setAttributeNS(
                "http://www.w3.org/XML/1998/namespace",
                "xml:space",
                "preserve"
            );
        }
    } else {
        const doc = rNode.ownerDocument;
        const t = doc.createElementNS(W_NS, "w:t");
        t.textContent = text;

        if (/^\s|\s$/.test(text)) {
            t.setAttributeNS(
                "http://www.w3.org/XML/1998/namespace",
                "xml:space",
                "preserve"
            );
        }

        rNode.appendChild(t);
    }
}

/* =====================================================
   Helper 3: Bật <w:b/> vào <w:rPr> của Run
===================================================== */
function ensureBoldInRun(rNode, doc) {
    let rPr = rNode.getElementsByTagNameNS(W_NS, "rPr")[0];

    if (!rPr) {
        rPr = doc.createElementNS(W_NS, "w:rPr");
        rNode.insertBefore(rPr, rNode.firstChild);
    }

    const bNodes = rPr.getElementsByTagNameNS(W_NS, "b");
    if (bNodes.length === 0) {
        const newB = doc.createElementNS(W_NS, "w:b");
        rPr.appendChild(newB);
    } else {
        const b = bNodes[0];
        if (b.hasAttribute("w:val")) b.removeAttribute("w:val");
        if (b.hasAttribute("val")) b.removeAttribute("val");
        if (b.hasAttributeNS(W_NS, "val")) b.removeAttributeNS(W_NS, "val");
    }
}