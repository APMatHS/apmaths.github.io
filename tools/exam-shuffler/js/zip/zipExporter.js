/* ==========================================================
 * zipExporter.js
 * Exam Shuffler v1.0
 *
 * Chức năng:
 * - Đóng gói toàn bộ file DOCX và Excel thành Exam-CLO.zip.
 * - Hỗ trợ cấu trúc thư mục:
 *      /Exams
 *      /Excel
 *      /Docs (tùy chọn)
 * - Sử dụng JSZip.
 * - Tải file ZIP về bằng FileSaver.js.
 *
 * Tác giả: Nam Hoang + ChatGPT
 * ========================================================== */


/**
 * Tạo và tải file ZIP.
 *
 * @param {Object} options
 * @param {Array} options.exams
 * @param {Array} options.excels
 * @param {Array} [options.docs]
 * @param {String} [options.zipName]
 */
export async function exportZip(options = {}) {

    try {

        const {
            exams = [],
            excels = [],
            docs = [],
            zipName = "Exam-CLO.zip"
        } = options;

        validateInput(exams, excels, docs);

        const zip = new JSZip();

        const examsFolder = zip.folder("Exams");
        const excelsFolder = zip.folder("Excel");
        const docsFolder = zip.folder("Docs");

        addFilesToFolder(examsFolder, exams);
        addFilesToFolder(excelsFolder, excels);
        addFilesToFolder(docsFolder, docs);

        await finalizeZip(zip, zipName);

    } catch (error) {

        console.error("[ZIP]", error);
        alert("Không thể tạo file ZIP.");

    }

}

/**
 * Kiểm tra dữ liệu đầu vào.
 *
 * @param {Array} exams
 * @param {Array} excels
 * @param {Array} docs
 */
function validateInput(exams, excels, docs) {

    if (!Array.isArray(exams)) {
        throw new Error("exams phải là Array.");
    }

    if (!Array.isArray(excels)) {
        throw new Error("excels phải là Array.");
    }

    if (!Array.isArray(docs)) {
        throw new Error("docs phải là Array.");
    }

}

/* ==========================================================
 * Thêm file vào thư mục trong ZIP
 * ========================================================== */

/**
 * Thêm danh sách file vào một thư mục ZIP.
 *
 * Mỗi phần tử trong mảng có dạng:
 * {
 *     name : "Exam_201.docx",
 *     blob : Blob
 * }
 *
 * @param {JSZip} folder
 * @param {Array} files
 */
function addFilesToFolder(folder, files) {

    if (!folder || !files.length) {
        return;
    }

    for (const file of files) {

        validateFile(file);

        folder.file(file.name, file.blob);

        console.log(`[ZIP] Added: ${file.name}`);

    }

}

/**
 * Kiểm tra một file trước khi thêm vào ZIP.
 *
 * @param {Object} file
 */
function validateFile(file) {

    if (!file || typeof file !== "object") {
        throw new Error("Định dạng file không hợp lệ.");
    }

    if (!file.name) {
        throw new Error("Thiếu tên file.");
    }

    if (!(file.blob instanceof Blob)) {
        throw new Error(`"${file.name}" không phải Blob.`);
    }

}

/* ==========================================================
 * Hàm tiện ích
 * ========================================================== */

/**
 * Đếm tổng số file.
 *
 * @param {Array} exams
 * @param {Array} excels
 * @param {Array} docs
 * @returns {number}
 */
function getTotalFileCount(exams, excels, docs) {

    return exams.length + excels.length + docs.length;

}

/**
 * Ghi thông tin thống kê.
 *
 * @param {Array} exams
 * @param {Array} excels
 * @param {Array} docs
 */
function logSummary(exams, excels, docs) {

    const total = getTotalFileCount(
        exams,
        excels,
        docs
    );

    console.log("=================================");
    console.log("[ZIP] Export Summary");
    console.log("---------------------------------");
    console.log(`Exam files : ${exams.length}`);
    console.log(`Excel files: ${excels.length}`);
    console.log(`Docs files : ${docs.length}`);
    console.log(`Total files: ${total}`);
    console.log("=================================");

}

