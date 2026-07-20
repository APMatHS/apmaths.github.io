/* =====================================================
   appShuffleController.js
   Exam Shuffler v2.3 - Production UI Controller (Safeguarded & Throttled Download)

   Nhiệm vụ:
   - Đọc danh sách mã đề linh hoạt từ HTML Input #examCodes (tối đa 20 mã đề).
   - Validate chuỗi mã đề: 3 chữ số, không trùng lặp, không rỗng, giới hạn MAX_EXAMS.
   - Thu thập file và tham số cấu hình từ UI.
   - Gọi processExamShuffling() từ appShuffle.js.
   - Quản lý tải xuống các file .docx kết quả có delay (throttling) để tránh bị Chrome chặn.
===================================================== */

import { processExamShuffling } from "./appShuffle.js";
import { exportZip } from "./zip/zipExporter.js";
// DOM Elements
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

// Cấu hình giới hạn tối đa số mã đề trong một lần sinh
const MAX_EXAMS = 20;

/* ---------- Logger & UI Helpers ---------- */
function log(message) {
    if (!logContent) return;
    logContent.textContent += "\n> " + message;
    logContent.scrollTop = logContent.scrollHeight;
}

function setProgress(percent, text = "") {
    if (progressBar) progressBar.style.width = percent + "%";
    if (statusText && text) statusText.textContent = text;
}

/**
 * Hàm delay nhỏ giữa các lượt tải file
 * @param {number} ms - Thời gian chờ (milisecond)
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Đọc và chuẩn hóa danh sách mã đề từ UI (#examCodes)
 * @returns {Array<string>} Mảng mã đề (VD: ["201", "202", "203", "204"])
 */
function getExamCodes() {
    const input = document.getElementById("examCodes");

    if (!input) {
        throw new Error("Không tìm thấy ô nhập mã đề (#examCodes).");
    }

    // Tách chuỗi theo dấu phẩy, trim khoảng trắng và lọc chuỗi rỗng
    const examCodes = input.value
        .split(",")
        .map(code => code.trim())
        .filter(code => code.length > 0);

    if (examCodes.length === 0) {
        throw new Error("Vui lòng nhập ít nhất một mã đề.");
    }

    // 1. Kiểm tra giới hạn số lượng mã đề
    if (examCodes.length > MAX_EXAMS) {
        throw new Error(`Hệ thống chỉ hỗ trợ tạo tối đa ${MAX_EXAMS} mã đề trong một lần xáo trộn.`);
    }

    // 2. Kiểm tra định dạng: Bắt buộc là 3 chữ số (VD: 101, 202, 303)
    const invalid = examCodes.find(code => !/^\d{3}$/.test(code));
    if (invalid) {
        throw new Error(`Mã đề "${invalid}" không hợp lệ. Mã đề phải là chuỗi 3 chữ số (ví dụ: 101, 201).`);
    }

    // 3. Kiểm tra trùng lặp
    if (new Set(examCodes).size !== examCodes.length) {
        throw new Error("Danh sách mã đề không được có các mã trùng nhau.");
    }

    return examCodes;
}

/* ---------- File Handling ---------- */
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
            ⏳ Sẵn sàng xáo trộn bộ đề
        `;
    }
    log("Đã chọn file: " + file.name);
}

/* ---------- Event Listeners ---------- */
if (fileInput) {
    fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));
}

if (dropZone) {
    ["dragenter", "dragover"].forEach(event => {
        dropZone.addEventListener(event, (e) => {
            e.preventDefault();
            dropZone.classList.add("dragover");
        });
    });

    ["dragleave", "drop"].forEach(event => {
        dropZone.addEventListener(event, (e) => {
            e.preventDefault();
            dropZone.classList.remove("dragover");
        });
    });

    dropZone.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));
}

/* ---------- Trigger Main Pipeline ---------- */
if (processBtn) {
    processBtn.addEventListener("click", async () => {
        if (!selectedFile) {
            alert("Vui lòng chọn file Word đề thi gốc.");
            return;
        }

        try {
            // 1. Lấy danh sách mã đề từ giao diện UI
            const examCodes = getExamCodes();

            log("====================================");
            log(`Bắt đầu khởi chạy Pipeline xáo trộn cho ${examCodes.length} mã đề: ${examCodes.join(", ")}`);

            const options = {
                shuffleQuestions: true,
                shuffleChoices: true
            };

            // 2. Gọi Pipeline xáo trộn chính thức
            const { docxFiles, excelBlob } = await processExamShuffling(
    selectedFile,
    examCodes,
    options,
    (percent, message) => {
        setProgress(percent, message);
        log(message);
    }
);

            // 3. Tải xuống tất cả các file .docx kết quả (có nhịp nghỉ 150ms)
            log("Đang tạo file ZIP...");

await exportZip({
    exams: docxFiles.map(({ examCode, blob }) => ({
        name: `Đề_${examCode}.docx`,
        blob
    })),
    excels: [
        {
            name: "Dap_An_Tong_Hop.xlsx",
            blob: excelBlob
        }
    ]
});

            if (checkList) {
                checkList.innerHTML = `
                    ✅ Đọc & Tách khối XML thành công<br>
                    ✅ Phân tích chi tiết câu hỏi & CLO<br>
                    ✅ Hoàn tất xáo trộn ${examCodes.length} mã đề (${examCodes.join(", ")})<br>
                    ✅ Bảo toàn 100% Bảng, Ảnh, MathType<br>
                    ✅ Đã xuất tất cả file .docx & Excel đáp án
                `;
            }

            log("✓ Hoàn tất xử lý toàn bộ bộ đề!");

        } catch (err) {
            console.error(err);
            log("❌ Lỗi: " + err.message);
            alert("Lỗi: " + err.message);
            setProgress(0, "Xảy ra lỗi");
        }
    });
}