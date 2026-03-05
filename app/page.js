"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { emptyPortfolioData } from "@/lib/fallback";

export const dynamic = 'force-dynamic';

export default function Home() {
  const [portfolioData, setPortfolioData] = useState(emptyPortfolioData);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/save-data')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data && data.profile) setPortfolioData(data); })
      .catch(() => { })
      .finally(() => setDataLoaded(true));
  }, []);

  const { profile, about, projects, certificates } = portfolioData;
  const photos = about?.images || [];
  const heroImage = profile?.heroImage || "";

  // Dynamically initialize order based on number of photos
  const [cardsOrder, setCardsOrder] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const expImages = (certificates || []).map(c => c?.image);
  const expDetails = (certificates || []).map(c => c?.details || []);

  useEffect(() => {
    if (photos.length > 0) {
      setCardsOrder(Array.from({ length: photos.length }, (_, i) => i));
    }
  }, [photos.length]);

  const cyclePhoto = () => {
    if (isSending || photos.length <= 1) return;
    setIsSending(true);
    setTimeout(() => {
      setCardsOrder((prev) => {
        const next = [...prev];
        const top = next.shift();
        next.push(top);
        return next;
      });
      setIsSending(false);
    }, 450);
  };

  useEffect(() => {
    // Only initialize after data is loaded so DOM nodes exist
    if (!dataLoaded) return;

    let interval;
    // Small timeout to ensure React has fully rendered the DOM with new data
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        if (window.THREE && window.gsap && window.ScrollTrigger) {
          clearInterval(interval);
          // Refresh scroll triggers in case layout shifted
          window.ScrollTrigger.refresh();
          initPortfolio();
        }
      }, 100);
    }, 50);

    return () => {
      if (interval) clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [dataLoaded]);

  function initPortfolio() {
    if (typeof window === "undefined") return;
    const THREE = window.THREE;
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;

    // --- 1. Custom Cursor ---
    const dot = document.querySelector(".cursor-dot");
    const outline = document.querySelector(".cursor-outline");
    const hoverElements = document.querySelectorAll("a, button, .indicator");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let outlineX = mouseX;
    let outlineY = mouseY;

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (dot) dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    });

    const animateCursor = () => {
      outlineX += (mouseX - outlineX) * 0.15;
      outlineY += (mouseY - outlineY) * 0.15;
      if (outline) outline.style.transform = `translate(${outlineX}px, ${outlineY}px)`;
      requestAnimationFrame(animateCursor);
    };
    animateCursor();

    hoverElements.forEach((el) => {
      el.addEventListener("mouseenter", () => document.body.classList.add("hovered"));
      el.addEventListener("mouseleave", () => document.body.classList.remove("hovered"));
    });

    if ("ontouchstart" in document.documentElement || navigator.maxTouchPoints > 0 || window.innerWidth <= 768) {
      if (dot) dot.style.display = "none";
      if (outline) outline.style.display = "none";
      document.body.classList.remove("custom-cursor-active");
    } else {
      document.body.classList.add("custom-cursor-active");
    }

    // --- 1b. Hamburger Menu ---
    const hamburger = document.getElementById("hamburger");
    const mobileOverlay = document.getElementById("mobile-nav-overlay");
    const mobileLinks = document.querySelectorAll(".mobile-nav-link");

    const openMenu = () => {
      hamburger.classList.add("open");
      mobileOverlay.classList.add("active");
      document.body.style.overflow = "hidden";
    };
    const closeMenu = () => {
      hamburger.classList.remove("open");
      mobileOverlay.classList.remove("active");
      document.body.style.overflow = "";
    };

    hamburger?.addEventListener("click", () => {
      if (hamburger.classList.contains("open")) closeMenu();
      else openMenu();
    });
    mobileLinks.forEach((link) => link.addEventListener("click", closeMenu));

    // --- 2. Three.js Background ---
    if (THREE) {
      const canvas = document.getElementById("webgl-canvas");
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 3, 10);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x0a192f, 1);

      const geometry = new THREE.PlaneGeometry(50, 50, 40, 40);
      const material = new THREE.MeshBasicMaterial({ color: 0x64ffda, wireframe: true, transparent: true, opacity: 0.1 });
      const plane = new THREE.Mesh(geometry, material);
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = -2;
      scene.add(plane);

      const positionAttribute = geometry.attributes.position;
      const vertexPositions = [];
      for (let i = 0; i < positionAttribute.count; i++) {
        vertexPositions.push({ x: positionAttribute.getX(i), y: positionAttribute.getY(i), z: positionAttribute.getZ(i) });
      }

      let currentX = 0, currentY = 0, targetX = 0, targetY = 0;
      document.addEventListener("mousemove", (event) => {
        targetX = ((event.clientX / window.innerWidth) * 2 - 1) * 0.15;
        targetY = (-(event.clientY / window.innerHeight) * 2 + 1) * 0.15;
      });

      window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });

      const clock = new THREE.Clock();
      const tick = () => {
        const elapsedTime = clock.getElapsedTime();
        for (let i = 0; i < positionAttribute.count; i++) {
          const vertex = vertexPositions[i];
          const xOffset = Math.sin(vertex.x * 0.2 + elapsedTime * 0.5) * 0.5;
          const yOffset = Math.cos(vertex.y * 0.2 + elapsedTime * 0.5) * 0.5;
          positionAttribute.setZ(i, xOffset + yOffset);
        }
        positionAttribute.needsUpdate = true;
        currentX += (targetX - currentX) * 0.03;
        currentY += (targetY - currentY) * 0.03;
        camera.position.x = currentX * 0.5;
        camera.position.y = 3 + currentY * 0.3;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        window.requestAnimationFrame(tick);
      };
      tick();
    }

    // --- 3. Navbar Hide/Show on Scroll ---
    const navbar = document.querySelector(".navbar");
    const slideIndicatorsContainer = document.querySelector(".slide-indicators");
    let lastScroll = 0;
    let indicatorScrollTimeout;

    window.addEventListener("scroll", () => {
      const currentScroll = window.pageYOffset;
      if (currentScroll > 50 && currentScroll > lastScroll) {
        navbar.classList.add("hidden");
      } else if (currentScroll < lastScroll || currentScroll <= 50) {
        navbar.classList.remove("hidden");
      }
      lastScroll = currentScroll <= 0 ? 0 : currentScroll;

      if (slideIndicatorsContainer) {
        slideIndicatorsContainer.classList.remove("hidden-right");
        clearTimeout(indicatorScrollTimeout);
        if (currentScroll > window.innerHeight * 0.5) {
          indicatorScrollTimeout = setTimeout(() => {
            slideIndicatorsContainer.classList.add("hidden-right");
          }, 400);
        }
      }
    }, { passive: true });

    // --- 4. GSAP Scroll Animations ---
    if (gsap && ScrollTrigger) {
      // Very Important: Kill existing scroll triggers to prevent duplication on strict mode / re-renders
      ScrollTrigger.getAll().forEach(t => t.kill());
      gsap.registerPlugin(ScrollTrigger);

      const revealElements = document.querySelectorAll(".gs-reveal");
      revealElements.forEach((elem) => {
        gsap.set(elem, { autoAlpha: 0, y: 50 });
        ScrollTrigger.create({
          trigger: elem,
          start: "top 95%", // Trigger earlier
          onEnter: () => gsap.to(elem, { autoAlpha: 1, y: 0, duration: 0.3, ease: "power3.out" }),
          onLeaveBack: () => gsap.to(elem, { autoAlpha: 0, y: 50, duration: 0.3, ease: "power3.in" }),
        });
      });

      // Slide Indicators Update
      const panels = document.querySelectorAll(".panel");
      const indicators = document.querySelectorAll(".indicator");
      panels.forEach((panel, i) => {
        ScrollTrigger.create({
          trigger: panel,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) {
              indicators.forEach((ind) => ind.classList.remove("active"));
              if (indicators[i]) indicators[i].classList.add("active");
            }
          },
        });
      });

      // Indicator Click Scroll
      indicators.forEach((indicator) => {
        indicator.addEventListener("click", () => {
          const targetId = indicator.getAttribute("data-target");
          const targetEl = document.getElementById(targetId);
          if (targetEl) window.scrollTo({ top: targetEl.offsetTop, behavior: "smooth" });
        });
      });

      // Certificates Section Pin Animation
      const expSection = document.querySelector(".panel.experience");
      const timelineItems = document.querySelectorAll(".timeline-item");
      const timelineProgress = document.querySelector(".timeline-progress");

      if (expSection && timelineItems.length > 0) {
        let tl = gsap.timeline({
          scrollTrigger: {
            trigger: expSection,
            start: "top top", // Pin when section hits the top
            end: "+=1500", // Distance to scroll while pinned
            pin: true,
            scrub: true, // Immediate scroll response
            onUpdate: (self) => {
              const numItems = timelineItems.length;
              let activeIndex = Math.floor(self.progress * numItems);
              // Ensure index is within bounds
              if (activeIndex >= numItems) activeIndex = numItems - 1;
              if (activeIndex < 0) activeIndex = 0;

              // Direct DOM manipulation overrides React rendering for better performance & GSAP compatibility
              const expViewer = document.querySelector(".experience-image-viewer");
              if (expViewer) {
                const imgs = expViewer.querySelectorAll("img.cert-main-img");
                const details = expViewer.querySelectorAll(".cert-details-box");
                imgs.forEach((img, idx) => {
                  img.style.opacity = idx === activeIndex ? "1" : "0";
                });
                details.forEach((box, idx) => {
                  box.style.opacity = idx === activeIndex ? "1" : "0";
                  box.style.pointerEvents = idx === activeIndex ? "auto" : "none";
                });
              }

              timelineItems.forEach((item, idx) => {
                if (idx <= activeIndex) {
                  item.classList.add("active-dot");
                  if (idx === activeIndex) {
                    item.classList.add("active");
                  } else {
                    item.classList.remove("active");
                  }
                } else {
                  item.classList.remove("active-dot");
                  item.classList.remove("active");
                }
              });
            }
          }
        });

        if (timelineProgress) {
          tl.fromTo(timelineProgress, { height: "0%" }, { height: "100%", ease: "none" });
        }
      }
    }
  }

  return (
    <>
      {/* Three.js 3D Background */}
      <canvas id="webgl-canvas"></canvas>

      {/* All content above the canvas */}
      <div id="portfolio-content">

        {/* Custom Cursor */}
        <div className="cursor-dot"></div>
        <div className="cursor-outline"></div>

        {/* Fixed Header / Navbar */}
        <header className="navbar">
          <div className="logo">
            <span className="bracket">{"{"}</span> AE <span className="bracket">{"}"}</span>
          </div>

          {/* Nav Links (Desktop) */}
          <nav className="nav-links" id="nav-links">
            <a href="#about" className="nav-link">About</a>
            <a href="#projects" className="nav-link">Projects</a>
            <a href="#experience" className="nav-link">Experience</a>
            <a href="#contact" className="nav-link">Contact</a>
          </nav>

          {/* Right: Resume & Hamburger */}
          <div className="navbar-right">
            <a href="/CV.pdf" target="_blank" className="btn primary nav-resume-btn">Resume</a>
            <button className="hamburger" id="hamburger" aria-label="Open Menu">
              <span></span><span></span><span></span>
            </button>
          </div>
        </header>

        {/* Mobile Nav Overlay */}
        <div className="mobile-nav-overlay" id="mobile-nav-overlay">
          <nav className="mobile-nav-links">
            <a href="#about" className="mobile-nav-link"><span className="nav-num">01.</span> About</a>
            <a href="#projects" className="mobile-nav-link"><span className="nav-num">02.</span> Projects</a>
            <a href="#experience" className="mobile-nav-link"><span className="nav-num">03.</span> Experience</a>
            <a href="#contact" className="mobile-nav-link"><span className="nav-num">04.</span> Contact</a>
            <a href="/CV.pdf" target="_blank" className="btn primary" style={{ marginTop: "20px", width: "100%", textAlign: "center", justifyContent: "center" }}>
              Resume <i className="fa-solid fa-download"></i>
            </a>
          </nav>
        </div>

        {/* Slide Indicators */}
        <div className="slide-indicators">
          <div className="indicator active" data-target="hero"></div>
          <div className="indicator" data-target="about"></div>
          <div className="indicator" data-target="projects"></div>
          <div className="indicator" data-target="experience"></div>
          <div className="indicator" data-target="contact"></div>
        </div>

        {/* Main Content */}
        <main id="smooth-wrapper">
          <div id="smooth-content">

            {/* SECTION 1: HERO */}
            <section className="panel hero" id="hero">
              <div className="container hero-container" style={{ gap: '80px', alignItems: 'center' }}>
                <div className="hero-content">
                  <p className="tagline gs-reveal">
                    <span><i className="fa-solid fa-terminal"></i></span> {profile.tagline}
                  </p>
                  <h1 className="gs-reveal">I&apos;m <span>{profile.name}</span>.</h1>
                  <h2 className="gs-reveal">I build <span className="gradient-text">{profile.role}</span>.</h2>
                  <p className="hero-desc gs-reveal">
                    {profile.description}
                  </p>
                  <div className="btn-group">
                    <a href="#projects" className="btn primary">View My Work <i className="fa-solid fa-arrow-right"></i></a>
                    <a href="/CV.pdf" className="btn secondary" target="_blank">Download CV <i className="fa-solid fa-download"></i></a>
                  </div>
                </div>

                <div className="hero-image-wrapper gs-reveal" style={{ marginLeft: 'auto', flexShrink: 0, transform: 'translateX(80px)' }}>
                  <div className="hero-image-container">
                    {heroImage && <img src={heroImage} alt="Ahmed Elgohary Avatar" className="hero-avatar" />}
                    <div className="hero-glow"></div>
                  </div>
                  <div className="hero-social">
                    <a href="https://github.com/a7med-elgohary" target="_blank" title="GitHub"><i className="fa-brands fa-github"></i></a>
                    <a href="https://linkedin.com/in/ahmed-elgohary7" target="_blank" title="LinkedIn"><i className="fa-brands fa-linkedin-in"></i></a>
                    <a href="mailto:ahmedelgoharyy7@gmail.com" target="_blank" title="Email"><i className="fa-regular fa-envelope"></i></a>
                    <a href="https://wa.me/201097377236" target="_blank" title="WhatsApp"><i className="fa-brands fa-whatsapp"></i></a>
                  </div>
                </div>
              </div>
              <div className="scroll-down" style={{ bottom: "60px" }}>
                <div className="mouse"><div className="wheel"></div></div>
              </div>
            </section>

            <div className="marquee-section tech-marquee">
              <div className="marquee-content" style={{ animationDuration: '25s' }}>
                {[...(portfolioData.techStack || []), ...(portfolioData.techStack || [])].map((tech, idx) => (
                  <div key={idx} className="tech-item">
                    <i className={tech.icon} style={{ color: tech.color }}></i> {tech.name}
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2: ABOUT */}
            <section className="panel about" id="about">
              <div className="container">
                <div className="section-header gs-reveal">
                  <h2 className="num">01.</h2>
                  <h2 className="title">About Me</h2>
                  <div className="line"></div>
                </div>

                {/* About grid: text + photo stack */}
                <div className="about-grid">
                  <div className="about-text gs-reveal">
                    {about.text.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                    <div className="about-highlights">
                      {about.highlights.map((h, idx) => (
                        <div key={idx} className="highlight-item">
                          <i className="fa-solid fa-check" style={{ color: 'var(--neon)' }}></i> {h}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Photo Stack - desktop only */}
                  <div className="photo-stack gs-reveal" title="Click to cycle">
                    {photos.map((photo, i) => {
                      // Find rank of this photo in the deck (0 = top card, 1 = middle, 2 = bottom)
                      const rank = cardsOrder.indexOf(i);
                      const positionClass = `card-${rank + 1}`;
                      const isAnimating = isSending && rank === 0;

                      return (
                        <div
                          key={i}
                          className={`photo-card ${positionClass}${isAnimating ? ' sending-back' : ''}`}
                          onClick={rank === 0 ? cyclePhoto : undefined}
                          style={{ cursor: rank === 0 ? 'pointer' : 'default' }}
                        >
                          <img src={photo} alt={`Ahmed Elgohary ${i}`} />
                        </div>
                      );
                    })}
                    <div className="photo-stack-hint">click to cycle</div>
                  </div>
                </div>

              </div>
            </section>



            {/* SECTION 3: PROJECTS */}
            <section className="panel projects" id="projects">
              <div className="container">
                <div className="section-header gs-reveal">
                  <h2 className="num">02.</h2>
                  <h2 className="title">Some Things I&apos;ve Built</h2>
                  <div className="line"></div>
                </div>
              </div>

              <div className="marquee-section projects-marquee">
                <div className="marquee-content projects-marquee-content">
                  {/* Map over projects doubled for infinite look */}
                  {[...(projects || []), ...(projects || [])].map((project, idx) => (
                    <div className="modern-card" key={idx}>
                      <div className="modern-card-image">
                        {(!project.image || project.image.startsWith('placeholder')) ? (
                          <div className="default-bg" style={{ background: "linear-gradient(135deg, rgba(16,33,62,1), rgba(100,255,218,0.1))", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                            <i className={`fa-solid ${project.image === 'placeholder-invoice' ? 'fa-file-invoice-dollar' : 'fa-receipt'} placeholder-icon`} style={{ fontSize: "60px", color: "var(--neon)", opacity: 0.8 }}></i>
                          </div>
                        ) : (
                          <img src={project.image} alt={project.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                      </div>
                      <div className="modern-card-content">
                        <div className="modern-card-header">
                          <div className="modern-card-folder"><i className="fa-regular fa-folder-open"></i></div>
                          <div className="modern-card-links">
                            {project.github && <a href={project.github} target="_blank"><i className="fa-brands fa-github"></i></a>}
                            {project.link && <a href={project.link} target="_blank"><i className="fa-solid fa-arrow-up-right-from-square"></i></a>}
                          </div>
                        </div>
                        <h3 className="modern-card-title">{project.title}</h3>
                        <div className="modern-card-desc"><p>{project.description}</p></div>
                        <ul className="modern-card-tech">
                          {(project.tech || []).map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* SECTION 4: CERTIFICATES */}
            <section className="panel experience" id="experience">
              <div className="container">
                <div className="section-header gs-reveal">
                  <h2 className="num">03.</h2>
                  <h2 className="title">Certificates & Achievements</h2>
                  <div className="line"></div>
                </div>

                <div className="experience-grid">
                  <div className="experience-image-viewer gs-reveal" style={{ position: 'relative' }}>
                    {certificates.map((cert, idx) => (
                      <img
                        key={`img-${idx}`}
                        src={cert.image}
                        alt="Certificate"
                        className="cert-main-img"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          opacity: idx === 0 ? 1 : 0,
                          transition: 'opacity 0.4s ease',
                          pointerEvents: idx === 0 ? 'auto' : 'none',
                        }}
                      />
                    ))}
                    {certificates.map((cert, idx) => (
                      <div
                        className="cert-details-box"
                        key={`details-${idx}`}
                        style={{
                          opacity: idx === 0 ? 1 : 0,
                          transition: 'opacity 0.4s ease',
                          pointerEvents: idx === 0 ? 'auto' : 'none',
                        }}
                      >
                        <ul>
                          {(cert.details || []).map((detail, dIdx) => (
                            <li key={dIdx}>{detail}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="timeline gs-reveal">
                    <div className="timeline-line"></div>
                    <div className="timeline-progress" id="timeline-progress"></div>
                    {certificates.map((cert, idx) => (
                      <div
                        key={idx}
                        className={`timeline-item ${idx === 0 ? 'active active-dot' : ''}`}
                      >
                        <div className="timeline-dot"></div>
                        <div className="timeline-content glass-card blur-filter">
                          <h3>{cert.title} <span>@ {cert.organization}</span></h3>
                          <p className="date">{cert.year} &nbsp;|&nbsp; {cert.fullOrgName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </section>

            {/* SECTION 5: CONTACT */}
            <section className="panel contact" id="contact">
              <div className="container text-center gs-reveal">
                <p className="overline">04. What&apos;s Next?</p>
                <h2 className="title">Get In Touch</h2>
                <p className="contact-desc">I&apos;m currently open to new opportunities and collaborations. Whether you have a project idea, a question, or just want to connect — feel free to reach out!</p>
                <div className="btn-group" style={{ justifyContent: "center", marginTop: "30px" }}>
                  <a href="mailto:ahmedelgoharyy7@gmail.com" className="btn primary huge">Email Me <i className="fa-regular fa-paper-plane"></i></a>
                  <a href="https://wa.me/201097377236" target="_blank" className="btn huge" style={{ borderColor: "#25D366", color: "#25D366" }}>WhatsApp <i className="fa-brands fa-whatsapp"></i></a>
                </div>
              </div>
            </section>

          </div>
        </main>

      </div> {/* end #portfolio-content */}

      {/* Load Three.js, GSAP, then init */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        strategy="afterInteractive"
        id="threejs"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"
        strategy="afterInteractive"
        id="gsap"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"
        strategy="afterInteractive"
        id="scrolltrigger"
      />
    </>
  );
}
