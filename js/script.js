/* ==========================================================
   APMaths Theme V3.3
   File: script.js
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
});

function initNavigation() {
    const MOBILE_BREAKPOINT = 780;
    const nav = document.getElementById("site-navigation");
    const mobileToggle = document.querySelector(".mobile-nav-toggle");

    if (!nav || !mobileToggle) {
        return;
    }

    const submenuToggles = nav.querySelectorAll(".submenu-toggle");

    function setMobileNav(open) {
        nav.classList.toggle("is-open", open);
        mobileToggle.setAttribute("aria-expanded", String(open));

        if (!open) {
            closeAllSubmenus();
        }
    }

    function closeAllSubmenus(exceptItem = null) {
        nav.querySelectorAll(".has-submenu.is-open").forEach(item => {
            if (item === exceptItem) {
                return;
            }

            item.classList.remove("is-open");
            const button = item.querySelector(":scope > .nav-item-row > .submenu-toggle");
            if (button) {
                button.setAttribute("aria-expanded", "false");
            }
        });
    }

    mobileToggle.addEventListener("click", event => {
        event.stopPropagation();
        setMobileNav(!nav.classList.contains("is-open"));
    });

    submenuToggles.forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            const item = button.closest(".has-submenu");
            if (!item) {
                return;
            }

            const willOpen = !item.classList.contains("is-open");
            closeAllSubmenus(item);
            item.classList.toggle("is-open", willOpen);
            button.setAttribute("aria-expanded", String(willOpen));
        });
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".site-nav") && !event.target.closest(".mobile-nav-toggle")) {
            closeAllSubmenus();

            if (window.innerWidth <= MOBILE_BREAKPOINT) {
                setMobileNav(false);
            }
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") {
            return;
        }

        closeAllSubmenus();

        if (window.innerWidth <= MOBILE_BREAKPOINT) {
            setMobileNav(false);
            mobileToggle.focus();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > MOBILE_BREAKPOINT) {
            nav.classList.remove("is-open");
            mobileToggle.setAttribute("aria-expanded", "false");
            closeAllSubmenus();
        }
    });
}
