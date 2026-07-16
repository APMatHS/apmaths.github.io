// ============================================
// grader.js
// Version 2.1
// Part 1 / 4
// ============================================



//------------------------------------------------
// Chấm toàn bộ sinh viên
//------------------------------------------------

function gradeAllStudents(answerData, untData) {

    const students = untData.students;

    for (let i = 0; i < students.length; i++) {

        gradeStudent(
            students[i],
            answerData
        );

    }

}



//------------------------------------------------
// Chấm một sinh viên
//------------------------------------------------

function gradeStudent(student, answerData) {

    //--------------------------------------------
    // Tìm đáp án theo mã đề
    //--------------------------------------------

    const exam = answerData.exams[student.examCode];

    if (!exam) {

        student.result = {

            error: "Không tìm thấy mã đề"

        };

        return;

    }

    //--------------------------------------------

    let correct = 0;

    let wrong = 0;

    const detail = [];

    //--------------------------------------------

    const totalQuestion =
        exam.totalQuestion;

    //--------------------------------------------

    for (let q = 1; q <= totalQuestion; q++) {

        const item =
            gradeQuestion(
                student,
                exam,
                q
            );

        detail.push(item);

        if (item.correct) {

            correct++;

        }
        else {

            wrong++;

        }

    }

    //--------------------------------------------

    student.result = {

    correct: correct,

    wrong: wrong,

    total: totalQuestion,

    detail: detail

};

student.result.clo =
    countCorrectByCLO(student, exam);

}



//------------------------------------------------
// Kiểm tra đã chấm chưa
//------------------------------------------------

function isGraded(student) {

    return student.result != null;

}



//------------------------------------------------
// Đếm số bài đã chấm
//------------------------------------------------

function countGradedStudents(untData) {

    let count = 0;

    untData.students.forEach(function (student) {

        if (isGraded(student)) {

            count++;

        }

    });

    return count;

}


// ============================================
// grader.js
// Version 2.1
// Part 2 / 4
// ============================================



//------------------------------------------------
// Chấm một câu
//------------------------------------------------

function gradeQuestion(student, exam, questionNumber) {

    //--------------------------------------------
    // Đáp án đúng
    //--------------------------------------------

    const key = exam.questions[questionNumber];

    //--------------------------------------------

    if (!key) {

        return {

            question: questionNumber,

            studentAnswer: "",

            correctAnswer: "",

            clo: "",

            correct: false,

            error: "Không tìm thấy đáp án"

        };

    }

    //--------------------------------------------
    // Đáp án sinh viên
    //--------------------------------------------

    let studentAnswer = "";

    if (questionNumber - 1 < student.answers.length) {

        studentAnswer =
            String(
                student.answers[questionNumber - 1]
            )
            .trim()
            .toUpperCase();

    }

    //--------------------------------------------
    // Đáp án chuẩn
    //--------------------------------------------

    const correctAnswer =
        String(key.answer)
        .trim()
        .toUpperCase();

    //--------------------------------------------
    // Chỉ chấp nhận A B C D
    //--------------------------------------------

    const validAnswers = ["A", "B", "C", "D"];

    if (!validAnswers.includes(studentAnswer)) {

        studentAnswer = "";

    }

    //--------------------------------------------
    // So sánh
    //--------------------------------------------

    const isCorrect =
        studentAnswer === correctAnswer;

    //--------------------------------------------

    return {

        question: questionNumber,

        studentAnswer: studentAnswer,

        correctAnswer: correctAnswer,

        clo: key.clo,

        correct: isCorrect

    };

}



//------------------------------------------------
// Đếm số câu đúng
//------------------------------------------------

function countCorrect(detail) {

    let count = 0;

    detail.forEach(function (item) {

        if (item.correct) {

            count++;

        }

    });

    return count;

}



//------------------------------------------------
// Đếm số câu sai
//------------------------------------------------

function countWrong(detail) {

    let count = 0;

    detail.forEach(function (item) {

        if (!item.correct) {

            count++;

        }

    });

    return count;

}

