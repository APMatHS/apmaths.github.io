// =========================================
// parser.js
// Phiên bản 2.0
// Phân tích file UnT
// =========================================


//------------------------------------------------
// Đọc file UnT
//------------------------------------------------

function parseUntWorkbook(workbook) {

    const sheetName = workbook.SheetNames[0];

    const data = sheetToArray(workbook, sheetName);

    //------------------------------------------------
    // Dòng bắt đầu sinh viên
    //------------------------------------------------

    const FIRST_ROW = 6;      // dòng 7 trong Excel

    //------------------------------------------------
    // Cột
    //------------------------------------------------

    const COL_SBD = 2;        // C
    const COL_EXAM = 4;       // E
    const FIRST_ANSWER = 5;   // F

    //------------------------------------------------

    const students = [];

    const examCount = {};

    //------------------------------------------------
    // Đọc từng sinh viên
    //------------------------------------------------

    for (let r = FIRST_ROW; r < data.length; r++) {

        const row = data[r];

        //------------------------------------------------

        const sbd = String(row[COL_SBD]).trim();

        if (sbd === "") continue;

        //------------------------------------------------

        let examCode = String(row[COL_EXAM]).trim();

        if (!isNaN(examCode)) {

            examCode = examCode.padStart(3, "0");

        }

        //------------------------------------------------
        // Đếm số bài từng mã đề
        //------------------------------------------------

        if (!examCount[examCode]) {

            examCount[examCode] = 0;

        }

        examCount[examCode]++;

        //------------------------------------------------
        // Đọc đáp án sinh viên
        //------------------------------------------------

        const answers = [];

        for (let c = FIRST_ANSWER; c < row.length; c += 2) {

            let value = String(row[c]).trim();

            value = value.toUpperCase();

            answers.push(value);

        }

        //------------------------------------------------

        students.push({

            rowIndex: r,

            sbd: sbd,

            examCode: examCode,

            answers: answers

        });

    }

    //------------------------------------------------

    return {

        sheetName: sheetName,

        totalStudent: students.length,

        examCount: examCount,

        students: students

    };

}



//------------------------------------------------
// Hiển thị Console để kiểm tra
//------------------------------------------------

function debugStudents(untData) {

    console.clear();

    console.log("===== DANH SÁCH SINH VIÊN =====");

    console.log(untData.students);

    console.log("");

    console.log("===== THỐNG KÊ =====");

    console.log(untData.examCount);

}