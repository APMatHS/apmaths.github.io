// ==============================
// app.js - Version 2.0
// ==============================

const btnRead = document.getElementById("btnProcess");

btnRead.addEventListener("click", async function () {

    const untFile = document.getElementById("untFile").files[0];
    const answerFile = document.getElementById("answerFile").files[0];

    if (!untFile) {
        alert("Vui lòng chọn file UnT.");
        return;
    }

    if (!answerFile) {
        alert("Vui lòng chọn file đáp án.");
        return;
    }

    try {

        document.getElementById("result").innerHTML = "<p>Đang đọc dữ liệu...</p>";

        // Đọc workbook
        const untWorkbook = await readExcel(untFile);
        const answerWorkbook = await readExcel(answerFile);

        // Phân tích file đáp án
        const answerData = readAnswerWorkbook(answerWorkbook);

        // Phân tích file UnT
        const untData = parseUntWorkbook(untWorkbook);

        // Sinh giao diện kết quả
        let html = "";

        html += "<h2>ĐỌC DỮ LIỆU THÀNH CÔNG</h2>";

        //-------------------------------------------------
        // THỐNG KÊ ĐÁP ÁN
        //-------------------------------------------------

        html += "<h3>ĐÁP ÁN</h3>";

        html += "<table>";

        html += "<tr>";
        html += "<th>Mã đề</th>";
        html += "<th>Số CLO</th>";
        html += "<th>Chi tiết</th>";
        html += "</tr>";

        for (const code in answerData.exams) {

            const info = answerData.exams[code];

            const keys = Object.keys(info.cloCount).sort();

            let detail = "";

            keys.forEach(function (k) {

                detail +=
                    "CLO " +
                    k +
                    " : " +
                    info.cloCount[k] +
                    " câu<br>";

            });

            html += "<tr>";

            html += "<td>" + code + "</td>";

            html += "<td>" + keys.length + "</td>";

            html += "<td>" + detail + "</td>";

            html += "</tr>";

        }

        html += "</table>";

        //-------------------------------------------------
        // THỐNG KÊ UNT
        //-------------------------------------------------

        html += "<br>";

        html += "<h3>FILE UnT</h3>";

        html += "<p><b>Số bài đọc được:</b> " + untData.students.length + "</p>";

        html += "<table>";

        html += "<tr>";

        html += "<th>Mã đề</th>";

        html += "<th>Số bài</th>";

        html += "</tr>";

        Object.keys(untData.examCount)
            .sort()
            .forEach(function (code) {

                html += "<tr>";

                html += "<td>" + code + "</td>";

                html += "<td>" + untData.examCount[code] + "</td>";

                html += "</tr>";

            });

        html += "</table>";

        html += "<br>";

        html += "<h2 style='color:green'>✓ Sẵn sàng chấm</h2>";

        document.getElementById("result").innerHTML = html;

// Chấm toàn bộ
gradeAllStudents(answerData, untData);


// ------------------------------
// Tự tính điểm tối đa của từng CLO
// ------------------------------

const exam = answerData.exams[
    Object.keys(answerData.exams)[0]
];

const maxScores = {};

for(const clo in exam.cloCount){

    maxScores[clo] =
        exam.cloCount[clo]
        / exam.totalQuestion
        * 10;

}

// ------------------------------
// Tính điểm
// ------------------------------

calculateAllScores(

    answerData,

    untData,

    maxScores

);



// Lưu dữ liệu
window.answerData = answerData;
window.untData = untData;
window.maxScores = maxScores;

document.getElementById(

    "btnExportMark"

).disabled = false;

document.getElementById(

    "btnExportDetail"

).disabled = false;

// Kiểm tra
console.log(untData.students[0].result);

    }
    catch (err) {

        console.error(err);

        alert(err.message);

    }

});

//------------------------------------------------
// Xuất bảng điểm
//------------------------------------------------

document.getElementById(

    "btnExportMark"

).addEventListener(

    "click",

    function(){

        exportMark(

    window.answerData,

    window.untData

);

    }

);



//------------------------------------------------
// Xuất bảng chi tiết
//------------------------------------------------

document.getElementById(

    "btnExportDetail"

).addEventListener(

    "click",

    function(){

        exportDetail(

    window.answerData,

    window.untData

);

    }

);

