// ============================================
// exportMark.js
// Version 4.0
// Part 1 / 3
// ============================================



//------------------------------------------------
// Xuất bảng Marks
//------------------------------------------------

function exportMark(answerData,
                    untData){

    //--------------------------------------------

    const workbook =

        XLSX.utils.book_new();

    //--------------------------------------------

    const rows = [];

    //--------------------------------------------

    createMarkHeader(

        rows,

        answerData

    );

    //--------------------------------------------

    createMarkData(

        rows,

        untData,

        answerData

    );

    //--------------------------------------------

    const worksheet =

        XLSX.utils.aoa_to_sheet(

            rows

        );

    //--------------------------------------------

    formatMarkSheet(

        worksheet,

        rows

    );

    //--------------------------------------------

    XLSX.utils.book_append_sheet(

        workbook,

        worksheet,

        "Marks"

    );

    //--------------------------------------------

    XLSX.writeFile(

        workbook,

        "Marks.xlsx"

    );

}


// ============================================
// exportMark.js
// Version 4.0
// Part 2 / 3
// ============================================



//------------------------------------------------
// Tiêu đề
//------------------------------------------------

function createMarkHeader(rows,
                          answerData){

    const header = [

        "STT",

        "SBD"

    ];

    //----------------------------------------

    const exams =

        Object.keys(

            answerData.exams

        );

    //----------------------------------------

    if(exams.length > 0){

        const exam =

            answerData.exams[

                exams[0]

            ];

        //------------------------------------

        for(const clo in exam.cloCount){

            header.push("CLO" + clo);

        }

    }

    //----------------------------------------

    header.push(

        "GPA"

    );

    header.push(

        "GPA (Chữ)"

    );

    header.push(

        "Tổng đúng"

    );

    //----------------------------------------

    rows.push(header);

}



//------------------------------------------------
// Dữ liệu
//------------------------------------------------

function createMarkData(rows,
                        untData,
                        answerData){

    let stt = 1;

    //----------------------------------------

    const exams =

        Object.keys(

            answerData.exams

        );

    //----------------------------------------

    let cloList = [];

    if(exams.length > 0){

        cloList =

            Object.keys(

                answerData.exams[

                    exams[0]

                ].cloCount

            );

    }

    //----------------------------------------

    for(const student of untData.students){

        if(!student.result){

            continue;

        }

        //------------------------------------

        const row = [];

        row.push(stt++);

        row.push(student.sbd);

        //------------------------------------

        for(const clo of cloList){

            row.push(

                student.result.marks[clo]

            );

        }

        //------------------------------------

        row.push(

            student.result.marks.GPA

        );

        //------------------------------------

        row.push(

            numberToVietnamese(

                student.result.marks.GPA

            )

        );

        //------------------------------------

        row.push(

            student.result.correct

        );

        //------------------------------------

        rows.push(row);

    }

}


// ============================================
// exportMark.js
// Version 4.0
// Part 3 / 3
// ============================================



//------------------------------------------------
// Định dạng Sheet
//------------------------------------------------

function formatMarkSheet(worksheet,
                         rows){

    //--------------------------------------------

    const range =

        XLSX.utils.decode_range(

            worksheet["!ref"]

        );

    //--------------------------------------------

    const cols = [];

    for(let c = range.s.c;
        c <= range.e.c;
        c++){

        cols.push({

            wch: 12

        });

    }

    //--------------------------------------------

    cols[0].wch = 8;      // STT
    cols[1].wch = 12;     // SBD

    cols[cols.length-3].wch = 10; // GPA
    cols[cols.length-2].wch = 20; // GPA chữ
    cols[cols.length-1].wch = 12; // Tổng đúng

    worksheet["!cols"] = cols;

}



//------------------------------------------------
// Chuyển điểm sang chữ
//------------------------------------------------

function numberToVietnamese(score){

    score = Number(score).toFixed(1);

    const parts = score.split(".");

    const integerPart = Number(parts[0]);

    const decimalPart = Number(parts[1]);

    const words = [

        "Không",

        "Một",

        "Hai",

        "Ba",

        "Bốn",

        "Năm",

        "Sáu",

        "Bảy",

        "Tám",

        "Chín",

        "Mười"

    ];

    let result = "";

    if(integerPart <= 10){

        result = words[integerPart];

    }else{

        result = integerPart.toString();

    }

    result += " phẩy ";

    if(decimalPart <= 9){

        result += words[decimalPart].toLowerCase();

    }else{

        result += decimalPart.toString();

    }

    return result;

}



