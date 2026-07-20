/* =====================================================
   appShuffle.js
   Exam Shuffler v2.4 - Production Pipeline (Streamlined UX)

   Chức năng:
   - Điều phối luồng xử lý từ Zip Reader, Splitter, Extractor, Shuffler.
   - Định dạng văn bản bằng docxFormatter.
   - Render và xuất mảng Blobs cho từng mã đề thi DOCX.
   - Tích hợp Facade exportAnswerExcel để tự động tạo và tải file Excel đáp án.
   - Tối ưu hóa các thông điệp UX Progress cho trải nghiệm mượt mà.
===================================================== */

import { readDocx } from "./docx/docxReader.js";
import { 
    loadDocument, 
    getDocumentBody, 
    updateDocumentBody, 
    writeRawDocument 
} from "./docx/docxWriter.js";
import { splitQuestions } from "./docx/questionSplitter.js";
import { analyzeQuestions } from "./docx/answerExtractor.js";
import { shuffleQuestions } from "./shuffle/questionShuffle.js";
import { shuffleAllChoices } from "./shuffle/choiceShuffle.js";
import { renumberAllQuestions } from "./shuffle/questionRenumber.js";
import { buildExamSet } from "./shuffle/examBuilder.js";
import { validateExamSet } from "./utils/validator.js";
import { applyExamCodeToExam } from "./docx/examCodeWriter.js";
import { exportAnswerExcel } from "./excel/excelExporter.js";
import { formatExamDocument } from "./docx/docxFormatter.js";
import { exportZip } from "./zip/zipExporter.js";

/**
 * Deep clone mảng câu hỏi dựa trên mảng nguyên khối nodes[]
 */
function cloneQuestions(questions) {
    if (!Array.isArray(questions)) return [];

    return questions.map(q => {
        const clonedQ = { ...q };

        if (Array.isArray(q.nodes)) {
            clonedQ.nodes = q.nodes.map(node => (node && typeof node.cloneNode === "function" ? node.cloneNode(true) : node));
        }

        if (Array.isArray(q.stem)) {
            clonedQ.stem = q.stem.map(node => (node && typeof node.cloneNode === "function" ? node.cloneNode(true) : node));
        }

        if (q.questionParagraph && typeof q.questionParagraph.cloneNode === "function") {
            clonedQ.questionParagraph = q.questionParagraph.cloneNode(true);
        }

        if (Array.isArray(q.choices)) {
            clonedQ.choices = q.choices.map(choice => {
                const clonedChoice = { ...choice };
                if (Array.isArray(choice.nodes)) {
                    clonedChoice.nodes = choice.nodes.map(node => (node && typeof node.cloneNode === "function" ? node.cloneNode(true) : node));
                }
                if (choice.paragraph && typeof choice.paragraph.cloneNode === "function") {
                    clonedChoice.paragraph = choice.paragraph.cloneNode(true);
                }
                if (choice.xml && typeof choice.xml.cloneNode === "function") {
                    clonedChoice.xml = choice.xml.cloneNode(true);
                }
                return clonedChoice;
            });
        }

        return clonedQ;
    });
}

/**
 * Tái tạo danh sách Paragraphs/Nodes cho file Word xuất ra
 */
function assembleExamParagraphs(exam) {
    const rebuiltNodes = [];

    if (Array.isArray(exam.header)) {
        rebuiltNodes.push(...exam.header);
    }

    if (Array.isArray(exam.questions)) {
        for (const q of exam.questions) {
            if (Array.isArray(q.nodes)) {
                rebuiltNodes.push(...q.nodes);
            }
        }
    }

    if (Array.isArray(exam.footer)) {
        rebuiltNodes.push(...exam.footer);
    }

    return rebuiltNodes;
}

/**
 * Cầu nối biến đổi dữ liệu Exam Object thành Blob .docx
 */
async function renderExamToBlob(exam, originalZip, parsedXmlDoc) {
    const xmlDocClone = parsedXmlDoc.cloneNode(true);
    const zipClone = originalZip.clone();

    const rawNodes = assembleExamParagraphs(exam);
    
    console.log("Before Formatter");
    // Định dạng lại tài liệu trước khi đưa vào w:body
    const formattedNodes = formatExamDocument(rawNodes);

    updateDocumentBody(xmlDocClone, formattedNodes);
    writeRawDocument(zipClone, xmlDocClone);

    return await zipClone.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
}

