/* ===== Horizonte Exclusivo — Scripts Globales ===== */

// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    const wasScrolled = navbar.classList.contains('scrolled');
    const isScrolled = window.scrollY > 60;
    navbar.classList.toggle('scrolled', isScrolled);
    if (wasScrolled !== isScrolled) checkNavOverflow();
});

// Mobile menu toggle
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    navbar.classList.toggle('menu-open');
});

// Close menu on link click
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navbar.classList.remove('menu-open');
    });
});

// Auto-collapse navbar when items don't fit
function checkNavOverflow() {
    const navbar = document.getElementById('navbar');
    const navLinks = document.getElementById('navLinks');
    const container = navbar.querySelector('.container');

    navLinks.classList.remove('active');
    navbar.classList.remove('collapsed');
    navbar.classList.remove('menu-open');
    navLinks.style.flexShrink = '0';
    void navbar.offsetHeight;

    var bp = 1280;
    if (window.innerWidth <= bp || container.scrollWidth > container.clientWidth + 2) {
        navbar.classList.add('collapsed');
    }

    navLinks.style.flexShrink = '';
}

checkNavOverflow();
window.addEventListener('resize', checkNavOverflow);

// Touch-friendly dropdown (primer tap abre, segundo tap navega)
const dropdownParent = document.querySelector('.nav-links li .dropdown')?.parentElement;
if (dropdownParent) {
    const parentLink = dropdownParent.querySelector(':scope > a');
    parentLink.addEventListener('click', function(e) {
        if (navbar.classList.contains('collapsed')) return;
        if (!dropdownParent.classList.contains('dropdown-open')) {
            e.preventDefault();
            dropdownParent.classList.add('dropdown-open');
        }
    });
    document.addEventListener('click', function(e) {
        if (!dropdownParent.contains(e.target)) {
            dropdownParent.classList.remove('dropdown-open');
        }
    });
}

// Scroll reveal
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Cookie banner
function acceptCookies() {
    localStorage.setItem('cookieConsent', 'accepted');
    document.getElementById('cookieBanner').style.display = 'none';
}

function rejectCookies() {
    localStorage.setItem('cookieConsent', 'rejected');
    document.getElementById('cookieBanner').style.display = 'none';
}

if (!localStorage.getItem('cookieConsent')) {
    document.getElementById('cookieBanner').style.display = 'block';
}
