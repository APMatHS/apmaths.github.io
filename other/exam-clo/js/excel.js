// =========================================
// excel.js
// Phiên bản 2.0.1
// Đọc và xử lý file Excel
// =========================================


//------------------------------------------
// Đọc file Excel
//------------------------------------------
function readExcel(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = function (e) {

            try {

                const workbook = XLSX.read(e.target.result, {
                    type: "binary"
                });

                resolve(workbook);

            } catch (err) {

                reject(err);

            }

        };

        reader.onerror = reject;

        reader.readAsBinaryString(file);

    });

}



//------------------------------------------
// Chuyển sheet thành mảng
//------------------------------------------
function sheetToArray(workbook, sheetName) {

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {

        throw new Error("Không tìm thấy sheet: " + sheetName);

    }

    return XLSX.utils.sheet_to_json(sheet, {

        header: 1,

        defval: ""

    });

}



//------------------------------------------
// Đọc file đáp án
//------------------------------------------
function readAnswerWorkbook(workbook) {

    const sheetName = workbook.SheetNames[0];

    const data = sheetToArray(workbook, sheetName);

    if (data.length < 2) {

        throw new Error("File đáp án không có dữ liệu.");

    }

    //--------------------------------------------------
    // Tiêu đề
    //--------------------------------------------------

    const header = data[0];

    const exams = {};

    //--------------------------------------------------
    // Tìm các mã đề
    //--------------------------------------------------

    for (let c = 1; c < header.length; c += 2) {

        let examCode = String(header[c]).trim();

        if (examCode === "") continue;

        if (!isNaN(examCode)) {

            examCode = examCode.padStart(3, "0");

        }

        exams[examCode] = {

            answerColumn: c,

            cloColumn: c + 1,

            totalQuestion: 0,

            cloCount: {},

            // ***************
            // MỚI
            // ***************

            questions: {}

        };

    }

    //--------------------------------------------------
    // Đọc từng câu
    //--------------------------------------------------

    for (let r = 1; r < data.length; r++) {

        const question = Number(data[r][0]);

        if (!question) continue;

        for (const code in exams) {

            const info = exams[code];

            const answer = String(
                data[r][info.answerColumn]
            ).trim().toUpperCase();

            const clo = String(
                data[r][info.cloColumn]
            ).trim();

            //------------------------------------------------

            if (answer === "") continue;

            //------------------------------------------------

            info.totalQuestion++;

            //------------------------------------------------

            if (clo !== "") {

                if (!info.cloCount[clo]) {

                    info.cloCount[clo] = 0;

                }

                info.cloCount[clo]++;

            }

            //------------------------------------------------
            // MỚI
            //------------------------------------------------

            info.questions[question] = {

                answer: answer,

                clo: clo

            };

        }

    }

    //--------------------------------------------------

    return {

        sheetName: sheetName,

        data: data,

        exams: exams

    };

}