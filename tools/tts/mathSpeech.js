/* =========================================================
   APMaths - Math Speech V2
   mathSpeech.js

   Chuyển biểu thức Toán sang văn bản tự nhiên để TTS đọc.

   Quy tắc chính:
   f(x)              -> f x
   2x                -> hai x
   3ab               -> ba a b
   2*x / 2·x         -> hai nhân x
   f'(x)             -> f phẩy x
   f''(x)            -> f hai phẩy x
   x^2               -> x bình phương
   x^3               -> x lập phương
   x^n               -> x mũ n
   1/2               -> một phần hai
   frac{x+1}{x-1}    -> phân số x cộng một trên x trừ một
   int_0^1           -> tích phân từ không đến một
   lim_{x->0}        -> giới hạn khi x tiến tới không
   matrix            -> ma trận theo hàng/cột

   mathSpeech.js chỉ xử lý văn bản.
   Không gọi Gemini / Cloud TTS.
   ========================================================= */

"use strict";


/* =========================================================
   Public API
   ========================================================= */

function mathTextToSpeech(text) {

    if (
        typeof text !== "string" ||
        !text.trim()
    ) {
        return text || "";
    }

    let result = text;


    /* ---------------------------------------------------------
       1. LaTeX inline: $...$
       --------------------------------------------------------- */

    result = result.replace(
        /\$([^$]+)\$/g,
        (_, expression) => {
            return latexToSpeech(expression);
        }
    );


    /* ---------------------------------------------------------
       2. LaTeX inline: \(...\)
       --------------------------------------------------------- */

    result = result.replace(
        /\\\(([\s\S]*?)\\\)/g,
        (_, expression) => {
            return latexToSpeech(expression);
        }
    );


    /* ---------------------------------------------------------
       3. Unicode mathematical notation
       --------------------------------------------------------- */

    result = normalizeUnicodeMath(result);


    /* ---------------------------------------------------------
       4. Plain mathematical notation
       --------------------------------------------------------- */

    result = normalizePlainMath(result);


    return cleanup(result);
}


/* =========================================================
   LaTeX → Natural Vietnamese Speech
   ========================================================= */

