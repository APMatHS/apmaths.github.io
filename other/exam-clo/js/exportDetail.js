// ============================================
// exportDetail.js
// Version 4.0
// Part 1 / 3
// ============================================



//------------------------------------------------
// Xuất bảng Detail
//------------------------------------------------

function exportDetail(answerData,
                      untData){

    //--------------------------------------------

    const workbook =

        XLSX.utils.book_new();

    //--------------------------------------------

    const rows = [];

    //--------------------------------------------

    createDetailHeader(

        rows,

        answerData

    );

    //--------------------------------------------

    createDetailData(

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

    formatDetailSheet(

        worksheet,

        rows

    );

    //--------------------------------------------

    XLSX.utils.book_append_sheet(

        workbook,

        worksheet,

        "Detail"

    );

    //--------------------------------------------

    XLSX.writeFile(

        workbook,

        "Detail.xlsx"

    );

}

// ============================================
// exportDetail.js
// Version 4.0
// Part 2 / 3
// ============================================



//------------------------------------------------
// Tiêu đề
//------------------------------------------------

function createDetailHeader(rows,
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

            header.push(

                "Số câu đúng CLO" + clo

            );

            header.push(

                "Điểm CLO" + clo

            );

        }

    }

    //----------------------------------------

    header.push(

        "GPA"

    );

    //----------------------------------------

    rows.push(header);

}



//------------------------------------------------
// Dữ liệu
//------------------------------------------------

function createDetailData(rows,
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

                student.result.clo[clo]

                    .correctCount

            );

            row.push(

                student.result.detail[clo]

                    .score

            );

        }

        //------------------------------------

        row.push(

            student.result.marks.GPA

        );

        //------------------------------------

        rows.push(row);

    }

}

// ============================================
// exportDetail.js
// Version 4.0
// Part 3 / 3
// ============================================



//------------------------------------------------
// Định dạng Sheet
//------------------------------------------------

function formatDetailSheet(worksheet,
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

    //--------------------------------------------
    // Mỗi CLO gồm 2 cột
    //--------------------------------------------

    for(let i = 2;
        i < cols.length - 1;
        i += 2){

        cols[i].wch = 12;     // Đúng CLO

        cols[i+1].wch = 12;   // Điểm CLO

    }

    //--------------------------------------------

    cols[cols.length-1].wch = 10;   // GPA

    //--------------------------------------------

    worksheet["!cols"] = cols;

}


