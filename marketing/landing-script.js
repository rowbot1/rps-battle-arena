// Landing Page Interactive Elements

document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Navbar background on scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(6, 6, 15, 0.95)';
            navbar.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.3)';
        } else {
            navbar.style.background = 'rgba(6, 6, 15, 0.9)';
            navbar.style.boxShadow = 'none';
        }
    });
    
    // Animate stats on scroll
    const animateValue = (element, start, end, duration) => {
        const startTime = performance.now();
        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (end - start) * progress);
            
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                // Add the suffix back
                if (element.dataset.suffix) {
                    element.textContent = element.textContent + element.dataset.suffix;
                }
            }
        };
        requestAnimationFrame(update);
    };
    
    // Stats animation
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.animated) {
                entry.target.animated = true;
                const value = entry.target.textContent;
                const suffix = value.match(/[^0-9.]+$/)?.[0] || '';
                const number = parseFloat(value.replace(/[^0-9.]/g, ''));
                
                entry.target.dataset.suffix = suffix;
                
                if (suffix === 'M+') {
                    animateValue(entry.target, 0, number * 1000000, 2000);
                } else if (suffix === 'K') {
                    animateValue(entry.target, 0, number * 1000, 2000);
                } else {
                    animateValue(entry.target, 0, number, 2000);
                }
            }
        });
    });
    
    document.querySelectorAll('.stat-number').forEach(stat => {
        statsObserver.observe(stat);
    });
    
    // Game mode cards interaction
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            modeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });
    
    // Floating elements parallax
    const floatingElements = document.querySelectorAll('.float-emoji');
    window.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        floatingElements.forEach((el, index) => {
            const speed = (index + 1) * 20;
            const translateX = (x - 0.5) * speed;
            const translateY = (y - 0.5) * speed;
            
            el.style.transform = `translate(${translateX}px, ${translateY}px)`;
        });
    });
    
    // Tournament countdown
    const updateTournamentCountdowns = () => {
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setHours(now.getHours() + 1, 0, 0, 0);
        
        const diff = nextHour - now;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        
        document.querySelectorAll('.tournament-countdown').forEach(el => {
            el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        });
    };
    
    setInterval(updateTournamentCountdowns, 1000);
    
    // Testimonial rotation
    const testimonials = document.querySelectorAll('.testimonial');
    let currentTestimonial = 0;
    
    const rotateTestimonials = () => {
        testimonials.forEach((t, index) => {
            if (index === currentTestimonial) {
                t.style.transform = 'scale(1.05)';
                t.style.boxShadow = '0 20px 40px rgba(124, 58, 237, 0.2)';
            } else {
                t.style.transform = 'scale(1)';
                t.style.boxShadow = 'none';
            }
        });
        
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
    };
    
    setInterval(rotateTestimonials, 3000);
    
    // Add hover sound effects (optional)
    const addHoverSound = () => {
        const buttons = document.querySelectorAll('button, .btn-primary, .btn-secondary');
        const hoverSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi');
        
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                hoverSound.currentTime = 0;
                hoverSound.play().catch(() => {});
            });
        });
    };
    
    // Play button animation
    const playButtons = document.querySelectorAll('.play-btn, .btn-primary');
    playButtons.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
    
    // Load game preview image with placeholder
    const gamePreviewImg = document.querySelector('.game-preview img');
    if (gamePreviewImg) {
        gamePreviewImg.onerror = function() {
            this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"%3E%3Crect fill="%23111" width="800" height="600"/%3E%3Ctext x="400" y="300" text-anchor="middle" fill="%23666" font-size="24" font-family="Arial"%3EGame Screenshot%3C/text%3E%3C/svg%3E';
        };
    }
    
    // Platform images placeholders
    document.querySelectorAll('.platform-btn img').forEach(img => {
        img.onerror = function() {
            const parent = this.parentElement;
            if (this.alt.includes('App Store')) {
                parent.innerHTML = '<div style="background: #000; color: white; padding: 1rem 2rem; border-radius: 10px; font-weight: 600;">Download on App Store</div>';
            } else if (this.alt.includes('Google Play')) {
                parent.innerHTML = '<div style="background: #000; color: white; padding: 1rem 2rem; border-radius: 10px; font-weight: 600;">Get it on Google Play</div>';
            }
        };
    });
    
    // Add entrance animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                animationObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all feature cards, tournament cards, etc.
    document.querySelectorAll('.feature-card, .tournament-card, .testimonial').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease-out';
        animationObserver.observe(el);
    });
    
    // Add animate-in class styles
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
});

// Prevent right-click on images (optional)
document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
    }
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});