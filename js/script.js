/* ==========================================================
   APMaths Theme
   File: script.js
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    initSubMenu();

    // initTOC();
    // initScrollSpy();
    // initBackToTop();

});


/* ==========================================================
   Navigation
   ========================================================== */

function initSubMenu() {

    // Cache tất cả submenu
    const subMenus = document.querySelectorAll(".sub-menu");

    document.querySelectorAll(".toggle-subnav").forEach(toggle => {

        toggle.addEventListener("click", function (e) {

            e.stopPropagation();

            const menu = this.nextElementSibling;

            // Kiểm tra an toàn
            if (!menu || !menu.classList.contains("sub-menu")) {
                return;
            }

            // Đóng các submenu khác
            subMenus.forEach(sub => {

                if (sub !== menu) {

                    sub.classList.remove("show-submenu");

                }

            });

            menu.classList.toggle("show-submenu");

        });

    });

    // Chỉ đóng khi click ngoài menu
    document.addEventListener("click", (e) => {

        if (!e.target.closest(".site-nav")) {

            subMenus.forEach(sub => {

                sub.classList.remove("show-submenu");

            });

        }

    });

}