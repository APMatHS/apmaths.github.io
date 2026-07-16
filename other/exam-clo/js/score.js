// ============================================
// score.js
// Version 4.0
// Part 1 / 3
// ============================================



//------------------------------------------------
// Tính điểm cho toàn bộ sinh viên
//------------------------------------------------

function calculateAllScores(answerData,
                            untData,
                            maxScores){

    const students = untData.students;

    //--------------------------------------------

    for(const student of students){

        calculateStudentScore(

            student,

            answerData,

            maxScores

        );

    }

}



//------------------------------------------------
// Tính điểm cho một sinh viên
//------------------------------------------------

function calculateStudentScore(student,
                               answerData,
                               maxScores){

    //--------------------------------------------

    if(!student.result){

        return;

    }

    //--------------------------------------------

    const exam =

        answerData.exams[

            student.examCode

        ];

    //--------------------------------------------

    if(!exam){

        return;

    }

    //--------------------------------------------

    const cloStatistic = student.result.clo;

console.log(student.result);
console.log(cloStatistic);

    //--------------------------------------------

    const marks = {};

    const detail = {};

    //--------------------------------------------

    let totalCorrect =

        student.result.correct;

    const totalQuestion =

        student.result.total;

    //--------------------------------------------
    // GPA (thang điểm 10)
    //--------------------------------------------

    const gpa =

        calculateGPA(

            totalCorrect,

            totalQuestion

        );

    //--------------------------------------------
    // Tính từng CLO
    //--------------------------------------------

    for(const clo in cloStatistic){

        const correctQuestion =

            cloStatistic[clo]

                .correctCount;

        //----------------------------------------

        const questionCount =

            cloStatistic[clo]

                .questionCount;

        //----------------------------------------
        // Điểm bảng Marks
        //----------------------------------------

        marks[clo] =

            calculateMarkScore(

                correctQuestion,

                questionCount

            );
console.log(clo, marks[clo]);

        //----------------------------------------
        // Điểm bảng Detail
        //----------------------------------------

        detail[clo] = {

            correctCount:

                correctQuestion,

            score:

                calculateDetailScore(

                    correctQuestion,

                    questionCount,

                    maxScores[clo]

                )

        };

    }

    //--------------------------------------------
    // Hiệu chỉnh bảng Detail
    //--------------------------------------------

    adjustDetailScore(

        detail,

        gpa,

        maxScores,

        cloStatistic

    );

    //--------------------------------------------
    // Lưu kết quả
    //--------------------------------------------

    student.result = {

        ...student.result,

        marks: {

            ...marks,

            GPA: gpa

        },

        detail:

            JSON.parse(

                JSON.stringify(

                    detail

                )

            )

    };

}

// ============================================
// score.js
// Version 4.0
// Part 2 / 3
// ============================================



//------------------------------------------------
// Điểm CLO (bảng Marks)
// Thang điểm 10
//------------------------------------------------

function calculateMarkScore(correctQuestion,
                            totalQuestion){

    if(totalQuestion <= 0){

        return 0;

    }

    return Math.round(

    correctQuestion
    * 10
    / totalQuestion
    * 10

) / 10;

}



//------------------------------------------------
// GPA (bảng Marks)
//------------------------------------------------

function calculateGPA(correctQuestion,
                      totalQuestion){

    if(totalQuestion <= 0){

        return 0;

    }

    return Math.round(

    correctQuestion
    * 10
    / totalQuestion
    * 10

) / 10;

}



//------------------------------------------------
// Điểm thực (bảng Detail)
//------------------------------------------------

function calculateDetailScore(correctQuestion,
                              totalQuestion,
                              maxScore){

    if(totalQuestion <= 0){

        return 0;

    }

    return Math.round(

    correctQuestion
    * maxScore
    / totalQuestion
    * 10

) / 10;

}



//------------------------------------------------
// Hiệu chỉnh ±0.1 cho bảng Detail
//------------------------------------------------

function adjustDetailScore(detail,
                           gpa,
                           maxScores,
                           cloStatistic){

    //----------------------------------------

    let total = 0;

    const clos = Object.keys(detail);

    //----------------------------------------

    for(const clo of clos){

        total += detail[clo].score;

    }

    //----------------------------------------

    let delta = Number(

        (gpa - total).toFixed(1)

    );

    //----------------------------------------

    if(delta === 0){

        return;

    }

    //----------------------------------------
    // Ưu tiên CLO cuối
    //----------------------------------------

    for(let i = clos.length - 1;
        i >= 0;
        i--){

        const clo = clos[i];

        const current =

            detail[clo].score;

        const max =

            Number(

                maxScores[clo]

            );

        //------------------------------------

        if(

            delta > 0 &&

            current < max

        ){

            detail[clo].score =

                Number(

                    (current + 0.1)

                    .toFixed(1)

                );

            return;

        }

        //------------------------------------

        if(

            delta < 0 &&

            current > 0

        ){

            detail[clo].score =

                Number(

                    (current - 0.1)

                    .toFixed(1)

                );

            return;

        }

    }

}

// ============================================
// score.js
// Version 4.0
// Part 3 / 3
// ============================================



//------------------------------------------------
// In điểm của một sinh viên
//------------------------------------------------

function printStudentScore(student){

    if(!student.result){

        return;

    }

    //--------------------------------------------

    console.log(

        "------------------------------"

    );

    console.log(

        "SBD :",

        student.sbd

    );

    console.log(

        "Mã đề :",

        student.examCode

    );

    //--------------------------------------------

    console.log(

        "===== MARKS ====="

    );

    console.table(

        student.result.marks

    );

    //--------------------------------------------

    console.log(

        "===== DETAIL ====="

    );

    console.table(

        student.result.detail

    );

}



//------------------------------------------------
// In điểm toàn lớp
//------------------------------------------------

function printAllScores(untData){

    for(const student of untData.students){

        printStudentScore(

            student

        );

    }

}



//------------------------------------------------
// Chấm điểm nhanh
//------------------------------------------------

function scoreAndSummary(answerData,
                         untData,
                         maxScores){

    //--------------------------------------------



    calculateAllScores(

        answerData,

        untData,

        maxScores

    );

    //--------------------------------------------

    printAllScores(

        untData

    );

}

