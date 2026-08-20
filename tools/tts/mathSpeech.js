/* =========================================================
   APMaths - Math Speech V2
   Chuyển biểu thức Toán sang văn bản tự nhiên để TTS đọc.
   Chỉ xử lý văn bản, không gọi Gemini / Cloud TTS.
   ========================================================= */

"use strict";

/* =========================================================
   Main Entry Point
   ========================================================= */

function mathTextToSpeech(text) {
    if (typeof text !== "string" || !text.trim()) return text || "";

    let result = String(text);

    result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, x) => latexToSpeech(x));
    result = result.replace(/\$([^$]+)\$/g, (_, x) => latexToSpeech(x));
    result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, x) => latexToSpeech(x));
    result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, x) => latexToSpeech(x));

    result = normalizeUnicodeMath(result);
    result = normalizePlainMath(result);

    return cleanup(result);
}

/* =========================================================
   LaTeX → Vietnamese Speech
   ========================================================= */

function latexToSpeech(expression) {
    let s = String(expression || "").trim();
    if (!s) return "";

    /* Matrix / Vector */
    s = convertLatexMatrices(s);
    s = convertLatexVectors(s);

    /* Visual formatting */
    s = s.replace(/\\left|\\right/g, "");
    s = s.replace(/\\[,;:!]/g, " ");
    s = s.replace(/\\quad|\\qquad/g, " ");
    s = s.replace(/\\text\s*\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\mathrm\s*\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\mathbf\s*\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\boldsymbol\s*\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\mathit\s*\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\mathsf\s*\{([^{}]*)\}/g, "$1");

    /* Word Equation: \_ → _ */
    s = s.replace(/\\_/g, "_");

    /* =====================================================
       Linear Algebra Operators
       ===================================================== */

    s = s.replace(
        /\\det\s*\(\s*([^()]*)\s*\)/g,
        (_, x) => `định thức của ${latexToSpeech(x)}`
    );

    s = s.replace(
        /\\operatorname\s*\{rank\}\s*\(\s*([^()]*)\s*\)/gi,
        (_, x) => `hạng của ${latexToSpeech(x)}`
    );

    s = s.replace(
        /\\ker\s*\(\s*([^()]*)\s*\)/g,
        (_, x) => `hạt nhân của ${latexToSpeech(x)}`
    );

    s = s.replace(
        /\\dim\s*\(\s*([^()]*)\s*\)/g,
        (_, x) => `số chiều của ${latexToSpeech(x)}`
    );

    s = s.replace(
        /\\operatorname\s*\{tr\}\s*\(\s*([^()]*)\s*\)/gi,
        (_, x) => `vết của ${latexToSpeech(x)}`
    );

    s = s.replace(
        /\\operatorname\s*\{Im\}\s*\(\s*([^()]*)\s*\)/g,
        (_, x) => `ảnh của ${latexToSpeech(x)}`
    );

    s = s.replace(
        /\\operatorname\s*\{diag\}\s*\(\s*([^()]*)\s*\)/gi,
        (_, x) => `ma trận đường chéo ${latexToSpeech(x)}`
    );

    s = s.replace(/\\operatorname\s*\{([^{}]+)\}/g, "$1");

    /* =====================================================
       Derivatives
       ===================================================== */

    s = s.replace(
        /([A-Za-zÀ-ỹ])\s*''\s*\(([^()]*)\)/g,
        "$1 hai phẩy $2"
    );

    s = s.replace(
        /([A-Za-zÀ-ỹ])\s*'\s*\(([^()]*)\)/g,
        "$1 phẩy $2"
    );

    s = s.replace(/([A-Za-zÀ-ỹ])''\b/g, "$1 hai phẩy");
    s = s.replace(/([A-Za-zÀ-ỹ])'\b/g, "$1 phẩy");

    /* =====================================================
       Fractions
       ===================================================== */

    s = replaceFracCommands(s);

    /* =====================================================
       Roots
       ===================================================== */

    s = s.replace(
        /\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]*)\}/g,
        (_, n, x) =>
            `căn bậc ${latexToSpeech(n)} của ${latexToSpeech(x)}`
    );

    s = replaceBracedCommand(
        s,
        "sqrt",
        x => `căn bậc hai của ${latexToSpeech(x)}`
    );

    /* =====================================================
       Integrals
       ===================================================== */

    s = s.replace(
        /\\int(?:\\limits)?\s*_\s*\{([^{}]*)\}\s*\^\s*\{([^{}]*)\}/g,
        (_, a, b) =>
            ` tích phân từ ${latexToSpeech(a)} đến ${latexToSpeech(b)} `
    );

    s = s.replace(
        /\\int(?:\\limits)?\s*_\s*([A-Za-z0-9+\-]+)\s*\^\s*([A-Za-z0-9+\-]+)/g,
        (_, a, b) =>
            ` tích phân từ ${latexToSpeech(a)} đến ${latexToSpeech(b)} `
    );

    s = s.replace(/\\int/g, " tích phân ");

    /* =====================================================
       Sum / Product / Limit
       ===================================================== */

    s = s.replace(
        /\\sum_\{([^{}]+)\}\^\{([^{}]+)\}/g,
        (_, a, b) =>
            `tổng từ ${latexToSpeech(a)} đến ${latexToSpeech(b)} `
    );

    s = s.replace(
        /\\prod_\{([^{}]+)\}\^\{([^{}]+)\}/g,
        (_, a, b) =>
            `tích từ ${latexToSpeech(a)} đến ${latexToSpeech(b)} `
    );

    s = s.replace(
        /\\lim_\{([^{}]+)\}/g,
        (_, x) => `giới hạn khi ${latexToSpeech(x)} `
    );

    /* =====================================================
       Arrows / Logic
       ===================================================== */

    s = s.replace(/\\Leftrightarrow/g, " khi và chỉ khi ");
    s = s.replace(/\\Rightarrow/g, " suy ra ");
    s = s.replace(/\\Leftarrow/g, " được suy ra từ ");
    s = s.replace(/\\leftrightarrow/g, " hai chiều ");
    s = s.replace(/\\longrightarrow/g, " tiến tới ");
    s = s.replace(/\\rightarrow/g, " tiến tới ");
    s = s.replace(/\\to/g, " tiến tới ");

    s = s.replace(/\\forall/g, " với mọi ");
    s = s.replace(/\\exists/g, " tồn tại ");
    s = s.replace(/\\setminus/g, " trừ ");

    /* =====================================================
       Calculus Symbols
       ===================================================== */

    s = s.replace(/\\partial/g, " đạo hàm riêng ");
    s = s.replace(/\\nabla/g, " nabla ");
    s = s.replace(/\\infty/g, " vô cùng ");

    /* =====================================================
       Functions
       ===================================================== */

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

    for (const [latex, spoken] of Object.entries(functions)) {
        s = s.replaceAll(latex, spoken);
    }

    /* =====================================================
       Greek Letters
       ===================================================== */

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

    /* =====================================================
       Standard Number Sets
       ===================================================== */

    s = s.replace(/\\mathbb\s*\{N\}/g, " tập số tự nhiên ");
    s = s.replace(/\\mathbb\s*\{Z\}/g, " tập số nguyên ");
    s = s.replace(/\\mathbb\s*\{Q\}/g, " tập số hữu tỉ ");
    s = s.replace(/\\mathbb\s*\{R\}/g, " tập số thực ");
    s = s.replace(/\\mathbb\s*\{C\}/g, " tập số phức ");

    /* =====================================================
       Relations
       ===================================================== */

    s = s.replace(/\\leq|\\le/g, " nhỏ hơn hoặc bằng ");
    s = s.replace(/\\geq|\\ge/g, " lớn hơn hoặc bằng ");
    s = s.replace(/\\neq/g, " khác ");
    s = s.replace(/\\approx/g, " xấp xỉ ");
    s = s.replace(/\\equiv/g, " đồng nhất ");
    s = s.replace(/\\sim/g, " tương đương ");
    s = s.replace(/\\notin/g, " không thuộc ");
    s = s.replace(/\\in/g, " thuộc ");
    s = s.replace(/\\subseteq/g, " là tập con của ");
    s = s.replace(/\\subset/g, " là tập con thực sự của ");

    /* =====================================================
       Set Operations
       ===================================================== */

    s = s.replace(/\\cup/g, " hợp ");
    s = s.replace(/\\cap/g, " giao ");
    s = s.replace(/\\emptyset/g, " tập rỗng ");

    /* =====================================================
       Matrix / Tensor Operations
       ===================================================== */

    s = s.replace(/\\oplus/g, " tổng trực tiếp ");
    s = s.replace(/\\otimes/g, " tích tensor ");

    /* =====================================================
       Norm / Inner Product
       ===================================================== */

    s = s.replace(
        /\\lVert\s*([^\\]+?)\s*\\rVert/g,
        (_, x) => `chuẩn của ${latexToSpeech(x)}`
    );

    s = s.replace(
        /\\langle\s*([^,]+)\s*,\s*([^\\]+?)\s*\\rangle/g,
        (_, x, y) =>
            `tích vô hướng của ${latexToSpeech(x)} và ${latexToSpeech(y)}`
    );

    /* =====================================================
       Operators
       ===================================================== */

    s = s.replace(/\\pm/g, " cộng hoặc trừ ");
    s = s.replace(/\\div/g, " chia ");
    s = s.replace(/\\cdot|\\times/g, " nhân ");
    s = s.replace(/·|×/g, " nhân ");
    s = s.replace(/\+/g, " cộng ");
    s = s.replace(/−|–|—/g, " trừ ");
    s = s.replace(/\*/g, " nhân ");
    s = s.replace(/=/g, " bằng ");

    /* =====================================================
       Superscripts / Subscripts
       ===================================================== */

    s = replaceSuperscripts(s);
    s = replaceSubscripts(s);

    /* =====================================================
       Function notation: f(x) → f x
       ===================================================== */

    s = s.replace(
        /([A-Za-zÀ-ỹ])\s*\(\s*([^(),]+)\s*\)/g,
        (_, name, arg) => `${name} ${latexToSpeech(arg)}`
    );

    /* =====================================================
       Absolute Value
       ===================================================== */

    s = s.replace(
        /\|([^|]+)\|/g,
        (_, x) => `giá trị tuyệt đối của ${latexToSpeech(x)}`
    );

    /* =====================================================
       Remaining Grouping
       ===================================================== */

    s = s.replace(/\(/g, " mở ngoặc ");
    s = s.replace(/\)/g, " đóng ngoặc ");
    s = s.replace(/[{}]/g, " ");
    s = s.replace(/,/g, " , ");

    /* Unknown LaTeX commands: xử lý cuối cùng */
    s = s.replace(/\\[a-zA-Z]+/g, " ");

    s = convertSmallNumbers(s);

    return cleanup(s);
}