/* ==========================================================
 * Hoàn tất và tải file ZIP
 * ========================================================== */

/**
 * Sinh file ZIP và tải xuống.
 *
 * @param {JSZip} zip
 * @param {String} zipName
 */
async function finalizeZip(zip, zipName) {

    console.log("[ZIP] Creating archive...");

    const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
            level: 9
        }
    });

    downloadZip(blob, zipName);

    console.log("[ZIP] Export completed.");

}

/**
 * Tải file ZIP.
 *
 * Ưu tiên sử dụng FileSaver.js nếu có.
 * Nếu không có thì dùng URL.createObjectURL().
 *
 * @param {Blob} blob
 * @param {String} fileName
 */
function downloadZip(blob, fileName) {

    // FileSaver.js
    if (typeof saveAs === "function") {

        saveAs(blob, fileName);
        return;

    }

    // Fallback
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

}

/* ==========================================================
 * Tiện ích
 * ========================================================== */

/**
 * Tạo tên ZIP mặc định.
 *
 * Ví dụ:
 * Exam-CLO_20260720_203015.zip
 *
 * @returns {String}
 */
export function createDefaultZipName() {

    const now = new Date();

    const pad = (n) => String(n).padStart(2, "0");

    const stamp =
        now.getFullYear() +
        pad(now.getMonth() + 1) +
        pad(now.getDate()) +
        "_" +
        pad(now.getHours()) +
        pad(now.getMinutes()) +
        pad(now.getSeconds());

    return `Exam-CLO_${stamp}.zip`;

}

/**
 * Kiểm tra ZIP có rỗng hay không.
 *
 * @param {Array} exams
 * @param {Array} excels
 * @param {Array} docs
 * @returns {Boolean}
 */
export function hasExportFiles(
    exams = [],
    excels = [],
    docs = []
) {

    return (
        exams.length > 0 ||
        excels.length > 0 ||
        docs.length > 0
    );

}

/* ==========================================================
 * zipExporter.js
 * Phần 4
 * Các hàm tiện ích mở rộng
 * ========================================================== */

/**
 * Thêm một file văn bản vào ZIP.
 *
 * @param {JSZip} folder
 * @param {String} fileName
 * @param {String} content
 */
export function addTextFile(folder, fileName, content = "") {

    if (!folder) {
        throw new Error("Folder không hợp lệ.");
    }

    folder.file(fileName, content);

}

/**
 * Tạo README mặc định.
 *
 * @returns {String}
 */
export function createReadme() {

    return `Exam Shuffler

Package : Exam-CLO.zip

Nội dung:
- Exams/
    Các đề thi đã được trộn.

- Excel/
    Đáp án và thống kê CLO.

Được tạo bởi Exam Shuffler.
`;

}

/**
 * Ghi README vào thư mục Docs.
 *
 * @param {JSZip} docsFolder
 */
export function addReadme(docsFolder) {

    addTextFile(
        docsFolder,
        "README.txt",
        createReadme()
    );

}

/**
 * Ghi file Version.
 *
 * @param {JSZip} docsFolder
 * @param {String} version
 */
export function addVersionFile(
    docsFolder,
    version = "1.0.0"
) {

    const info = {
        app: "Exam Shuffler",
        package: "Exam-CLO.zip",
        version,
        created: new Date().toISOString()
    };

    docsFolder.file(
        "version.json",
        JSON.stringify(info, null, 4)
    );

}

/**
 * In thông tin ZIP ra Console.
 *
 * @param {String} zipName
 * @param {Number} totalFiles
 */
export function printExportInfo(
    zipName,
    totalFiles
) {

    console.log("==================================");
    console.log(" Exam Shuffler");
    console.log("----------------------------------");
    console.log(" ZIP :", zipName);
    console.log(" Files:", totalFiles);
    console.log("==================================");

}