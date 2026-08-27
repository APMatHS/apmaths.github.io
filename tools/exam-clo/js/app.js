// ============================================
// app.js - Version 4.0
// UnT linh hoạt + OCR số phách + xuất mẫu BM17
// ============================================

import { readExcel, sheetToArray, readAnswerWorkbook } from "./excel.js";
import { normalizeUntData, validateStudentIds } from "./untNormalizer.js";
import { processPhach } from "./phach/index.js";
import { gradeAllStudents } from "./grader.js";
import { calculateAllScores } from "./score.js";
import { exportMark } from "./exportMark.js";
import { exportDetail } from "./exportDetail.js";

const appState = {
    answerData: null,
    untData: null,
    maxScores: null,
    ocrResults: [],
    previewUrls: []
};

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
        stateElement.textContent = file ? file.name : "Chưa chọn file";
        stateElement.classList.toggle("is-selected", !!file);
        if (btnExportMark) btnExportMark.disabled = true;
        if (btnExportDetail) btnExportDetail.disabled = true;
    });
}

bindFileState(untFileInput, untFileState);
bindFileState(answerFileInput, answerFileState);

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function releasePreviewUrls() {
    for (const url of appState.previewUrls) URL.revokeObjectURL(url);
    appState.previewUrls = [];
}

function confidenceClass(level) {
    if (level === "high") return "ocr-high";
    if (level === "medium") return "ocr-medium";
    return "ocr-low";
}

function renderOcrProgress({ current, total, results }) {
    const latest = results.slice(-8);
    const rows = latest.map(item => `
        <tr>
            <td>${item.student.excelRow}</td>
            <td><b>${escapeHtml(item.value)}</b></td>
            <td><span class="ocr-dot ${confidenceClass(item.level)}"></span>${item.confidence}%</td>
            <td>${escapeHtml(item.label)}</td>
        </tr>`).join("");

    resultDiv.innerHTML = `
        <div class="result-box ocr-progress-box">
            <div class="result-head">
                <div>
                    <span class="section-kicker">ĐỌC SỐ PHÁCH</span>
                    <h2 class="result-title">Đang xử lý ${current}/${total} dòng</h2>
                </div>
                <span class="success-pill success-pill--working">OCR</span>
            </div>
            <div class="ocr-progress-track"><span style="width:${Math.round(current * 100 / total)}%"></span></div>
            <div class="table-wrapper">
                <table class="ocr-table">
                    <thead><tr><th>Dòng</th><th>SBD</th><th>Tin cậy</th><th>Trạng thái</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

function renderOcrRows(results) {
    releasePreviewUrls();

    return results.map(item => {
        let imageHtml = "—";
        if (item.imageBlob) {
            const url = URL.createObjectURL(item.imageBlob);
            appState.previewUrls.push(url);
            imageHtml = `<img class="ocr-thumb" src="${url}" alt="Ảnh phách dòng ${item.student.excelRow}">`;
        }

        const source = item.status === "existing" ? "Có sẵn" : item.status === "reviewed" ? "Đã xác nhận" : "OCR";
        return `
            <tr>
                <td>${item.student.excelRow}</td>
                <td>${imageHtml}</td>
                <td><b>${escapeHtml(item.value)}</b></td>
                <td><span class="ocr-dot ${confidenceClass(item.level)}"></span>${item.confidence}%</td>
                <td>${source}</td>
            </tr>`;
    }).join("");
}

function getCloList(answerData) {
    const firstExam = Object.keys(answerData?.exams || {})[0];
    return Object.keys(answerData?.exams?.[firstExam]?.cloCount || {});
}

function renderSummaryHTML(answerData, untData, ocrResults) {
    const examCodes = Object.keys(answerData.exams).sort();
    const untExamCodes = Object.keys(untData.examCount).sort();

    const answerRows = examCodes.map(code => {
        const info = answerData.exams[code];
        const keys = Object.keys(info.cloCount).sort();
        const detail = keys.map(k => `CLO ${escapeHtml(k)}: <b>${info.cloCount[k]}</b> câu`).join(" · ");
        return `<tr><td><b>${escapeHtml(code)}</b></td><td>${keys.length}</td><td class="clo-detail">${detail}</td></tr>`;
    }).join("");

    const untRows = untExamCodes.map(code =>
        `<tr><td><b>${escapeHtml(code)}</b></td><td>${untData.examCount[code]}</td></tr>`
    ).join("");

    const ocrRows = renderOcrRows(ocrResults);
    const existingCount = ocrResults.filter(x => x.status === "existing").length;
    const reviewedCount = ocrResults.filter(x => x.status === "reviewed").length;
    const autoCount = ocrResults.filter(x => x.status === "auto").length;

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
                <div class="summary-item"><h4>Số bài</h4><div class="value">${untData.students.length}</div></div>
                <div class="summary-item"><h4>Số câu</h4><div class="value">${answerData.totalQuestion}</div></div>
                <div class="summary-item"><h4>Số mã đề</h4><div class="value">${examCodes.length}</div></div>
            </div>

            <div class="ocr-summary-line">
                <span>SBD có sẵn: <b>${existingCount}</b></span>
                <span>OCR tự động: <b>${autoCount}</b></span>
                <span>Đã xác nhận: <b>${reviewedCount}</b></span>
            </div>

            <details class="ocr-result-details" open>
                <summary>Kết quả SBD từng dòng</summary>
                <div class="table-wrapper">
                    <table class="ocr-table">
                        <thead><tr><th>Dòng</th><th>Ảnh</th><th>SBD</th><th>Tin cậy</th><th>Nguồn</th></tr></thead>
                        <tbody>${ocrRows}</tbody>
                    </table>
                </div>
                <p class="ocr-legend"><span class="ocr-dot ocr-high"></span> ≥90% &nbsp; <span class="ocr-dot ocr-medium"></span> 70–89% &nbsp; <span class="ocr-dot ocr-low"></span> &lt;70% (đã yêu cầu xác nhận)</p>
            </details>

            <div class="result-grid">
                <div class="result-panel">
                    <h3>Đáp án và phân bố CLO</h3>
                    <div class="table-wrapper"><table><thead><tr><th>Mã đề</th><th>Số CLO</th><th>Chi tiết</th></tr></thead><tbody>${answerRows}</tbody></table></div>
                </div>
                <div class="result-panel">
                    <h3>Số bài theo mã đề</h3>
                    <div class="table-wrapper"><table><thead><tr><th>Mã đề</th><th>Số bài</th></tr></thead><tbody>${untRows}</tbody></table></div>
                </div>
            </div>
        </div>`;
}

