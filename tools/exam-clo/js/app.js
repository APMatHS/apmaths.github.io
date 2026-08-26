// ============================================
// app.js - Version 3.1 (Native ES Module)
// Entry Point cho ứng dụng chấm thi & xuất Excel
// ============================================

import { readExcel, sheetToArray, readAnswerWorkbook } from "./excel.js";
import { parseUntData } from "./parser.js";
import { gradeAllStudents } from "./grader.js";
import { calculateAllScores } from "./score.js";
import { exportMark } from "./exportMark.js";
import { exportDetail } from "./exportDetail.js";

// State lưu trữ dữ liệu ứng dụng (Tránh dùng biến global window)
const appState = {
    answerData: null,
    untData: null,
    maxScores: null
};

// DOM Elements
const btnProcess = document.getElementById("btnProcess");
const btnExportMark = document.getElementById("btnExportMark");
const btnExportDetail = document.getElementById("btnExportDetail");
const resultDiv = document.getElementById("result");
const untFileInput = document.getElementById("untFile");
const answerFileInput = document.getElementById("answerFile");
const untFileState = document.getElementById("untFileState");
const answerFileState = document.getElementById("answerFileState");

function bindFileState(input, stateElement) {
    if (!input || !stateElement) return;

    input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (file) {
            stateElement.textContent = file.name;
            stateElement.classList.add("is-selected");
        } else {
            stateElement.textContent = "Chưa chọn file";
            stateElement.classList.remove("is-selected");
        }
    });
}

bindFileState(untFileInput, untFileState);
bindFileState(answerFileInput, answerFileState);

//------------------------------------------------
// Xử lý đọc file & Chấm điểm
//------------------------------------------------
btnProcess.addEventListener("click", async function () {
    const untFile = document.getElementById("untFile")?.files[0];
    const answerFile = document.getElementById("answerFile")?.files[0];

    if (!untFile) {
        alert("Vui lòng chọn file UnT.");
        return;
    }

    if (!answerFile) {
        alert("Vui lòng chọn file đáp án.");
        return;
    }

    try {
        btnProcess.disabled = true;
        resultDiv.innerHTML = `
            <div class="loading-box">
                <span class="loading-spinner" aria-hidden="true"></span>
                <span>Đang đọc dữ liệu và chấm bài...</span>
            </div>`;

        // 1. Đọc song song 2 Workbook bằng Promise.all để tăng tốc I/O
        const [untWorkbook, answerWorkbook] = await Promise.all([
            readExcel(untFile),
            readExcel(answerFile)
        ]);

        // 2. Phân tích file đáp án
        appState.answerData = readAnswerWorkbook(answerWorkbook);
console.log("Mã đề trong file đáp án:");
console.log(Object.keys(appState.answerData.exams));
        // 3. Phân tích file UnT (Chuyển sheet thành mảng 2D rồi parse)
        const untSheetData = sheetToArray(untWorkbook);
        appState.untData = parseUntData(untSheetData);
console.log("Mã đề trong file UnT:");
console.log(Object.keys(appState.untData.examCount));
        // Kiểm tra số lượng câu giữa file đáp án và file UnT
const answerQuestionCount = appState.answerData.totalQuestion;
const untQuestionCount = appState.untData.questionCount;

if (answerQuestionCount !== untQuestionCount) {
    throw new Error(
        `Số lượng câu hỏi không khớp.\n\n` +
        `File đáp án: ${answerQuestionCount} câu\n` +
        `File UnT: ${untQuestionCount} câu`
    );
}

const answerExamCodes = new Set(Object.keys(appState.answerData.exams));

const invalidExamCodes = Object.keys(appState.untData.examCount)
    .filter(code => code !== "" && !answerExamCodes.has(code));

if (invalidExamCodes.length > 0) {
    throw new Error(
        "Các mã đề sau không tồn tại trong file đáp án:\n\n" +
        invalidExamCodes.join(", ")
    );
}
        // 4. Sinh giao diện hiển thị thống kê
        renderSummaryHTML(appState.answerData, appState.untData);

        console.log("Số sinh viên:", appState.untData.students.length);
console.log("Số câu UnT:", appState.untData.questionCount);
console.log("Số câu đáp án:", appState.answerData.totalQuestion);
console.log("Sinh viên đầu tiên:", appState.untData.students[0]);

        // 5. Chấm bài sinh viên
        gradeAllStudents(appState.answerData, appState.untData);

        console.log("Sau khi chấm:", appState.untData.students[0]);

        // 6. Tính điểm tối đa từng CLO (Business Flow)
        const examCodes = Object.keys(appState.answerData.exams);
        if (examCodes.length === 0) {
            throw new Error("Không tìm thấy mã đề trong file đáp án.");
        }
        
        const exam = appState.answerData.exams[examCodes[0]];
        
        appState.maxScores = {};
        if (exam && exam.totalQuestion > 0) {
            for (const clo in exam.cloCount) {
                appState.maxScores[clo] = (exam.cloCount[clo] / exam.totalQuestion) * 10;
            }
        }

        // 7. Tính điểm GPA và điểm chi tiết CLO
        calculateAllScores(appState.answerData, appState.untData, appState.maxScores);

        // Enable các nút Export
        if (btnExportMark) btnExportMark.disabled = false;
        if (btnExportDetail) btnExportDetail.disabled = false;

        console.log("Mẫu kết quả bài làm sinh viên đầu tiên:", appState.untData.students[0]?.result);

    } catch (err) {
        console.error(err);
        resultDiv.innerHTML = `
            <div class="error-box">
                <b>Không thể chấm bài.</b><br>
                ${String(err.message).replace(/\n/g, "<br>")}
            </div>`;
        alert(err.message);
    } finally {
        btnProcess.disabled = false;
    }
});