function latexToSpeech(expression) {

    let s = String(expression || "").trim();

    if (!s) {
        return "";
    }


    /* ---------------------------------------------------------
       Matrix / vector phải xử lý trước các phép thay thế khác.
       --------------------------------------------------------- */

    s = convertLatexMatrices(s);

    s = convertLatexVectors(s);


    /* ---------------------------------------------------------
       Remove visual formatting commands.
       --------------------------------------------------------- */

    s = s.replace(
        /\\left|\\right/g,
        ""
    );

    s = s.replace(
        /\\[,;:!]/g,
        " "
    );

    s = s.replace(
        /\\quad|\\qquad/g,
        " "
    );

    s = s.replace(
        /\\text\s*\{([^{}]*)\}/g,
        "$1"
    );

    s = s.replace(
        /\\mathrm\s*\{([^{}]*)\}/g,
        "$1"
    );

    s = s.replace(
        /\\mathbf\s*\{([^{}]*)\}/g,
        "$1"
    );


    /* ---------------------------------------------------------
       Derivatives
       --------------------------------------------------------- */

    s = s.replace(
        /([A-Za-zÀ-ỹ])\s*''\s*\(([^()]*)\)/g,
        "$1 hai phẩy $2"
    );

    s = s.replace(
        /([A-Za-zÀ-ỹ])\s*'\s*\(([^()]*)\)/g,
        "$1 phẩy $2"
    );

    s = s.replace(
        /([A-Za-zÀ-ỹ])''\b/g,
        "$1 hai phẩy"
    );

    s = s.replace(
        /([A-Za-zÀ-ỹ])'\b/g,
        "$1 phẩy"
    );


    /* ---------------------------------------------------------
       Fractions: \frac{a}{b}
       --------------------------------------------------------- */

    s = replaceFracCommands(s);


    /* ---------------------------------------------------------
       Square root
       --------------------------------------------------------- */

    s = replaceBracedCommand(
        s,
        "sqrt",
        value => {
            return `căn bậc hai của ${latexToSpeech(value)}`;
        }
    );


    /* ---------------------------------------------------------
       N-th root
       --------------------------------------------------------- */

    s = s.replace(
        /\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]*)\}/g,
        (_, n, value) => {
            return (
                `căn bậc ${latexToSpeech(n)} ` +
                `của ${latexToSpeech(value)}`
            );
        }
    );


    /* ---------------------------------------------------------
       Integrals with limits

       \int_0^1
       \int_{0}^{1}
       --------------------------------------------------------- */

    s = s.replace(
        /\\int_\{([^{}]+)\}\^\{([^{}]+)\}/g,
        (_, lower, upper) => {
            return (
                `tích phân từ ` +
                `${latexToSpeech(lower)} đến ` +
                `${latexToSpeech(upper)} `
            );
        }
    );

    s = s.replace(
        /\\int_([A-Za-z0-9+\-]+)\^([A-Za-z0-9+\-]+)/g,
        (_, lower, upper) => {
            return (
                `tích phân từ ` +
                `${latexToSpeech(lower)} đến ` +
                `${latexToSpeech(upper)} `
            );
        }
    );


    /* ---------------------------------------------------------
       Sums with limits

       \sum_{i=1}^{n}
       --------------------------------------------------------- */

    s = s.replace(
        /\\sum_\{([^{}]+)\}\^\{([^{}]+)\}/g,
        (_, lower, upper) => {
            return (
                `tổng từ ${latexToSpeech(lower)} ` +
                `đến ${latexToSpeech(upper)} `
            );
        }
    );


    /* ---------------------------------------------------------
       Products with limits
       --------------------------------------------------------- */

    s = s.replace(
        /\\prod_\{([^{}]+)\}\^\{([^{}]+)\}/g,
        (_, lower, upper) => {
            return (
                `tích từ ${latexToSpeech(lower)} ` +
                `đến ${latexToSpeech(upper)} `
            );
        }
    );


    /* ---------------------------------------------------------
       Limits

       \lim_{x\to0}
       --------------------------------------------------------- */

    s = s.replace(
        /\\lim_\{([^{}]+)\}/g,
        (_, condition) => {
            return (
                `giới hạn khi ` +
                `${latexToSpeech(condition)} `
            );
        }
    );


    /* ---------------------------------------------------------
       Arrows
       --------------------------------------------------------- */

    s = s.replace(
        /\\to/g,
        " tiến tới "
    );

    s = s.replace(
        /\\rightarrow/g,
        " tiến tới "
    );

    s = s.replace(
        /\\longrightarrow/g,
        " tiến tới "
    );


    /* ---------------------------------------------------------
       Calculus symbols
       --------------------------------------------------------- */

    s = s.replace(
        /\\partial/g,
        " đạo hàm riêng "
    );

    s = s.replace(
        /\\nabla/g,
        " nabla "
    );

    s = s.replace(
        /\\infty/g,
        " vô cùng "
    );


    /* ---------------------------------------------------------
       Trigonometric functions
       --------------------------------------------------------- */

    const functions = {

        "\\arcsin": "arc sin",
        "\\arccos": "arc cos",
        "\\arctan": "arc tan",

        "\\sin": "sin",
        "\\cos": "cos",
        "\\tan": "tan",
        "\\cot": "cot",

        "\\sinh": "sinh",
        "\\cosh": "cosh",
        "\\tanh": "tanh",

        "\\ln": "ln",
        "\\log": "log",
        "\\exp": "exp"

    };


    for (
        const [latex, spoken]
        of Object.entries(functions)
    ) {
        s = s.replaceAll(
            latex,
            spoken
        );
    }


    /* ---------------------------------------------------------
       Greek letters
       --------------------------------------------------------- */

    const greek = {

        "\\alpha": "alpha",
        "\\beta": "beta",
        "\\gamma": "gamma",
        "\\delta": "delta",
        "\\epsilon": "epsilon",
        "\\varepsilon": "epsilon",
        "\\zeta": "zeta",
        "\\eta": "eta",
        "\\theta": "theta",
        "\\vartheta": "theta",

        "\\iota": "iota",
        "\\kappa": "kappa",
        "\\lambda": "lambda",
        "\\mu": "mu",
        "\\nu": "nu",
        "\\xi": "xi",
        "\\pi": "pi",

        "\\rho": "rho",
        "\\sigma": "sigma",
        "\\tau": "tau",
        "\\phi": "phi",
        "\\varphi": "phi",
        "\\chi": "chi",
        "\\psi": "psi",
        "\\omega": "omega",

        "\\Gamma": "Gamma",
        "\\Delta": "Delta",
        "\\Theta": "Theta",
        "\\Lambda": "Lambda",
        "\\Xi": "Xi",
        "\\Pi": "Pi",
        "\\Sigma": "Sigma",
        "\\Phi": "Phi",
        "\\Psi": "Psi",
        "\\Omega": "Omega"

    };


    for (
        const [latex, spoken]
        of Object.entries(greek)
    ) {
        s = s.replaceAll(
            latex,
            spoken
        );
    }

    /* ---------------------------------------------------------
       Number sets
       --------------------------------------------------------- */

    s = s.replace(
        /\\mathbb\s*\{R\}/g,
        "R"
    );

    s = s.replace(
        /\\mathbb\s*\{N\}/g,
        "N"
    );

    s = s.replace(
        /\\mathbb\s*\{Z\}/g,
        "Z"
    );

    s = s.replace(
        /\\mathbb\s*\{Q\}/g,
        "Q"
    );

    s = s.replace(
        /\\mathbb\s*\{C\}/g,
        "C"
    );


    /* ---------------------------------------------------------
       Relations
       --------------------------------------------------------- */

    s = s.replace(
        /\\leq|\\le/g,
        " nhỏ hơn hoặc bằng "
    );

    s = s.replace(
        /\\geq|\\ge/g,
        " lớn hơn hoặc bằng "
    );

    s = s.replace(
        /\\neq/g,
        " khác "
    );

    s = s.replace(
        /\\approx/g,
        " xấp xỉ "
    );

    s = s.replace(
        /\\equiv/g,
        " đồng nhất "
    );

    s = s.replace(
        /\\sim/g,
        " tương đương "
    );

    s = s.replace(
        /\\in/g,
        " thuộc "
    );

    s = s.replace(
        /\\notin/g,
        " không thuộc "
    );

    s = s.replace(
        /\\subseteq/g,
        " là tập con của "
    );

    s = s.replace(
        /\\subset/g,
        " là tập con thực sự của "
    );


    /* ---------------------------------------------------------
       Set operations
       --------------------------------------------------------- */

    s = s.replace(
        /\\cup/g,
        " hợp "
    );

    s = s.replace(
        /\\cap/g,
        " giao "
    );

    s = s.replace(
        /\\emptyset/g,
        " tập rỗng "
    );


    /* ---------------------------------------------------------
       Operators
       --------------------------------------------------------- */

    s = s.replace(
        /\\cdot|\\times/g,
        " nhân "
    );

    s = s.replace(
        /·|×/g,
        " nhân "
    );

    s = s.replace(
        /\+/g,
        " cộng "
    );

    s = s.replace(
        /−|–|—/g,
        " trừ "
    );

    s = s.replace(
        /\*/g,
        " nhân "
    );

    s = s.replace(
        /=/g,
        " bằng "
    );


    /* ---------------------------------------------------------
       Superscripts

       x^2 -> x bình phương
       x^3 -> x lập phương
       x^n -> x mũ n
       --------------------------------------------------------- */

    s = replaceSuperscripts(s);


    /* ---------------------------------------------------------
       Subscripts

       x_1 -> x chỉ số một
       a_n -> a chỉ số n
       --------------------------------------------------------- */

    s = replaceSubscripts(s);


    /* ---------------------------------------------------------
       Function notation

       f(x) -> f x
       g(t) -> g t

       Không đọc "mở ngoặc / đóng ngoặc".
       --------------------------------------------------------- */

    s = s.replace(
        /([A-Za-zÀ-ỹ])\s*\(\s*([^(),]+)\s*\)/g,
        (_, name, argument) => {
            return (
                `${name} ` +
                `${latexToSpeech(argument)}`
            );
        }
    );


    /* ---------------------------------------------------------
       Derivative notation sau khi xử lý f(x)
       --------------------------------------------------------- */

    s = s.replace(
        /([A-Za-zÀ-ỹ])\s+hai\s+phẩy\s+([A-Za-zÀ-ỹ0-9]+)/g,
        "$1 hai phẩy $2"
    );

    s = s.replace(
        /([A-Za-zÀ-ỹ])\s+phẩy\s+([A-Za-zÀ-ỹ0-9]+)/g,
        "$1 phẩy $2"
    );


    /* ---------------------------------------------------------
       Absolute value

       |x| -> giá trị tuyệt đối của x
       --------------------------------------------------------- */

    s = s.replace(
        /\|([^|]+)\|/g,
        (_, value) => {
            return (
                `giá trị tuyệt đối của ` +
                `${latexToSpeech(value)}`
            );
        }
    );


    /* ---------------------------------------------------------
       Parentheses that remain

       At this point they are mathematical grouping.
       --------------------------------------------------------- */

    s = s.replace(
        /\(/g,
        " mở ngoặc "
    );

    s = s.replace(
        /\)/g,
        " đóng ngoặc "
    );


    /* ---------------------------------------------------------
       Braces
       --------------------------------------------------------- */

    s = s.replace(
        /[{}]/g,
        " "
    );


    /* ---------------------------------------------------------
       Commas / semicolons
       --------------------------------------------------------- */

    s = s.replace(
        /,/g,
        " , "
    );


    /* ---------------------------------------------------------
       Remove unknown LaTeX commands
       --------------------------------------------------------- */

    s = s.replace(
        /\\[a-zA-Z]+/g,
        " "
    );


    /* ---------------------------------------------------------
       Convert numbers into Vietnamese pronunciation
       for common small integers.
       --------------------------------------------------------- */

    s = convertSmallNumbers(s);


    return cleanup(s);
}