/* =========================================================
   Fractions
   ========================================================= */

function replaceFracCommands(text) {
    let result = text;
    let changed = true;

    while (changed) {
        changed = false;

        const pattern =
            /\\(?:frac|dfrac|tfrac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g;

        result = result.replace(
            pattern,
            (_, numerator, denominator) => {
                changed = true;

                const n = latexToSpeech(numerator);
                const d = latexToSpeech(denominator);

                if (isSimpleNumerator(n) && isSimpleDenominator(d)) {
                    return `${n} phần ${d}`;
                }

                return `phân số ${n} trên ${d}`;
            }
        );
    }

    return result;
}

function isSimpleNumerator(value) {
    return /^[a-zA-ZÀ-ỹ0-9 ]+$/.test(String(value).trim());
}

function isSimpleDenominator(value) {
    return /^[a-zA-ZÀ-ỹ0-9 ]+$/.test(String(value).trim());
}

/* =========================================================
   Generic \command{...}
   ========================================================= */

function replaceBracedCommand(text, command, callback) {
    const pattern =
        new RegExp("\\\\" + command + "\\s*\\{([^{}]*)\\}", "g");

    return text.replace(pattern, (_, value) => callback(value));
}

/* =========================================================
   Superscripts
   ========================================================= */

function replaceSuperscripts(text) {
    let result = text;

    result = result.replace(
        /([A-Za-zÀ-ỹ0-9]+)\s*\^\s*\{([^{}]+)\}/g,
        (_, base, exponent) =>
            `${base} ${exponentSpeech(exponent)}`
    );

    result = result.replace(
        /([A-Za-zÀ-ỹ0-9]+)\s*\^\s*([A-Za-zÀ-ỹ0-9]+)/g,
        (_, base, exponent) =>
            `${base} ${exponentSpeech(exponent)}`
    );

    return result;
}

function exponentSpeech(exponent) {
    const value = String(exponent).trim();

    if (value === "2") return "bình phương";
    if (value === "3") return "lập phương";
    if (value === "-1") return "nghịch đảo";

    return `mũ ${convertSmallNumberWord(value)}`;
}

/* =========================================================
   Subscripts
   ========================================================= */

function replaceSubscripts(text) {
    let result = text;

    result = result.replace(
        /([A-Za-zÀ-ỹ])_\{([^{}]+)\}/g,
        (_, base, subscript) =>
            `${base} chỉ số ${convertSmallNumberWord(subscript)}`
    );

    result = result.replace(
        /([A-Za-zÀ-ỹ])_([A-Za-zÀ-ỹ0-9]+)/g,
        (_, base, subscript) =>
            `${base} chỉ số ${convertSmallNumberWord(subscript)}`
    );

    return result;
}

/* =========================================================
   Unicode Math
   ========================================================= */

function normalizeUnicodeMath(text) {
    let result = String(text || "");

    result = result.replace(/([A-Za-zÀ-ỹ0-9])²/g, "$1^2");
    result = result.replace(/([A-Za-zÀ-ỹ0-9])³/g, "$1^3");
    result = result.replace(/([A-Za-zÀ-ỹ0-9])⁴/g, "$1^4");
    result = result.replace(/([A-Za-zÀ-ỹ0-9])⁵/g, "$1^5");

    result = result.replace(/≤/g, " nhỏ hơn hoặc bằng ");
    result = result.replace(/≥/g, " lớn hơn hoặc bằng ");
    result = result.replace(/≠/g, " khác ");
    result = result.replace(/≈/g, " xấp xỉ ");
    result = result.replace(/×/g, " nhân ");
    result = result.replace(/−/g, " trừ ");

    return result;
}

/* =========================================================
   Plain Mathematical Text
   ========================================================= */

function normalizePlainMath(text) {
    let result = String(text || "");

    result = result.replace(
        /(\d+)\s*\*\s*([A-Za-zÀ-ỹ])/g,
        (_, n, x) =>
            `${convertSmallNumberWord(n)} nhân ${x}`
    );

    result = result.replace(
        /(\d+)\s*·\s*([A-Za-zÀ-ỹ])/g,
        (_, n, x) =>
            `${convertSmallNumberWord(n)} nhân ${x}`
    );

    result = result.replace(/×/g, " nhân ");
    result = replaceSuperscripts(result);

    result = result.replace(/≤/g, " nhỏ hơn hoặc bằng ");
    result = result.replace(/≥/g, " lớn hơn hoặc bằng ");
    result = result.replace(/≠/g, " khác ");

    result = result.replace(
        /([A-Za-zÀ-ỹ])''\s*\(\s*([^()]*)\s*\)/g,
        (_, name, arg) => `${name} hai phẩy ${arg}`
    );

    result = result.replace(
        /([A-Za-zÀ-ỹ])'\s*\(\s*([^()]*)\s*\)/g,
        (_, name, arg) => `${name} phẩy ${arg}`
    );

    result = result.replace(
        /([A-Za-zÀ-ỹ])\s*\(\s*([^(),]+)\s*\)/g,
        (_, name, arg) => `${name} ${arg}`
    );

    return result;
}

/* =========================================================
   Vectors
   ========================================================= */

function convertLatexVectors(text) {
    let result = text;

    result = result.replace(
        /\\vec\s*\{([^{}]*)\}/g,
        (_, x) => `vector ${latexToSpeech(x)}`
    );

    result = result.replace(
        /\\overrightarrow\s*\{([^{}]*)\}/g,
        (_, x) => `vector ${latexToSpeech(x)}`
    );

    result = result.replace(
        /\\mathbf\s*\{([^{}]*)\}/g,
        (_, x) => `vector ${latexToSpeech(x)}`
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

    for (const environment of environments) {
        const pattern = new RegExp(
            "\\\\begin\\{" +
            environment +
            "\\}" +
            "([\\s\\S]*?)" +
            "\\\\end\\{" +
            environment +
            "\\}",
            "g"
        );

        result = result.replace(
            pattern,
            (_, content) =>
                matrixToSpeech(content, environment)
        );
    }

    return result;
}

function matrixToSpeech(content, environment = "matrix") {
    const rows = String(content).split(/\\\\/);

    const cleanRows = rows
        .map(row =>
            row
                .split("&")
                .map(cell => latexToSpeech(cell))
                .map(cell => cleanup(cell))
        )
        .filter(row =>
            row.some(cell => cell.length > 0)
        );

    if (!cleanRows.length) {
        return environment === "vmatrix"
            ? "định thức"
            : "ma trận";
    }

    const rowCount = cleanRows.length;

    const columnCount = Math.max(
        ...cleanRows.map(row => row.length)
    );

    const spokenRows = cleanRows.map(
        (row, index) => {
            const values =
                row.filter(value => value.length > 0);

            return (
                `hàng thứ ${index + 1} ` +
                values.join(" , ")
            );
        }
    );

    const prefix =
        environment === "vmatrix"
            ? "định thức của ma trận"
            : "ma trận";

    return (
        `${prefix} ${rowCount} hàng ` +
        `${columnCount} cột, ` +
        spokenRows.join("; ")
    );
}

/* =========================================================
   Small Numbers
   ========================================================= */

const SMALL_NUMBERS = {
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

function convertSmallNumbers(text) {
    return String(text || "").replace(
        /\b(20|1[0-9]|[0-9])\b/g,
        x => SMALL_NUMBERS[x] || x
    );
}

function convertSmallNumberWord(value) {
    const key = String(value).trim();
    return SMALL_NUMBERS[key] || key;
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
   Public Namespace
   ========================================================= */

window.APMathsMathSpeech = {
    mathTextToSpeech,
    latexToSpeech,
    normalizePlainMath,
    normalizeUnicodeMath,
    convertLatexMatrices,
    convertLatexVectors,
    replaceSuperscripts,
    replaceSubscripts,
    convertSmallNumbers,
    convertSmallNumberWord,
    cleanup
};