// ============================================
// grader.js
// Version 2.1
// Part 3 / 4
// ============================================



//------------------------------------------------
// Lấy danh sách câu đúng
//------------------------------------------------

function getCorrectQuestions(student) {

    if (!student.result) {

        return [];

    }

    return student.result.detail.filter(function (item) {

        return item.correct;

    });

}



//------------------------------------------------
// Lấy danh sách câu sai
//------------------------------------------------

function getWrongQuestions(student) {

    if (!student.result) {

        return [];

    }

    return student.result.detail.filter(function (item) {

        return !item.correct;

    });

}

//------------------------------------------------
// Thống kê theo CLO
//------------------------------------------------

function countCorrectByCLO(student,
                           exam){

    const result = {};

    //--------------------------------------------

    if(!student.result){

        return result;

    }

    //--------------------------------------------

    for(const clo in exam.cloCount){

        result[clo] = {

            questionCount:

                exam.cloCount[clo],

            correctCount: 0

        };

    }

    //--------------------------------------------

    student.result.detail.forEach(

        function(item){

            if(

                item.correct &&

                result[item.clo]

            ){

                result[item.clo]

                    .correctCount++;

            }

        }

    );

    //--------------------------------------------

    return result;

}

//------------------------------------------------
// In kết quả ra Console
//------------------------------------------------

function printStudentResult(student) {

    console.log("--------------------------------");

    console.log("SBD :", student.sbd);

    console.log("Mã đề :", student.examCode);

    console.log("Đúng :", student.result.correct);

    console.log("Sai :", student.result.wrong);

    console.table(student.result.detail);

}

// ============================================
// grader.js
// Version 2.1
// Part 4 / 4
// ============================================



//------------------------------------------------
// Thống kê toàn lớp
//------------------------------------------------

function gradeStatistics(untData) {

    const result = {

        totalStudents: untData.students.length,

        graded: 0,

        averageCorrect: 0,

        maxCorrect: 0,

        minCorrect: Number.MAX_SAFE_INTEGER

    };

    let sum = 0;

    untData.students.forEach(function (student) {

        if (!student.result) {

            return;

        }

        result.graded++;

        sum += student.result.correct;

        if (student.result.correct > result.maxCorrect) {

            result.maxCorrect = student.result.correct;

        }

        if (student.result.correct < result.minCorrect) {

            result.minCorrect = student.result.correct;

        }

    });

    if (result.graded > 0) {

        result.averageCorrect = sum / result.graded;

    } else {

        result.minCorrect = 0;

    }

    return result;

}



//------------------------------------------------
// Tìm bài đúng nhiều nhất
//------------------------------------------------

function findTopScore(untData) {

    let best = null;

    untData.students.forEach(function (student) {

        if (!student.result) return;

        if (best == null ||
            student.result.correct > best.result.correct) {

            best = student;

        }

    });

    return best;

}



//------------------------------------------------
// Tìm bài đúng ít nhất
//------------------------------------------------

function findBottomScore(untData) {

    let worst = null;

    untData.students.forEach(function (student) {

        if (!student.result) return;

        if (worst == null ||
            student.result.correct < worst.result.correct) {

            worst = student;

        }

    });

    return worst;

}



//------------------------------------------------
// In thống kê
//------------------------------------------------

function printStatistics(untData) {

    const stat = gradeStatistics(untData);

    console.log("===== THỐNG KÊ =====");

    console.log("Số bài :", stat.totalStudents);

    console.log("Đã chấm :", stat.graded);

    console.log("TB đúng :", stat.averageCorrect.toFixed(2));

    console.log("Cao nhất :", stat.maxCorrect);

    console.log("Thấp nhất :", stat.minCorrect);

}



//------------------------------------------------
// Chấm + thống kê nhanh
//------------------------------------------------

function gradeAndSummary(answerData, untData) {

    gradeAllStudents(answerData, untData);

    printStatistics(untData);

}