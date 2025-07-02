    document.querySelectorAll('.toggle-subnav').forEach(toggle => {
      toggle.addEventListener('click', function (e) {
        e.stopPropagation(); // Ngăn click lan ra ngoài
        const menu = this.nextElementSibling;
        menu.classList.toggle('show-submenu');

        // Đóng các submenu khác
        document.querySelectorAll('.sub-menu').forEach(sub => {
          if (sub !== menu) sub.classList.remove('show-submenu');
        });
      });
    });

    // Đóng submenu khi click bên ngoài
    document.addEventListener('click', function () {
      document.querySelectorAll('.sub-menu').forEach(sub => {
        sub.classList.remove('show-submenu');
      });
    });

