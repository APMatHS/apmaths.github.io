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
        resultDiv.innerHTML = "<p>Đang đọc và xử lý dữ liệu...</p>";

        // 1. Đọc song song 2 Workbook bằng Promise.all để tăng tốc I/O
        const [untWorkbook, answerWorkbook] = await Promise.all([
            readExcel(untFile),
            readExcel(answerFile)
        ]);

        // 2. Phân tích file đáp án
        appState.answerData = readAnswerWorkbook(answerWorkbook);

        // 3. Phân tích file UnT (Chuyển sheet thành mảng 2D rồi parse)
        const untSheetData = sheetToArray(untWorkbook);
        appState.untData = parseUntData(untSheetData);

        // 4. Sinh giao diện hiển thị thống kê
        renderSummaryHTML(appState.answerData, appState.untData);

        // 5. Chấm bài sinh viên
        gradeAllStudents(appState.answerData, appState.untData);

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
        resultDiv.innerHTML = `<p style="color:red"><b>Lỗi:</b> ${err.message}</p>`;
        alert(err.message);
    }
});

//------------------------------------------------
// Hiển thị bảng thống kê dữ liệu lên HTML
//------------------------------------------------
function renderSummaryHTML(answerData, untData) {
    let html = "<h2>ĐỌC DỮ LIỆU THÀNH CÔNG</h2>";

    // Thống kê Đáp án
    html += "<h3>ĐÁP ÁN</h3>";
    html += "<table border='1' style='border-collapse: collapse; width: 100%; text-align: left;'>";
    html += "<tr><th>Mã đề</th><th>Số CLO</th><th>Chi tiết</th></tr>";

    for (const code in answerData.exams) {
        const info = answerData.exams[code];
        const keys = Object.keys(info.cloCount).sort();

        let detail = "";
        keys.forEach((k) => {
            detail += `CLO ${k} : ${info.cloCount[k]} câu<br>`;
        });

        html += `<tr>
            <td><b>${code}</b></td>
            <td>${keys.length}</td>
            <td>${detail}</td>
        </tr>`;
    }
    html += "</table><br>";

    // Thống kê UnT
    html += "<h3>FILE UnT</h3>";
    html += `<p><b>Số bài đọc được:</b> ${untData.students.length}</p>`;
    html += "<table border='1' style='border-collapse: collapse; width: 100%; text-align: left;'>";
    html += "<tr><th>Mã đề</th><th>Số bài</th></tr>";

    Object.keys(untData.examCount)
        .sort()
        .forEach((code) => {
            html += `<tr>
                <td><b>${code}</b></td>
                <td>${untData.examCount[code]}</td>
            </tr>`;
        });

    html += "</table><br>";
    html += "<h2 style='color:green'>✓ Sẵn sàng xuất file Excel</h2>";

    resultDiv.innerHTML = html;
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