/* =========================================================
   Fractions
   ========================================================= */

function replaceFracCommands(text) {

    let result = text;

    let changed = true;


    /*
     * Lặp lại để xử lý các fraction lồng nhau đơn giản.
     */

    while (changed) {

        changed = false;

        const pattern =
            /\\(?:frac|dfrac|tfrac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g;

        const next =
            result.replace(
                pattern,
                (_, numerator, denominator) => {

                    changed = true;

                    const n =
                        latexToSpeech(
                            numerator
                        );

                    const d =
                        latexToSpeech(
                            denominator
                        );


                    /*
                     * 1/2, 1/3...
                     * đọc tự nhiên "một phần hai".
                     */

                    if (
                        isSimpleNumerator(n) &&
                        isSimpleDenominator(d)
                    ) {

                        return (
                            `${n} phần ${d}`
                        );
                    }


                    return (
                        `phân số ${n} trên ${d}`
                    );
                }
            );


        result = next;
    }


    return result;
}


function isSimpleNumerator(value) {

    return /^[a-zA-ZÀ-ỹ0-9 ]+$/.test(
        String(value).trim()
    );
}


function isSimpleDenominator(value) {

    return /^[a-zA-ZÀ-ỹ0-9 ]+$/.test(
        String(value).trim()
    );
}


/* =========================================================
   Generic \command{...}
   ========================================================= */

function replaceBracedCommand(
    text,
    command,
    callback
) {

    const pattern =
        new RegExp(
            "\\\\" +
            command +
            "\\s*\\{([^{}]*)\\}",
            "g"
        );


    return text.replace(
        pattern,
        (_, value) => {
            return callback(value);
        }
    );
}


/* =========================================================
   Superscripts
   ========================================================= */

function replaceSuperscripts(text) {

    let result = text;


    /* x^{2} */

    result = result.replace(
        /([A-Za-zÀ-ỹ0-9]+)\s*\^\s*\{([^{}]+)\}/g,
        (_, base, exponent) => {

            return (
                `${base} ` +
                `${exponentSpeech(exponent)}`
            );
        }
    );


    /* x^2 */

    result = result.replace(
        /([A-Za-zÀ-ỹ0-9]+)\s*\^\s*([A-Za-zÀ-ỹ0-9]+)/g,
        (_, base, exponent) => {

            return (
                `${base} ` +
                `${exponentSpeech(exponent)}`
            );
        }
    );


    return result;
}


function exponentSpeech(exponent) {

    const value =
        String(exponent).trim();


    if (value === "2") {
        return "bình phương";
    }


    if (value === "3") {
        return "lập phương";
    }


    return (
        `mũ ${convertSmallNumberWord(value)}`
    );
}


/* =========================================================
   Subscripts
   ========================================================= */

function replaceSubscripts(text) {

    let result = text;


    result = result.replace(
        /([A-Za-zÀ-ỹ])_\{([^{}]+)\}/g,
        (_, base, subscript) => {

            return (
                `${base} chỉ số ` +
                `${convertSmallNumberWord(subscript)}`
            );
        }
    );


    result = result.replace(
        /([A-Za-zÀ-ỹ])_([A-Za-zÀ-ỹ0-9]+)/g,
        (_, base, subscript) => {

            return (
                `${base} chỉ số ` +
                `${convertSmallNumberWord(subscript)}`
            );
        }
    );


    return result;
}


/* =========================================================
   Unicode Math
   ========================================================= */

function normalizeUnicodeMath(text) {

    let result =
        String(text || "");


    /* Powers */

    result = result.replace(
        /([A-Za-zÀ-ỹ0-9])²/g,
        "$1^2"
    );

    result = result.replace(
        /([A-Za-zÀ-ỹ0-9])³/g,
        "$1^3"
    );

    result = result.replace(
        /([A-Za-zÀ-ỹ0-9])⁴/g,
        "$1^4"
    );

    result = result.replace(
        /([A-Za-zÀ-ỹ0-9])⁵/g,
        "$1^5"
    );


    /* Relations */

    result = result.replace(
        /≤/g,
        " nhỏ hơn hoặc bằng "
    );

    result = result.replace(
        /≥/g,
        " lớn hơn hoặc bằng "
    );

    result = result.replace(
        /≠/g,
        " khác "
    );

    result = result.replace(
        /≈/g,
        " xấp xỉ "
    );


    /* Multiplication */

    result = result.replace(
        /×/g,
        " nhân "
    );


    /* Minus */

    result = result.replace(
        /−/g,
        " trừ "
    );


    return result;
}

/* =========================================================
   Plain Mathematical Text
   ========================================================= */

function normalizePlainMath(text) {

    let result =
        String(text || "");


    /* ---------------------------------------------------------
       Common multiplication notation

       2*x
       2·x
       --------------------------------------------------------- */

    result = result.replace(
        /(\d+)\s*\*\s*([A-Za-zÀ-ỹ])/g,
        (_, number, variable) => {

            return (
                `${convertSmallNumberWord(number)} ` +
                `nhân ${variable}`
            );
        }
    );


    result = result.replace(
        /(\d+)\s*·\s*([A-Za-zÀ-ỹ])/g,
        (_, number, variable) => {

            return (
                `${convertSmallNumberWord(number)} ` +
                `nhân ${variable}`
            );
        }
    );


    /* ---------------------------------------------------------
       Unicode multiplication
       --------------------------------------------------------- */

    result = result.replace(
        /×/g,
        " nhân "
    );


    /* ---------------------------------------------------------
       Powers
       --------------------------------------------------------- */

    result =
        replaceSuperscripts(result);


    /* ---------------------------------------------------------
       Common relation symbols
       --------------------------------------------------------- */

    result = result.replace(
        /≤/g,
        " nhỏ hơn hoặc bằng "
    );

    result = result.replace(
        /≥/g,
        " lớn hơn hoặc bằng "
    );

    result = result.replace(
        /≠/g,
        " khác "
    );


    /* ---------------------------------------------------------
       Plain f(x), g(x), ...
       --------------------------------------------------------- */

    result = result.replace(
        /([A-Za-zÀ-ỹ])\s*\(\s*([^(),]+)\s*\)/g,
        (_, name, argument) => {

            return (
                `${name} ` +
                `${argument}`
            );
        }
    );


    /*
     * f'(x)
     */

    result = result.replace(
        /([A-Za-zÀ-ỹ])'\s*\(\s*([^()]*)\s*\)/g,
        (_, name, argument) => {

            return (
                `${name} phẩy ${argument}`
            );
        }
    );


    /*
     * f''(x)
     */

    result = result.replace(
        /([A-Za-zÀ-ỹ])''\s*\(\s*([^()]*)\s*\)/g,
        (_, name, argument) => {

            return (
                `${name} hai phẩy ${argument}`
            );
        }
    );


    return result;
}


/* =========================================================
   Vectors
   ========================================================= */

function convertLatexVectors(text) {

    let result = text;


    /* \vec{v} */

    result = result.replace(
        /\\vec\s*\{([^{}]*)\}/g,
        (_, value) => {

            return (
                `vector ${latexToSpeech(value)}`
            );
        }
    );


    /* \overrightarrow{AB} */

    result = result.replace(
        /\\overrightarrow\s*\{([^{}]*)\}/g,
        (_, value) => {

            return (
                `vector ${latexToSpeech(value)}`
            );
        }
    );


    /* \mathbf{v} */

    result = result.replace(
        /\\mathbf\s*\{([^{}]*)\}/g,
        (_, value) => {

            return (
                `vector ${latexToSpeech(value)}`
            );
        }
    );


    return result;
}


/* =========================================================
   Matrices
   ========================================================= */

function convertLatexMatrices(text) {

    let result = text;


    const environments = [
        "pmatrix",
        "bmatrix",
        "Bmatrix",
        "vmatrix",
        "Vmatrix",
        "matrix"
    ];


    for (
        const environment
        of environments
    ) {

        const pattern =
            new RegExp(
                "\\\\begin\\{" +
                environment +
                "\\}" +
                "([\\s\\S]*?)" +
                "\\\\end\\{" +
                environment +
                "\\}",
                "g"
            );


        result =
            result.replace(
                pattern,
                (_, content) => {

                    return matrixToSpeech(
                        content
                    );
                }
            );
    }


    return result;
}


function matrixToSpeech(content) {

    const rows =
        String(content)
            .split(/\\\\/);


    const cleanRows =
        rows
            .map(
                row =>
                    row
                        .split("&")
                        .map(
                            cell =>
                                latexToSpeech(
                                    cell
                                )
                        )
                        .map(
                            cell =>
                                cleanup(cell)
                        )
            )
            .filter(
                row =>
                    row.some(
                        cell =>
                            cell.length > 0
                    )
            );


    if (!cleanRows.length) {
        return "ma trận";
    }


    const rowCount =
        cleanRows.length;


    const columnCount =
        Math.max(
            ...cleanRows.map(
                row => row.length
            )
        );


    const spokenRows =
        cleanRows.map(
            (row, index) => {

                const values =
                    row.filter(
                        value =>
                            value.length > 0
                    );


                return (
                    `hàng thứ ${index + 1} ` +
                    values.join(" , ")
                );
            }
        );


    return (
        `ma trận ${rowCount} hàng ` +
        `${columnCount} cột, ` +
        spokenRows.join("; ")
    );
}


/* =========================================================
   Small Number Conversion
   ========================================================= */

function convertSmallNumbers(text) {

    const numbers = {

        "0": "không",
        "1": "một",
        "2": "hai",
        "3": "ba",
        "4": "bốn",
        "5": "năm",
        "6": "sáu",
        "7": "bảy",
        "8": "tám",
        "9": "chín",
        "10": "mười",
        "11": "mười một",
        "12": "mười hai",
        "13": "mười ba",
        "14": "mười bốn",
        "15": "mười lăm",
        "16": "mười sáu",
        "17": "mười bảy",
        "18": "mười tám",
        "19": "mười chín",
        "20": "hai mươi"

    };


    return String(text || "")
        .replace(
            /\b(20|1[0-9]|[0-9])\b/g,
            match =>
                numbers[match] || match
        );
}


function convertSmallNumberWord(value) {

    const numbers = {

        "0": "không",
        "1": "một",
        "2": "hai",
        "3": "ba",
        "4": "bốn",
        "5": "năm",
        "6": "sáu",
        "7": "bảy",
        "8": "tám",
        "9": "chín",
        "10": "mười",
        "11": "mười một",
        "12": "mười hai",
        "13": "mười ba",
        "14": "mười bốn",
        "15": "mười lăm",
        "16": "mười sáu",
        "17": "mười bảy",
        "18": "mười tám",
        "19": "mười chín",
        "20": "hai mươi"

    };


    const key =
        String(value)
            .trim();


    return (
        numbers[key] ||
        key
    );
}


/* =========================================================
   Cleanup
   ========================================================= */

function cleanup(text) {

    return String(text || "")
        .replace(
            /[ \t]+/g,
            " "
        )
        .replace(
            /\s+([,.!?;:])/g,
            "$1"
        )
        .replace(
            /([,.!?;:])([^\s])/g,
            "$1 $2"
        )
        .replace(
            /\s{2,}/g,
            " "
        )
        .trim();
}


/* =========================================================
   Public Namespace
   ========================================================= */

window.APMathsMathSpeech = {

    mathTextToSpeech,

    latexToSpeech,

    normalizePlainMath,

    normalizeUnicodeMath,

    convertLatexMatrices,

    convertLatexVectors

};
