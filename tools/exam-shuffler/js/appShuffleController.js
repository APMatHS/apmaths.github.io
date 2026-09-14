/* =====================================================
   appShuffleController.js
   Exam Shuffler v2.6
===================================================== */

import { processExamShuffling } from "./appShuffle.js";
import { exportZip } from "./zip/zipExporter.js";

const fileInput = document.getElementById("docxFile");
const dropZone = document.getElementById("dropZone");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const processBtn = document.getElementById("processBtn");
const progressBar = document.getElementById("progressBar");
const statusText = document.getElementById("statusText");
const logContent = document.getElementById("logContent");
const checkList = document.getElementById("checkList");

let selectedFile = null;
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

function getExamCodes() {
    const input = document.getElementById("examCodes");
    if (!input) throw new Error("Không tìm thấy ô danh sách mã đề.");

    const examCodes = input.value
        .split(",")
        .map(code => code.trim())
        .filter(Boolean);

    if (examCodes.length === 0) {
        throw new Error("Vui lòng nhập ít nhất một mã đề.");
    }

    if (examCodes.length > MAX_EXAMS) {
        throw new Error(`Chỉ hỗ trợ tối đa ${MAX_EXAMS} mã đề trong một lần.`);
    }

    const invalid = examCodes.find(code => !/^\d{3}$/.test(code));
    if (invalid) {
        throw new Error(`Mã đề "${invalid}" không hợp lệ. Mã đề phải gồm 3 chữ số.`);
    }

    if (new Set(examCodes).size !== examCodes.length) {
        throw new Error("Danh sách mã đề có mã trùng nhau.");
    }

    return examCodes;
}

function getExpectedQuestionCount() {
    const input = document.getElementById("questionCount");
    if (!input) throw new Error("Không tìm thấy ô xác nhận số câu.");

    const value = Number(input.value);
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

    if (checkList) {
        checkList.innerHTML = `
            ✅ Đã chọn file DOCX<br>
            ℹ️ Nhập số câu để hệ thống khóa đúng Câu 1 → Câu N và tách đầu/cuối đề.
        `;
    }

    log(`Đã chọn file: ${file.name}`);
}

if (fileInput) {
    fileInput.addEventListener("change", event => handleFile(event.target.files[0]));
}

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

            log("====================================");
            log(`Xác nhận số câu: ${expectedQuestionCount}`);
            log(`Mã đề: ${examCodes.join(", ")}`);

            const { docxFiles, excelBlob, diagnostics } = await processExamShuffling(
                selectedFile,
                examCodes,
                {
                    shuffleQuestions: true,
                    shuffleChoices: true,
                    expectedQuestionCount
                },
                (percent, message) => {
                    setProgress(percent, message);
                    log(message);
                }
            );

            setProgress(100, "Đang đóng gói ZIP...");
            await exportZip({
                exams: docxFiles.map(({ examCode, blob }) => ({
                    name: `Đề_${examCode}.docx`,
                    blob
                })),
                excels: [{
                    name: "Dap_An_Tong_Hop.xlsx",
                    blob: excelBlob
                }],
                zipName: "Exam-CLO.zip"
            });

            if (checkList) {
                checkList.innerHTML = `
                    ✅ Đúng ${diagnostics.expectedQuestionCount} câu<br>
                    ✅ Nhận CLO dạng (CLO1) / [CLO1]<br>
                    ✅ Nhận đáp án 4 dòng, 2 dòng Tab hoặc 1 dòng Tab<br>
                    ✅ Mỗi câu có đúng 4 phương án và 1 đáp án đúng<br>
                    ✅ Đã làm sạch bold/italic/underline/màu của đáp án<br>
                    ✅ Đã cập nhật mã đề trong body/header/footer nếu có<br>
                    ✅ Giữ nguyên field PAGE/NUMPAGES của Word<br>
                    ✅ Đã tạo ${examCodes.length} mã đề và Excel đáp án
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
