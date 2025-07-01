const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
  const link = item.querySelector('.nav-link');
  const arrow = item.querySelector('.arrow-btn');
  const svg = arrow.querySelector('.arrow-icon');

  // Hover vào chữ
  link.addEventListener('mouseenter', () => {
    link.style.backgroundColor = 'var(--color1)';
    arrow.style.backgroundColor = 'var(--color2)';
  });

  link.addEventListener('mouseleave', () => {
    if (!item.classList.contains('active')) {
      link.style.backgroundColor = '#333';
      arrow.style.backgroundColor = '#333';
    }
  });

  // Hover vào mũi tên
  arrow.addEventListener('mouseenter', () => {
    link.style.backgroundColor = 'var(--color2)';
    arrow.style.backgroundColor = 'var(--color1)';
  });

  arrow.addEventListener('mouseleave', () => {
    if (!item.classList.contains('active')) {
      link.style.backgroundColor = '#333';
      arrow.style.backgroundColor = '#333';
    }
  });

  // Click mũi tên mở subnav + xoay
  arrow.addEventListener('click', (e) => {
    e.preventDefault();
    item.classList.toggle('active');
    svg.classList.toggle('rotated');

    if (item.classList.contains('active')) {
      link.style.backgroundColor = 'var(--color1)';
      arrow.style.backgroundColor = 'var(--color2)';
    } else {
      link.style.backgroundColor = '#333';
      arrow.style.backgroundColor = '#333';
    }
  });
});

function toggleMenu() {
  const nav = document.getElementById("navItems");
  const btn = document.querySelector(".menu-toggle");
  nav.classList.toggle("active");
  btn.textContent = nav.classList.contains("active") ? "✖" : "☰";
}
