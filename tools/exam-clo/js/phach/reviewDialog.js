// js/phach/reviewDialog.js

export function reviewSbd({ student, imageBlob, candidate = "", confidence = 0, reason = "" }) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "ocr-modal";

        const imageUrl = imageBlob ? URL.createObjectURL(imageBlob) : "";
        overlay.innerHTML = `
            <div class="ocr-modal__card" role="dialog" aria-modal="true" aria-labelledby="ocrTitle">
                <div class="ocr-modal__head">
                    <div>
                        <span class="section-kicker">KIỂM TRA SỐ PHÁCH</span>
                        <h2 id="ocrTitle">Dòng Excel ${student.excelRow}</h2>
                    </div>
                    <span class="ocr-confidence ocr-confidence--low">${Math.round(confidence)}%</span>
                </div>
                ${reason ? `<p class="ocr-reason">${reason}</p>` : ""}
                ${imageUrl ? `<div class="ocr-image-box"><img src="${imageUrl}" alt="Ảnh số phách dòng ${student.excelRow}"></div>` : `<div class="ocr-image-missing">Không tìm thấy ảnh ở cột B cùng hàng.</div>`}
                <label class="ocr-field">
                    <span>Số phách / SBD</span>
                    <input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${String(candidate).replace(/"/g, "&quot;")}">
                </label>
                <div class="ocr-modal__actions">
                    <button type="button" class="ocr-confirm">Xác nhận và tiếp tục</button>
                </div>
                <p class="ocr-hint">Chỉ nhập chữ số. Hệ thống sẽ tiếp tục đọc dòng kế tiếp sau khi xác nhận.</p>
            </div>`;

        document.body.appendChild(overlay);
        const input = overlay.querySelector("input");
        const button = overlay.querySelector(".ocr-confirm");
        input.focus();
        input.select();

        const finish = () => {
            const value = input.value.trim();
            if (!/^\d+$/.test(value)) {
                input.setCustomValidity("SBD chỉ được chứa chữ số.");
                input.reportValidity();
                return;
            }
            input.setCustomValidity("");
            if (imageUrl) URL.revokeObjectURL(imageUrl);
            overlay.remove();
            resolve(value);
        };

        button.addEventListener("click", finish);
        input.addEventListener("keydown", event => {
            if (event.key === "Enter") finish();
        });
    });
}
