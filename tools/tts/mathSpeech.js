/* =========================================================
   APMaths - Math Speech
   mathSpeech.js

   Xử lý công thức Toán trước khi gửi tới TTS.
   ========================================================= */

"use strict";


/* =========================================================
   Public API
   ========================================================= */

function mathTextToSpeech(text) {

    if (typeof text !== "string" || !text) {
        return text || "";
    }

    let result = text;

    /* ---------------------------------------------------------
       LaTeX inline: $...$
       --------------------------------------------------------- */

    result = result.replace(
        /\$([^$]+)\$/g,
        (_, expression) => latexToSpeech(expression)
    );

    /* ---------------------------------------------------------
       LaTeX inline: \(...\)
       --------------------------------------------------------- */

    result = result.replace(
        /\\\(([\s\S]*?)\\\)/g,
        (_, expression) => latexToSpeech(expression)
    );

    /* ---------------------------------------------------------
       Plain mathematical notation
       --------------------------------------------------------- */

    result = normalizePlainMath(result);

    return cleanup(result);
}


/* =========================================================
   LaTeX → Speech
   ========================================================= */

function latexToSpeech(expression) {

    let s = String(expression || "").trim();

    if (!s) {
        return "";
    }

    /* Formatting commands */

    s = s.replace(/\\left|\\right/g, "");
    s = s.replace(/\\[,;:!]/g, " ");

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
       Fractions
       --------------------------------------------------------- */

    s = replaceCommand(
        s,
        "frac",
        (a, b) =>
            `phân số ${latexToSpeech(a)} trên ${latexToSpeech(b)}`
    );

    s = replaceCommand(
        s,
        "dfrac",
        (a, b) =>
            `phân số ${latexToSpeech(a)} trên ${latexToSpeech(b)}`
    );

    s = replaceCommand(
        s,
        "tfrac",
        (a, b) =>
            `phân số ${latexToSpeech(a)} trên ${latexToSpeech(b)}`
    );


    /* ---------------------------------------------------------
       Square root
       --------------------------------------------------------- */

    s = s.replace(
        /\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]*)\}/g,
        (_, n, value) =>
            `căn bậc ${latexToSpeech(n)} của ${latexToSpeech(value)}`
    );

    s = replaceCommand(
        s,
        "sqrt",
        value =>
            `căn bậc hai của ${latexToSpeech(value)}`
    );


    /* ---------------------------------------------------------
       Functions
       --------------------------------------------------------- */

    const functions = {
        "\\arcsin": "arc sin",
        "\\arccos": "arc cos",
        "\\arctan": "arc tan",
        "\\sin": "sin",
        "\\cos": "cos",
        "\\tan": "tan",
        "\\cot": "cot",
        "\\ln": "ln",
        "\\log": "log",
        "\\exp": "exp"
    };

    for (const [latex, spoken] of Object.entries(functions)) {
        s = s.replaceAll(latex, spoken);
    }


    /* ---------------------------------------------------------
       Calculus
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
        /\\int/g,
        " tích phân "
    );

    s = s.replace(
        /\\iint/g,
        " tích phân kép "
    );

    s = s.replace(
        /\\iiint/g,
        " tích phân ba lớp "
    );

    s = s.replace(
        /\\sum/g,
        " tổng "
    );

    s = s.replace(
        /\\prod/g,
        " tích "
    );


    /* ---------------------------------------------------------
       Limits
       --------------------------------------------------------- */

    s = s.replace(
        /\\lim_\{([^{}]*)\}/g,
        (_, value) =>
            `giới hạn khi ${latexToSpeech(value)}`
    );


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

    for (const [latex, spoken] of Object.entries(greek)) {
        s = s.replaceAll(latex, spoken);
    }


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
       Number sets
       --------------------------------------------------------- */

    s = s.replace(
        /\\mathbb\s*\{([RNZQC])\}/g,
        "$1"
    );

    /* ---------------------------------------------------------
       Superscripts
       --------------------------------------------------------- */

    s = replaceSuperscripts(s);


    /* ---------------------------------------------------------
       Subscripts
       --------------------------------------------------------- */

    s = replaceSubscripts(s);


    /* ---------------------------------------------------------
       Absolute value
       --------------------------------------------------------- */

    s = s.replace(
        /\|([^|]+)\|/g,
        "giá trị tuyệt đối của $1"
    );


    /* ---------------------------------------------------------
       Braces and parentheses
       --------------------------------------------------------- */

    s = s.replace(/[{}]/g, " ");

    s = s.replace(
        /\(/g,
        " mở ngoặc "
    );

    s = s.replace(
        /\)/g,
        " đóng ngoặc "
    );


    /* ---------------------------------------------------------
       Operators
       --------------------------------------------------------- */

    s = s.replace(
        /\\cdot|·/g,
        " nhân "
    );

    s = s.replace(
        /\+/g,
        " cộng "
    );

    s = s.replace(
        /−|–|—|-/g,
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
       Remove unknown LaTeX commands
       --------------------------------------------------------- */

    s = s.replace(
        /\\[a-zA-Z]+/g,
        " "
    );

    return cleanup(s);
}