//------------------------------------------------
// Hiển thị bảng thống kê dữ liệu lên HTML
//------------------------------------------------
function renderSummaryHTML(answerData, untData) {
    const examCodes = Object.keys(answerData.exams).sort();
    const untExamCodes = Object.keys(untData.examCount).sort();

    let answerRows = "";
    examCodes.forEach((code) => {
        const info = answerData.exams[code];
        const keys = Object.keys(info.cloCount).sort();
        const detail = keys.map(k => `CLO ${k}: <b>${info.cloCount[k]}</b> câu`).join(" · ");

        answerRows += `
            <tr>
                <td><b>${code}</b></td>
                <td>${keys.length}</td>
                <td class="clo-detail">${detail}</td>
            </tr>`;
    });

    let untRows = "";
    untExamCodes.forEach((code) => {
        untRows += `
            <tr>
                <td><b>${code}</b></td>
                <td>${untData.examCount[code]}</td>
            </tr>`;
    });

    resultDiv.innerHTML = `
        <div class="result-box">
            <div class="result-head">
                <div>
                    <span class="section-kicker">KẾT QUẢ KIỂM TRA</span>
                    <h2 class="result-title">Dữ liệu hợp lệ và đã chấm xong</h2>
                </div>
                <span class="success-pill">✓ Sẵn sàng xuất Excel</span>
            </div>

            <div class="summary-container">
                <div class="summary-item">
                    <h4>Số bài</h4>
                    <div class="value">${untData.students.length}</div>
                </div>
                <div class="summary-item">
                    <h4>Số câu</h4>
                    <div class="value">${answerData.totalQuestion}</div>
                </div>
                <div class="summary-item">
                    <h4>Số mã đề</h4>
                    <div class="value">${examCodes.length}</div>
                </div>
            </div>

            <div class="result-grid">
                <div class="result-panel">
                    <h3>Đáp án và phân bố CLO</h3>
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr><th>Mã đề</th><th>Số CLO</th><th>Chi tiết</th></tr>
                            </thead>
                            <tbody>${answerRows}</tbody>
                        </table>
                    </div>
                </div>

                <div class="result-panel">
                    <h3>Số bài theo mã đề</h3>
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr><th>Mã đề</th><th>Số bài</th></tr>
                            </thead>
                            <tbody>${untRows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;
}

//------------------------------------------------
// Sự kiện xuất File Excel
//------------------------------------------------
if (btnExportMark) {
    btnExportMark.addEventListener("click", async () => {
        if (!appState.answerData || !appState.untData) return;
        await exportMark(appState.answerData, appState.untData);
    });
}

if (btnExportDetail) {
    btnExportDetail.addEventListener("click", async () => {
        if (!appState.answerData || !appState.untData) return;
        await exportDetail(appState.answerData, appState.untData);
    });
}