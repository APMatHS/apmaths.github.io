/* =====================================================
   appShuffleController.js
   Exam Shuffler v2.8
===================================================== */

import { analyzeExamSource, processExamShuffling } from "./appShuffle.js";
import { exportZip } from "./zip/zipExporter.js";
import { renderAnalysisPreview, collectManualOverrides } from "./preview/examPreview.js";

const fileInput = document.getElementById("docxFile");
const dropZone = document.getElementById("dropZone");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const processBtn = document.getElementById("processBtn");
const checkFormatBtn = document.getElementById("checkFormatBtn");
const analysisPreview = document.getElementById("analysisPreview");
const progressBar = document.getElementById("progressBar");
const statusText = document.getElementById("statusText");
const logContent = document.getElementById("logContent");
const checkList = document.getElementById("checkList");
const questionCountInput = document.getElementById("questionCount");

let selectedFile = null;
let lastAnalysis = null;
let lastAnalysisCount = null;
const MAX_EXAMS = 20;

function log(message) {
    if (!logContent) return;
    logContent.textContent += "\n> " + message;
    logContent.scrollTop = logContent.scrollHeight;
}

function setProgress(percent, text = "") {
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (statusText && text) statusText.textContent = text;
}

function invalidateAnalysis(message = "Cần kiểm tra lại định dạng.") {
    lastAnalysis = null;
    lastAnalysisCount = null;
    if (analysisPreview) {
        analysisPreview.innerHTML = "";
        analysisPreview.classList.add("hidden");
    }
    if (checkList) checkList.innerHTML = `ℹ️ ${message}`;
}

function getExamCodes() {
    const input = document.getElementById("examCodes");
    if (!input) throw new Error("Không tìm thấy ô danh sách mã đề.");

    const examCodes = input.value.split(",").map(code => code.trim()).filter(Boolean);
    if (examCodes.length === 0) throw new Error("Vui lòng nhập ít nhất một mã đề.");
    if (examCodes.length > MAX_EXAMS) throw new Error(`Chỉ hỗ trợ tối đa ${MAX_EXAMS} mã đề trong một lần.`);

    const invalid = examCodes.find(code => !/^\d{3}$/.test(code));
    if (invalid) throw new Error(`Mã đề "${invalid}" không hợp lệ. Mã đề phải gồm 3 chữ số.`);
    if (new Set(examCodes).size !== examCodes.length) throw new Error("Danh sách mã đề có mã trùng nhau.");
    return examCodes;
}

function getExpectedQuestionCount() {
    if (!questionCountInput) throw new Error("Không tìm thấy ô xác nhận số câu.");
    const value = Number(questionCountInput.value);
    if (!Number.isInteger(value) || value < 1 || value > 500) {
        throw new Error("Số câu phải là số nguyên từ 1 đến 500.");
    }
    return value;
}

function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".docx")) {
        alert("Vui lòng chọn file DOCX.");
        return;
    }

    selectedFile = file;
    if (fileName) fileName.textContent = file.name;
    if (fileInfo) fileInfo.classList.remove("hidden");
    invalidateAnalysis("Đã chọn file. Nhập số câu rồi bấm “Kiểm tra định dạng”.");
    log(`Đã chọn file: ${file.name}`);
}

async function runFormatCheck() {
    if (!selectedFile) throw new Error("Vui lòng chọn file Word đề thi gốc.");
    const expectedQuestionCount = getExpectedQuestionCount();

    if (checkFormatBtn) {
        checkFormatBtn.disabled = true;
        checkFormatBtn.classList.add("opacity-60", "cursor-not-allowed");
    }
    setProgress(5, "Đang phân tích định dạng đề...");

    try {
        const analysis = await analyzeExamSource(selectedFile, expectedQuestionCount);
        lastAnalysis = analysis;
        lastAnalysisCount = expectedQuestionCount;

        const d = analysis.diagnostics;
        const sourceNumbers = d.selectedSourceNumbers || [];
        const numberingMismatch = sourceNumbers.some((n, i) => n !== i + 1);

        if (checkList) {
            checkList.innerHTML = `
                ✅ Tìm được đúng <b>${expectedQuestionCount}</b> câu trong một khối.<br>
                ${d.badChoiceCount ? `❌ Có <b>${d.badChoiceCount}</b> câu không đủ 4 phương án.<br>` : "✅ Mỗi câu có 4 phương án A/B/C/D.<br>"}
                ${d.missingCorrect ? `⚠️ Có <b>${d.missingCorrect}</b> câu chưa xác định đúng 1 đáp án — chọn lại ở bên dưới.<br>` : "✅ Đã nhận diện đáp án đúng cho mọi câu.<br>"}
                ${d.missingClo ? `ℹ️ Có <b>${d.missingClo}</b> câu chưa có CLO — CLO không bắt buộc.<br>` : "✅ Đã nhận diện CLO cho mọi câu.<br>"}
                ${numberingMismatch ? "⚠️ Nhãn câu nguồn không liên tục; khi xuất sẽ tự đánh lại từ Câu 1 đến Câu N.<br>" : "✅ Nhãn câu nguồn liên tục.<br>"}
                ℹ️ Đã phát hiện tổng cộng ${d.detectedQuestionStarts} mốc giống đầu câu trong toàn tài liệu.
            `;
        }

        renderAnalysisPreview(analysisPreview, analysis);
        log(`Kiểm tra định dạng: ${expectedQuestionCount} câu; thiếu đáp án ${d.missingCorrect}; thiếu CLO ${d.missingClo}.`);
        setProgress(20, "Đã phân tích xong. Hãy kiểm tra/sửa đáp án và CLO nếu cần.");
        return analysis;
    } finally {
        if (checkFormatBtn) {
            checkFormatBtn.disabled = false;
            checkFormatBtn.classList.remove("opacity-60", "cursor-not-allowed");
        }
    }
}