/* =========================================================
   Replace \command{...}
   ========================================================= */

function replaceCommand(text, command, callback) {

    const pattern = new RegExp(
        "\\\\" +
        command +
        "\\s*\\{([^{}]*)\\}" +
        "(?:\\s*\\{([^{}]*)\\})?",
        "g"
    );

    return text.replace(
        pattern,
        (...args) => {

            const first = args[1] || "";
            const second = args[2];

            if (second !== undefined) {
                return callback(first, second);
            }

            return callback(first);
        }
    );
}


/* =========================================================
   Superscripts
   ========================================================= */

function replaceSuperscripts(text) {

    text = text.replace(
        /([A-Za-zÀ-ỹ0-9])\s*\^\s*\{([^{}]+)\}/g,
        (_, base, exponent) =>
            `${base} ${exponentSpeech(exponent)}`
    );

    text = text.replace(
        /([A-Za-zÀ-ỹ0-9])\s*\^\s*([A-Za-zÀ-ỹ0-9]+)/g,
        (_, base, exponent) =>
            `${base} ${exponentSpeech(exponent)}`
    );

    return text;
}


function exponentSpeech(exponent) {

    const value = String(exponent).trim();

    if (value === "2") {
        return "bình phương";
    }

    if (value === "3") {
        return "lập phương";
    }

    return `mũ ${value}`;
}


/* =========================================================
   Subscripts
   ========================================================= */

function replaceSubscripts(text) {

    text = text.replace(
        /([A-Za-zÀ-ỹ])_\{([^{}]+)\}/g,
        (_, base, subscript) =>
            `${base} chỉ số ${subscript}`
    );

    text = text.replace(
        /([A-Za-zÀ-ỹ])_([A-Za-zÀ-ỹ0-9]+)/g,
        (_, base, subscript) =>
            `${base} chỉ số ${subscript}`
    );

    return text;
}

/* =========================================================
   Plain mathematical text
   ========================================================= */

function normalizePlainMath(text) {

    let result = String(text || "");


    /* ---------------------------------------------------------
       Unicode powers
       --------------------------------------------------------- */

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


    /* ---------------------------------------------------------
       Unicode operators
       --------------------------------------------------------- */

    result = result.replace(
        /×/g,
        " nhân "
    );

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


    /* ---------------------------------------------------------
       Superscripts
       --------------------------------------------------------- */

    result = replaceSuperscripts(result);

    return result;
}


/* =========================================================
   Cleanup
   ========================================================= */

function cleanup(text) {

    return String(text || "")
        .replace(/[ \t]+/g, " ")
        .replace(/\s+([,.!?;:])/g, "$1")
        .replace(/([,.!?;:])([^\s])/g, "$1 $2")
        .replace(/\s{2,}/g, " ")
        .trim();
}


/* =========================================================
   Public namespace
   ========================================================= */

window.APMathsMathSpeech = {

    mathTextToSpeech,

    latexToSpeech,

    normalizePlainMath

};

