document.addEventListener('DOMContentLoaded', () => {

    // 1. Dashboard Preloader Sequence (Tied to actual 3D model loading)
    const preloader = document.getElementById('preloader');

    function startApp() {
        gsap.to(preloader, {
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out',
            onComplete: () => {
                preloader.style.display = 'none';
                // Trigger Hero entry animations
                triggerHeroAnimations();
            }
        });
    }

    if (window.isBootComplete) {
        startApp();
    } else {
        window.addEventListener('bootComplete', startApp);
    }

    // 2. Mouse Follow Glow Effect
    const mouseGlow = document.getElementById('mouse-glow');
    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Smooth lerp animation for the glow
    function animateGlow() {
        const xp = 0.08; // Lerp factor
        glowX += (mouseX - glowX) * xp;
        glowY += (mouseY - glowY) * xp;
        
        mouseGlow.style.left = `${glowX}px`;
        mouseGlow.style.top = `${glowY}px`;
        
        requestAnimationFrame(animateGlow);
    }
    animateGlow();

    // Shrink glow on click
    window.addEventListener('mousedown', () => {
        mouseGlow.style.width = '300px';
        mouseGlow.style.height = '300px';
    });
    window.addEventListener('mouseup', () => {
        mouseGlow.style.width = '400px';
        mouseGlow.style.height = '400px';
    });

    // 3. Before/After CAD Sliders
    setupSlider('slider-cfd');
    setupSlider('slider-crash');

    function setupSlider(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const afterImg = container.querySelector('.slider-after');
        const handle = container.querySelector('.slider-handle');

        function setSliderPos(x) {
            const rect = container.getBoundingClientRect();
            let posX = ((x - rect.left) / rect.width) * 100;
            
            // Bounds check
            if (posX < 0) posX = 0;
            if (posX > 100) posX = 100;

            afterImg.style.clipPath = `polygon(0 0, ${posX}% 0, ${posX}% 100%, 0 100%)`;
            handle.style.left = `${posX}%`;
        }

        // Mouse events
        let isDragging = false;

        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            setSliderPos(e.clientX);
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            setSliderPos(e.clientX);
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Touch events for mobile
        container.addEventListener('touchstart', (e) => {
            isDragging = true;
            setSliderPos(e.touches[0].clientX);
        });

        window.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            setSliderPos(e.touches[0].clientX);
        });

        window.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    // 4. GSAP & ScrollTrigger Animations
    function triggerHeroAnimations() {
        gsap.registerPlugin(ScrollTrigger);

        // Hero Text Entry
        gsap.from('.hero-tagline', { opacity: 0, y: -20, duration: 1, ease: 'power3.out' });
        gsap.from('.hero-title', { opacity: 0, y: 30, duration: 1.2, delay: 0.2, ease: 'power3.out' });
        gsap.from('.hero-desc', { opacity: 0, y: 20, duration: 1, delay: 0.4, ease: 'power3.out' });
        gsap.from('.hero-buttons', { opacity: 0, y: 20, duration: 1, delay: 0.6, ease: 'power3.out' });
        gsap.from('.hero-background', { opacity: 0, scale: 1.05, duration: 2, ease: 'power2.out' });

        // Scroll-bound Car Movement (Apple / CodePen Style)
        const scrollCar = document.getElementById('scroll-car');
        const scrollProgLine = document.getElementById('scroll-prog-line');

        // We track the scroll progress of the entire page
        gsap.to({}, {
            scrollTrigger: {
                trigger: 'body',
                start: 'top top',
                end: 'bottom bottom',
                scrub: true,
                onUpdate: (self) => {
                    const progress = self.progress;
                    const containerHeight = window.innerHeight - 160; // Padding offset
                    
                    // Move the car down the line
                    const targetY = progress * containerHeight;
                    gsap.set(scrollCar, { y: targetY });
                    
                    // Update progress line height
                    scrollProgLine.style.height = `${progress * 100}%`;
                    
                    // Rotate car slightly based on scroll direction/speed
                    const velocity = self.getVelocity();
                    const angle = 90 + (velocity * 0.005); // 90deg is pointing straight down
                    gsap.set(scrollCar, { rotation: angle });
                }
            }
        });

        // Section Headers Fade-in
        const headers = document.querySelectorAll('.section-header');
        headers.forEach(header => {
            gsap.from(header, {
                scrollTrigger: {
                    trigger: header,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                },
                opacity: 0,
                y: 30,
                duration: 1,
                ease: 'power3.out'
            });
        });

        // About Cards / Stats counter animation
        gsap.from('.about-text', {
            scrollTrigger: {
                trigger: '#about',
                start: 'top 75%'
            },
            opacity: 0,
            x: -40,
            duration: 1,
            ease: 'power3.out'
        });

        gsap.from('.stat-box', {
            scrollTrigger: {
                trigger: '.about-stats',
                start: 'top 80%'
            },
            opacity: 0,
            y: 30,
            stagger: 0.15,
            duration: 0.8,
            ease: 'power3.out'
        });

        // Skills Matrix Animation
        gsap.from('.skills-category', {
            scrollTrigger: {
                trigger: '#skills',
                start: 'top 75%'
            },
            opacity: 0,
            y: 40,
            stagger: 0.2,
            duration: 1,
            ease: 'power3.out'
        });

        // Project Cards Reveal
        const projectCards = document.querySelectorAll('.project-card');
        projectCards.forEach(card => {
            const media = card.querySelector('.project-media');
            const info = card.querySelector('.project-info');

            gsap.from(media, {
                scrollTrigger: {
                    trigger: card,
                    start: 'top 75%'
                },
                opacity: 0,
                scale: 0.95,
                duration: 1.2,
                ease: 'power3.out'
            });

            gsap.from(info, {
                scrollTrigger: {
                    trigger: card,
                    start: 'top 75%'
                },
                opacity: 0,
                x: card.classList.contains('reverse') ? -40 : 40,
                duration: 1.2,
                ease: 'power3.out'
            });
        });

        // Timeline Items Reveal
        const timelineItems = document.querySelectorAll('.timeline-item');
        timelineItems.forEach(item => {
            gsap.from(item, {
                scrollTrigger: {
                    trigger: item,
                    start: 'top 85%'
                },
                opacity: 0,
                x: -30,
                duration: 1,
                ease: 'power3.out'
            });
        });

        // Contact Section Reveal
        gsap.from('.contact-info', {
            scrollTrigger: {
                trigger: '#contact',
                start: 'top 75%'
            },
            opacity: 0,
            x: -30,
            duration: 1,
            ease: 'power3.out'
        });

        gsap.from('.contact-form', {
            scrollTrigger: {
                trigger: '#contact',
                start: 'top 75%'
            },
            opacity: 0,
            x: 30,
            duration: 1,
            ease: 'power3.out'
        });
    }

    // 5. Active Link Highlighting & Nav Scroll Effect
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');
    const nav = document.querySelector('nav');

    window.addEventListener('scroll', () => {
        // Nav background scroll effect
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        // Active section highligher
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // Portfolio Accordion Toggle with GSAP
    const accordionSections = document.querySelectorAll('.portfolio-section');
    accordionSections.forEach(section => {
        const header = section.querySelector('.portfolio-section-header');
        const content = section.querySelector('.portfolio-section-content');
        
        // Initial setup for heights on load
        if (section.classList.contains('expanded')) {
            content.style.display = 'block';
            content.style.height = 'auto';
            content.style.opacity = '1';
        } else {
            content.style.display = 'none';
            content.style.height = '0px';
            content.style.opacity = '0';
        }

        header.addEventListener('click', () => {
            const isExpanded = section.classList.contains('expanded');
            
            if (isExpanded) {
                // Collapse section
                gsap.to(content, {
                    height: 0,
                    opacity: 0,
                    duration: 0.5,
                    ease: 'power3.inOut',
                    onComplete: () => {
                        section.classList.remove('expanded');
                        content.style.display = 'none';
                        ScrollTrigger.refresh(); // Refresh ScrollTrigger to recalculate page offsets!
                    }
                });
            } else {
                // Expand section
                content.style.display = 'block';
                content.style.height = 'auto';
                const autoHeight = content.offsetHeight;
                
                // Set height to 0 before animating
                gsap.fromTo(content, 
                    { height: 0, opacity: 0 },
                    { 
                        height: autoHeight, 
                        opacity: 1, 
                        duration: 0.6, 
                        ease: 'power3.out',
                        onComplete: () => {
                            section.classList.add('expanded');
                            content.style.height = 'auto'; // Reset to auto for responsiveness
                            ScrollTrigger.refresh(); // Refresh ScrollTrigger!
                        }
                    }
                );
            }
        });
    });

    // 6. Card Tab Switcher System
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid triggering header click
            const tabName = btn.getAttribute('data-tab');
            const targetId = btn.parentElement.getAttribute('data-target');
            const panelsContainer = document.getElementById(targetId);
            
            if (!panelsContainer) return;
            
            // Toggle active buttons in this group
            const siblingButtons = btn.parentElement.querySelectorAll('.tab-btn');
            siblingButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Toggle active panels
            const panels = panelsContainer.querySelectorAll('.tab-panel');
            panels.forEach(panel => {
                if (panel.getAttribute('data-panel') === tabName) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });
            
            // Recalculate GSAP positions because different panels have different heights
            if (typeof ScrollTrigger !== 'undefined') {
                ScrollTrigger.refresh();
            }
        });
    });

    // 7. Multimedia Slideshow Controller
    function setupMediaSlider(sliderId) {
        const slider = document.getElementById(sliderId);
        if (!slider) return;
        
        const slides = slider.querySelectorAll('.media-slide');
        const dots = slider.querySelectorAll('.slider-dot');
        if (slides.length === 0) return;
        
        function showSlide(index) {
            slides.forEach((slide, idx) => {
                if (idx === index) {
                    slide.classList.add('active');
                    // Play video if present
                    const video = slide.querySelector('video');
                    if (video) {
                        video.currentTime = 0;
                        video.play().catch(err => {});
                    }
                } else {
                    slide.classList.remove('active');
                    // Pause video if present
                    const video = slide.querySelector('video');
                    if (video) {
                        video.pause();
                    }
                }
            });
            
            dots.forEach((dot, idx) => {
                if (idx === index) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
        
        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetIndex = parseInt(dot.getAttribute('data-index'));
                showSlide(targetIndex);
            });
        });
    }

    // Initialize all media sliders
    setupMediaSlider('slider-baleno');
    setupMediaSlider('slider-ktm');
    setupMediaSlider('slider-tire-table');
    setupMediaSlider('slider-solidworks');
    setupMediaSlider('slider-kicad-pcb');
    setupMediaSlider('slider-matlab-bldc');
    setupMediaSlider('slider-basic-car');
    setupMediaSlider('slider-tesla-model-s');
    setupMediaSlider('slider-suzuki-samurai');

    // 8. Work Experience Redacted Terminal Controller
    const scriptsData = [
        {
            name: "engine.sh",
            title: "Engine Simulation Script",
            firstLine: "So let's start from the basics. Every automotive vehicle needs something to make it move—something that pushes it or pulls it through its surroundings."
        },
        {
            name: "ic_engine_parts.sh",
            title: "IC Engine Parts Script",
            firstLine: "An IC engine has many parts, but let's only look at the main ones for now. There is the cylinder head, the engine block, the piston, the connecting rod, and the crankshaft."
        },
        {
            name: "compressor.sh",
            title: "Supercharger & Compressor Script",
            firstLine: "So the question becomes, how do we push more air into the engine than it would normally suck in on its own? One way is by using a compressor."
        },
        {
            name: "shock_absorber.sh",
            title: "Shock Absorber Script",
            firstLine: "Shock absorbers and suspension struts are essential components of your vehicle's suspension system. Their primary purpose is to improve ride comfort while keeping the tires firmly in contact with the road surface for better handling and control."
        },
        {
            name: "brake_system.sh",
            title: "Brake System Script",
            firstLine: "Every moving vehicle contains a large amount of kinetic energy. To bring the vehicle to a stop, that energy must be converted into another form."
        },
        {
            name: "disc_brake.sh",
            title: "Disc Brake Script",
            firstLine: "Disc brakes are the most commonly used braking system on modern passenger vehicles. Each wheel is equipped with a brake rotor, a caliper, and a set of brake pads that work together to safely slow and stop the vehicle."
        },
        {
            name: "brake_pad.sh",
            title: "Brake Pad Script",
            firstLine: "Disc brake systems are fitted to most modern vehicles because they provide reliable and consistent stopping performance. At each wheel, a brake rotor spins with the wheel while a pair of brake pads sit inside the brake caliper."
        },
        {
            name: "drum_brake.sh",
            title: "Drum Brake Script",
            firstLine: "Although disc brakes are now used on most passenger vehicles, drum brakes are still commonly found on the rear wheels of many vehicles, particularly older models and some economy vehicles."
        },
        {
            name: "electronic_brake.sh",
            title: "Electronic Parking Brake (EPB) Script",
            firstLine: "A parking brake is designed to prevent a vehicle from rolling when it is parked. On most vehicles, it operates on the rear brakes."
        },
        {
            name: "brake_master_cyl.sh",
            title: "Brake Master Cylinder Script",
            firstLine: "The brake master cylinder is the heart of your vehicle's hydraulic braking system. Its job is to convert the force applied to the brake pedal into hydraulic pressure, allowing the brakes at each wheel to slow and stop the vehicle."
        },
        {
            name: "blower_resistor.sh",
            title: "Blower Motor Resistor Script",
            firstLine: "Your vehicle's heating and air conditioning system relies on several components working together to maintain a comfortable cabin temperature."
        },
        {
            name: "drive_by_wire.sh",
            title: "Drive-by-Wire (Electronic Throttle Control) Script",
            firstLine: "Earlier vehicles used a mechanical cable to connect the accelerator pedal directly to the engine's throttle plate. Pressing the pedal physically opened the throttle, allowing more air into the engine."
        },
        {
            name: "spark_plug.sh",
            title: "Spark Plug Script",
            firstLine: "Every gasoline or petrol engine relies on controlled combustion to produce power. Inside each engine cylinder, a precise mixture of air and fuel is compressed before being ignited."
        },
        {
            name: "engine_air_filter.sh",
            title: "Engine Air Filter Script",
            firstLine: "The engine air filter plays an important role in protecting your engine by preventing dust, dirt, pollen, and other airborne contaminants from entering the intake system."
        }
    ];

    const scriptButtons = document.querySelectorAll('.script-item-btn');
    const termScriptName = document.getElementById('term-script-name');
    const termScriptTitle = document.getElementById('term-script-title');
    const termScriptFirstLine = document.getElementById('term-script-first-line');
    const terminalScreen = document.getElementById('terminal-screen');

    scriptButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid triggering header click
            const idx = parseInt(btn.getAttribute('data-script'));
            const data = scriptsData[idx];
            if (!data) return;

            // Highlight button
            scriptButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Quick terminal print animation effect
            gsap.fromTo(terminalScreen, 
                { opacity: 0.1 },
                { 
                    opacity: 1, 
                    duration: 0.4, 
                    ease: "power1.out",
                    onStart: () => {
                        termScriptName.textContent = data.name;
                        termScriptTitle.textContent = data.title;
                        termScriptFirstLine.textContent = data.firstLine;
                    }
                }
            );
        });
    });

    // Contact Form Submission (Prevent Default & Show Alert)
    const contactForm = document.getElementById('contact-form-el');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Thank you for reaching out, Melvin! Your message has been sent (simulation).');
            contactForm.reset();
        });
    }

});
