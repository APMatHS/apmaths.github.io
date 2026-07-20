/* =====================================================
   excelExporter.js
   Exam Shuffler v1.0 - High-Level Excel Export Facade

   Chức năng:
   - Đóng vai trò Facade API cho toàn bộ nhánh Excel.
   - Kết nối buildAnswerWorkbook và downloadWorkbook thành 1 hàm duy nhất.
   - Cho phép tái sử dụng ở bất kỳ đâu (Pipeline chính hoặc UI Button độc lập).
===================================================== */

import { buildAnswerWorkbook } from "./excelWriter.js";
import { downloadWorkbook } from "./downloadExcel.js";

/**
 * Tạo và tải file Excel bảng đáp án tổng hợp từ mảng exams
 * 
 * @param {Array<Object>} exams - Danh sách bộ đề thi
 * @param {string} fileName - Tên file Excel xuất ra (mặc định: "Dap_An_Tong_Hop.xlsx")
 */
export async function exportAnswerExcel(
    exams,
    fileName = "Dap_An_Tong_Hop.xlsx",
    download = true
) {
    const workbook = await buildAnswerWorkbook(exams);

    if (download) {
        await downloadWorkbook(workbook, fileName);
        return null;
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Blob(
        [buffer],
        {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
    );
}