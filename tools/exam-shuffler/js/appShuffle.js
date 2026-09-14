/* =====================================================
   appShuffle.js
   Exam Shuffler v2.6
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
import { applyExamCodeToExam, updateExamCodeInZipParts } from "./docx/examCodeWriter.js";
import { exportAnswerExcel } from "./excel/excelExporter.js";
import { formatExamDocument } from "./docx/docxFormatter.js";

function cloneNode(node) {
    return node && typeof node.cloneNode === "function" ? node.cloneNode(true) : node;
}

function cloneQuestions(questions) {
    if (!Array.isArray(questions)) return [];

    return questions.map(q => ({
        ...q,
        nodes: Array.isArray(q.nodes) ? q.nodes.map(cloneNode) : [],
        stem: Array.isArray(q.stem) ? q.stem.map(cloneNode) : [],
        trailing: Array.isArray(q.trailing) ? q.trailing.map(cloneNode) : [],
        choices: Array.isArray(q.choices)
            ? q.choices.map(choice => ({
                ...choice,
                nodes: Array.isArray(choice.nodes) ? choice.nodes.map(cloneNode) : []
            }))
            : [],
        layoutRows: Array.isArray(q.layoutRows)
            ? q.layoutRows.map(row => row.passthrough
                ? { ...row, node: cloneNode(row.node) }
                : {
                    ...row,
                    template: cloneNode(row.template),
                    choiceIndexes: Array.isArray(row.choiceIndexes) ? [...row.choiceIndexes] : []
                })
            : []
    }));
}

function assembleExamNodes(exam) {
    return [
        ...(Array.isArray(exam.header) ? exam.header : []),
        ...(Array.isArray(exam.questions)
            ? exam.questions.flatMap(q => Array.isArray(q.nodes) ? q.nodes : [])
            : []),
        ...(Array.isArray(exam.footer) ? exam.footer : [])
    ];
}

async function renderExamToBlob(exam, originalZip, parsedXmlDoc) {
    const xmlDocClone = parsedXmlDoc.cloneNode(true);
    const zipClone = originalZip.clone();

    const formattedNodes = formatExamDocument(assembleExamNodes(exam));
    updateDocumentBody(xmlDocClone, formattedNodes);
    writeRawDocument(zipClone, xmlDocClone);

    const auxiliaryUpdate = await updateExamCodeInZipParts(zipClone, exam.examCode);

    if (!exam.bodyExamCodeUpdated && auxiliaryUpdate.replacements === 0) {
        throw new Error(
            `Mã đề ${exam.examCode}: không tìm thấy "Mã đề/Đề số/Code" ` +
            `trong phần thân, header hoặc footer của Word.`
        );
    }

    return await zipClone.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
    });
}

export async function processExamShuffling(
    fileInput,
    examCodes = ["101", "102", "103", "104"],
    options = {
        shuffleQuestions: true,
        shuffleChoices: true,
        expectedQuestionCount: null
    },
    onProgress = () => {}
) {
    const expectedQuestionCount = Number(options.expectedQuestionCount);

    if (!Number.isInteger(expectedQuestionCount) || expectedQuestionCount <= 0) {
        throw new Error("Vui lòng xác nhận số câu của đề trước khi trộn.");
    }

    onProgress(5, "Đang đọc cấu trúc file Word...");
    const zip = await readDocx(fileInput);

    onProgress(12, "Đang nạp document.xml...");
    const xmlDoc = await loadDocument(zip);
    const bodyNode = getDocumentBody(xmlDoc);

    onProgress(20, `Đang khóa cấu trúc Câu 1 đến Câu ${expectedQuestionCount}...`);
    const splitResult = splitQuestions(bodyNode, expectedQuestionCount);

    const header = splitResult.headerNodes ?? [];
    const questionBlocks = splitResult.questionBlocks ?? [];
    const footer = splitResult.footerNodes ?? [];

    if (questionBlocks.length !== expectedQuestionCount) {
        throw new Error(
            `Số câu không khớp: xác nhận ${expectedQuestionCount}, ` +
            `nhưng chỉ tách được ${questionBlocks.length}.`
        );
    }

    onProgress(32, "Đang đọc CLO và các phương án A/B/C/D...");
    const rawQuestions = analyzeQuestions(questionBlocks);

    const malformed = rawQuestions
        .map((q, index) => ({
            number: index + 1,
            choices: q.choices.length,
            correct: q.choices.filter(c => c.correct).length,
            clo: q.clo
        }))
        .filter(row => row.choices !== 4 || row.correct !== 1 || !row.clo);

    if (malformed.length > 0) {
        const sample = malformed.slice(0, 5).map(row =>
            `Câu ${row.number}: ${row.choices} PA, ${row.correct} đáp án đúng, ` +
            `${row.clo ? `CLO${row.clo}` : "thiếu CLO"}`
        ).join("; ");
        throw new Error(`Đề chưa đạt kiểm tra trước khi trộn. ${sample}`);
    }

    onProgress(45, `Đã xác nhận ${expectedQuestionCount} câu. Đang tạo ${examCodes.length} mã đề...`);

    const questionSets = examCodes.map(() => {
        let processed = cloneQuestions(rawQuestions);

        if (options.shuffleQuestions !== false) {
            processed = shuffleQuestions(processed);
        }

        if (options.shuffleChoices !== false) {
            processed = shuffleAllChoices(processed);
        }

        return renumberAllQuestions(processed);
    });

    const exams = buildExamSet(examCodes, header, questionSets, footer);

    exams.forEach(exam => {
        exam.bodyExamCodeUpdated = applyExamCodeToExam(exam, false);
    });

    const validationResults = validateExamSet(exams, {
        expectedQuestionCount
    });

    const invalid = validationResults.filter(result => !result.valid);
    if (invalid.length > 0) {
        const summary = invalid
            .map(result => `${result.examCode}: ${result.errors.slice(0, 3).join("; ")}`)
            .join(" | ");
        throw new Error(`Kiểm tra tính toàn vẹn thất bại. ${summary}`);
    }

    // Render tuần tự để tránh tăng đột biến RAM trên điện thoại khi tạo nhiều mã đề.
    const exportResults = [];
    for (let index = 0; index < exams.length; index++) {
        const exam = exams[index];
        const percent = 60 + Math.round((index / exams.length) * 28);
        onProgress(percent, `Đang tạo mã đề ${exam.examCode} (${index + 1}/${exams.length})...`);

        const blob = await renderExamToBlob(exam, zip, xmlDoc);
        exportResults.push({ examCode: exam.examCode, blob });
    }

    onProgress(92, "Đang tạo Excel đáp án và CLO...");
    const excelBlob = await exportAnswerExcel(
        exams,
        "Dap_An_Tong_Hop.xlsx",
        false
    );

    onProgress(100, "Hoàn tất bộ đề và bảng đáp án.");

    return {
        docxFiles: exportResults,
        excelBlob,
        diagnostics: {
            expectedQuestionCount,
            detectedQuestionStarts: splitResult.detectedQuestionStarts,
            headerNodes: header.length,
            footerNodes: footer.length
        }
    };
}