btnProcess.addEventListener("click", async () => {
    const untFile = untFileInput?.files?.[0];
    const answerFile = answerFileInput?.files?.[0];

    if (!untFile) return alert("Vui lòng chọn file UnT.");
    if (!answerFile) return alert("Vui lòng chọn file đáp án.");

    try {
        btnProcess.disabled = true;
        if (btnExportMark) btnExportMark.disabled = true;
        if (btnExportDetail) btnExportDetail.disabled = true;
        releasePreviewUrls();

        resultDiv.innerHTML = `<div class="loading-box"><span class="loading-spinner" aria-hidden="true"></span><span>Đang kiểm tra file đáp án và cấu trúc UnT...</span></div>`;

        const [untWorkbook, answerWorkbook] = await Promise.all([
            readExcel(untFile),
            readExcel(answerFile)
        ]);

        // Luôn đọc file đáp án trước để lấy N câu và danh sách mã đề.
        appState.answerData = readAnswerWorkbook(answerWorkbook);
        const untSheetData = sheetToArray(untWorkbook);
        appState.untData = normalizeUntData(untSheetData, appState.answerData);

        // OCR chỉ áp dụng cho SBD còn trống/------. SBD đã có số được giữ nguyên.
        appState.ocrResults = await processPhach(untFile, appState.untData, {
            onProgress: renderOcrProgress
        });
        validateStudentIds(appState.untData);

        gradeAllStudents(appState.answerData, appState.untData);

        const examCodes = Object.keys(appState.answerData.exams);
        const exam = appState.answerData.exams[examCodes[0]];
        appState.maxScores = {};
        for (const clo in exam.cloCount) {
            appState.maxScores[clo] = (exam.cloCount[clo] / exam.totalQuestion) * 10;
        }

        calculateAllScores(appState.answerData, appState.untData, appState.maxScores);

        const cloCount = getCloList(appState.answerData).length;
        if (cloCount > 5) {
            throw new Error("Bảng điểm BM17 chỉ hỗ trợ tối đa 5 CLO.");
        }

        renderSummaryHTML(appState.answerData, appState.untData, appState.ocrResults);
        if (btnExportMark) btnExportMark.disabled = false;
        // Bảng chi tiết theo mẫu người dùng gửi có đúng 3 nhóm CLO.
        if (btnExportDetail) btnExportDetail.disabled = cloCount > 3;

        if (cloCount > 3) {
            const note = document.createElement("div");
            note.className = "warning-box";
            note.textContent = "Bảng chi tiết BM17 chỉ có 3 nhóm CLO nên nút Xuất bảng chi tiết được khóa để tránh mất dữ liệu CLO4/CLO5.";
            resultDiv.appendChild(note);
        }
    } catch (err) {
        console.error(err);
        resultDiv.innerHTML = `<div class="error-box"><b>Không thể chấm bài.</b><br>${escapeHtml(err.message).replace(/\n/g, "<br>")}</div>`;
        alert(err.message);
    } finally {
        btnProcess.disabled = false;
    }
});

btnExportMark?.addEventListener("click", async () => {
    if (!appState.answerData || !appState.untData) return;
    try {
        await exportMark(appState.answerData, appState.untData);
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
});

btnExportDetail?.addEventListener("click", async () => {
    if (!appState.answerData || !appState.untData) return;
    try {
        await exportDetail(appState.answerData, appState.untData);
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
});