function validateOverrides(overrides, expectedCount) {
    if (!Array.isArray(overrides) || overrides.length < expectedCount) {
        throw new Error("Dữ liệu kiểm tra chưa đầy đủ. Hãy bấm “Kiểm tra định dạng” lại.");
    }

    const missing = [];
    for (let i = 0; i < expectedCount; i++) {
        if (!/^[A-D]$/.test(String(overrides[i]?.correct || "").toUpperCase())) missing.push(i + 1);
    }
    if (missing.length) {
        throw new Error(`Chưa chọn đáp án đúng cho câu: ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? "..." : ""}.`);
    }
}

if (fileInput) fileInput.addEventListener("change", event => handleFile(event.target.files[0]));
if (questionCountInput) questionCountInput.addEventListener("input", () => invalidateAnalysis("Số câu đã thay đổi. Hãy kiểm tra định dạng lại."));

if (dropZone) {
    ["dragenter", "dragover"].forEach(eventName => {
        dropZone.addEventListener(eventName, event => {
            event.preventDefault();
            dropZone.classList.add("dragover");
        });
    });
    ["dragleave", "drop"].forEach(eventName => {
        dropZone.addEventListener(eventName, event => {
            event.preventDefault();
            dropZone.classList.remove("dragover");
        });
    });
    dropZone.addEventListener("drop", event => handleFile(event.dataTransfer.files[0]));
}

if (checkFormatBtn) {
    checkFormatBtn.addEventListener("click", async () => {
        try {
            await runFormatCheck();
        } catch (error) {
            console.error(error);
            log(`❌ Kiểm tra định dạng: ${error.message}`);
            alert(`Lỗi kiểm tra định dạng: ${error.message}`);
            setProgress(0, "Không thể phân tích đề.");
        }
    });
}

if (processBtn) {
    processBtn.addEventListener("click", async () => {
        if (!selectedFile) {
            alert("Vui lòng chọn file Word đề thi gốc.");
            return;
        }

        processBtn.disabled = true;
        processBtn.classList.add("opacity-60", "cursor-not-allowed");
        setProgress(0, "Bắt đầu kiểm tra đề...");

        try {
            const examCodes = getExamCodes();
            const expectedQuestionCount = getExpectedQuestionCount();

            if (!lastAnalysis || lastAnalysisCount !== expectedQuestionCount) {
                throw new Error("Hãy bấm “Kiểm tra định dạng” và xem lại câu hỏi trước khi trộn.");
            }

            const manualOverrides = collectManualOverrides(analysisPreview);
            validateOverrides(manualOverrides, expectedQuestionCount);

            const badChoices = (lastAnalysis.questions || []).filter(q => (q.choices || []).length !== 4);
            if (badChoices.length) {
                throw new Error(`Có ${badChoices.length} câu không đủ 4 phương án A/B/C/D. Cần sửa file Word trước khi trộn.`);
            }

            log("====================================");
            log(`Xác nhận số câu: ${expectedQuestionCount}`);
            log(`Mã đề: ${examCodes.join(", ")}`);

            const { docxFiles, excelBlob, diagnostics } = await processExamShuffling(
                selectedFile,
                examCodes,
                {
                    shuffleQuestions: true,
                    shuffleChoices: true,
                    expectedQuestionCount,
                    manualOverrides
                },
                (percent, message) => {
                    setProgress(percent, message);
                    log(message);
                }
            );

            setProgress(100, "Đang đóng gói ZIP...");
            await exportZip({
                exams: docxFiles.map(({ examCode, blob }) => ({ name: `Đề_${examCode}.docx`, blob })),
                excels: [{ name: "Dap_An_Tong_Hop.xlsx", blob: excelBlob }],
                zipName: "Exam-CLO.zip"
            });

            if (checkList) {
                const cloText = Object.entries(diagnostics.cloCounts || {})
                    .map(([clo, count]) => `${clo}: ${count}`)
                    .join(" • ") || "Không có CLO";
                checkList.innerHTML = `
                    ✅ Đã tạo ${examCodes.length} mã đề.<br>
                    ✅ Đáp án A/B/C/D được căn chuẩn và nhãn được in đậm.<br>
                    ✅ CLO không bắt buộc; thống kê: ${cloText}.<br>
                    ✅ Excel gồm: Đáp án, Đáp án ngang, CLO Statistics, Đối chiếu đề, Phân tích đề gốc.<br>
                    ✅ Mã đề body/header/footer và PAGE/NUMPAGES được giữ đúng.
                `;
            }

            log("✓ Hoàn tất và đã tạo file ZIP.");
            setProgress(100, "Hoàn tất.");
        } catch (error) {
            console.error(error);
            log(`❌ Lỗi: ${error.message}`);
            alert(`Lỗi: ${error.message}`);
            setProgress(0, "Xảy ra lỗi - chưa xuất bộ đề.");
        } finally {
            processBtn.disabled = false;
            processBtn.classList.remove("opacity-60", "cursor-not-allowed");
        }
    });
}
