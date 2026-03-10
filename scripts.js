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
});

// Close menu on link click
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('active'));
});

// Auto-collapse navbar when items don't fit
function checkNavOverflow() {
    const navbar = document.getElementById('navbar');
    const navLinks = document.getElementById('navLinks');
    const container = navbar.querySelector('.container');

    navLinks.classList.remove('active');
    navbar.classList.remove('collapsed');
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