/**
 * Pipeline thực thi chính cho Exam Shuffler v2.4
 */
export async function processExamShuffling(
    fileInput,
    examCodes = ["101", "102", "103", "104"],
    options = { shuffleQuestions: true, shuffleChoices: true },
    onProgress = () => {}
) {
    console.time("[Pipeline] Total Execution Time");

    try {
        // 1. Reader: Đọc Zip file
        onProgress(5, "Đang đọc cấu trúc file Word (.docx)...");
        const zip = await readDocx(fileInput);

        // 2. Load XML Document
        onProgress(15, "Đang nạp cấu trúc XML document...");
        const xmlDoc = await loadDocument(zip);

        // 3. Trích xuất thẻ <w:body>
        onProgress(20, "Đang trích xuất thẻ <w:body>...");
        const bodyNode = getDocumentBody(xmlDoc);

        // 4. Splitter: Tách các khối câu hỏi và Header
        onProgress(30, "Đang phân tách các khối câu hỏi & Header...");
        const splitResult = splitQuestions(bodyNode);
        
        const header = splitResult.headerNodes ?? [];
        const questionBlocks = splitResult.questionBlocks ?? [];
        const footer = []; 

        // 5. Extractor: Phân tích chi tiết câu hỏi
        onProgress(40, "Đang phân tích đáp án gạch chân và CLO...");
        const rawQuestions = analyzeQuestions(questionBlocks);

        // 6 & 7. Shuffle: Xáo trộn vị trí câu & đáp án A/B/C/D
        onProgress(55, `Đang xử lý xáo trộn cho ${examCodes.length} mã đề...`);
        const questionSets = examCodes.map((code) => {
            let processedQuestions = cloneQuestions(rawQuestions);

            if (options.shuffleQuestions) {
                processedQuestions = shuffleQuestions(processedQuestions);
            }

            if (options.shuffleChoices) {
                processedQuestions = shuffleAllChoices(processedQuestions);
            }

            processedQuestions = renumberAllQuestions(processedQuestions);
            return processedQuestions;
        });

        // 8. Exam Builder: Ghép các mã đề & Ghi Mã Đề Header
        onProgress(70, "Đang đóng gói cấu trúc bộ đề...");
        const exams = buildExamSet(examCodes, header, questionSets, footer);

        exams.forEach(exam => {
            applyExamCodeToExam(exam, false);
        });

        // 9. Validator: Kiểm tra tính toàn vẹn bộ đề
        onProgress(80, "Đang kiểm tra tính toàn vẹn dữ liệu...");
        if (typeof validateExamSet === "function") {
            const validationResults = validateExamSet(exams);
            
            if (Array.isArray(validationResults) && validationResults.some(r => r && !r.valid)) {
                const invalidCodes = validationResults.filter(r => !r.valid).map(r => r.examCode).join(", ");
                throw new Error(`Kiểm tra tính toàn vẹn thất bại tại các mã đề: ${invalidCodes}`);
            }
        }

        // 10-13. Writer: Render các file Blobs DOCX tương ứng
        onProgress(85, "Đang khởi tạo render các file .docx...");
        const exportResults = await Promise.all(
            exams.map(async (exam, index) => {
                const blob = await renderExamToBlob(exam, zip, xmlDoc);

                const currentPercent = 85 + Math.round(((index + 1) / exams.length) * 10);
                onProgress(currentPercent, `Đã tạo xong mã đề ${exam.examCode} (${index + 1}/${exams.length})`);

                return {
                    examCode: exam.examCode,
                    blob
                };
            })
        );

       // 14. Excel Writer
onProgress(95, "Đang hoàn tất xuất các tệp đầu ra...");

console.log("A");
const excelBlob = await exportAnswerExcel(
    exams,
    "Dap_An_Tong_Hop.xlsx",
    false
);

onProgress(100, "Hoàn tất tạo bộ đề thi và file đáp án Excel!");


console.log("B");

console.log("C");
console.log("exportResults =", exportResults);
console.log("excelBlob =", excelBlob);
return {
    docxFiles: exportResults,
    excelBlob
};

    } catch (error) {
        console.error("[Pipeline Error] Failed to process exam shuffling:", error);
        throw error;
    }
}