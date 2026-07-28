// Light/dark theme toggle — persisted to localStorage, defaults to system preference.
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  const root = document.documentElement;
  const applyTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  };
  applyTheme(root.getAttribute('data-theme') || 'light');
  themeToggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  });
}

// Active nav state driven by which section is centered in the viewport.
const sections = document.querySelectorAll('main section[id]');
const navItems = document.querySelectorAll('.nav-item');
const navBySection = {};
navItems.forEach((item) => { navBySection[item.dataset.section] = item; });

const setActive = (id) => {
  navItems.forEach((item) => item.classList.remove('active'));
  navBySection[id]?.classList.add('active');
};

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );
  sections.forEach((section) => observer.observe(section));
}

// Interactive dot-grid background — dots drift away from the cursor and
// warm toward the accent color the closer it gets, then ease back to rest.
const dotCanvas = document.getElementById('dotField');
if (dotCanvas) {
  const ctx = dotCanvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const spacing = 26;
  const baseRadius = 1.1;
  const baseAlpha = 0.09;
  const influenceRadius = 140;
  const maxPush = 10;

  let dots = [];
  let width = 0;
  let height = 0;
  const mouse = { x: -9999, y: -9999 };
  let dotRGB = getComputedStyle(document.documentElement).getPropertyValue('--dot-rgb').trim() || '34,49,66';
  document.addEventListener('themechange', () => {
    dotRGB = getComputedStyle(document.documentElement).getPropertyValue('--dot-rgb').trim() || dotRGB;
    if (reduceMotion) drawStatic();
  });

  function buildDots() {
    dots = [];
    for (let y = spacing / 2; y < height; y += spacing) {
      for (let x = spacing / 2; x < width; x += spacing) {
        dots.push({ ox: x, oy: y, x, y });
      }
    }
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    dotCanvas.width = width * dpr;
    dotCanvas.height = height * dpr;
    dotCanvas.style.width = width + 'px';
    dotCanvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildDots();
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = `rgba(${dotRGB},${baseAlpha})`;
    for (const d of dots) {
      ctx.beginPath();
      ctx.arc(d.ox, d.oy, baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (reduceMotion) {
    resize();
    drawStatic();
    window.addEventListener('resize', () => { resize(); drawStatic(); });
  } else {
    const onMove = (x, y) => { mouse.x = x; mouse.y = y; };
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY), { passive: true });
    window.addEventListener('mouseleave', () => onMove(-9999, -9999));
    window.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    }, { passive: true });
    window.addEventListener('touchend', () => onMove(-9999, -9999));
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const d of dots) {
        const dx = d.ox - mouse.x;
        const dy = d.oy - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let targetX = d.ox;
        let targetY = d.oy;
        let radius = baseRadius;
        let alpha = baseAlpha;
        let near = false;

        if (dist < influenceRadius) {
          near = true;
          const force = 1 - dist / influenceRadius;
          const angle = Math.atan2(dy, dx);
          targetX = d.ox + Math.cos(angle) * force * maxPush;
          targetY = d.oy + Math.sin(angle) * force * maxPush;
          radius = baseRadius + force * 1.6;
          alpha = baseAlpha + force * 0.55;
        }

        d.x += (targetX - d.x) * 0.18;
        d.y += (targetY - d.y) * 0.18;

        ctx.beginPath();
        ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = near ? `rgba(217,80,44,${alpha})` : `rgba(${dotRGB},${alpha})`;
        ctx.fill();
      }
      requestAnimationFrame(draw);
    };

    resize();
    draw();
  }
}

// Photo card flip.
const heroFlip = document.getElementById('heroFlip');
if (heroFlip) {
  const toggleFlip = () => {
    const flipped = heroFlip.classList.toggle('is-flipped');
    heroFlip.setAttribute('aria-pressed', String(flipped));
  };
  heroFlip.addEventListener('click', toggleFlip);
  heroFlip.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleFlip();
    }
  });
}

// Hero headline typewriter — types, pauses, deletes, moves to the next word.
const typeEl = document.getElementById('typeText');
if (typeEl) {
  const words = ['Student', 'Aspiring Software Engineer', 'AI Enthusiast'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    typeEl.textContent = words.join(' · ');
  } else {
    const typeSpeed = 55;
    const deleteSpeed = 30;
    const holdTime = 1400;
    const gapTime = 400;
    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const tick = () => {
      const current = words[wordIndex];
      if (!deleting) {
        charIndex++;
        typeEl.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(tick, holdTime);
          return;
        }
        setTimeout(tick, typeSpeed);
      } else {
        charIndex--;
        typeEl.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % words.length;
          setTimeout(tick, gapTime);
          return;
        }
        setTimeout(tick, deleteSpeed);
      }
    };
    tick();
  }
}

// CV modal — opens the PDF in an in-page viewer instead of navigating away.
const cvBtn = document.getElementById('cvBtn');
const cvModal = document.getElementById('cvModal');
if (cvBtn && cvModal) {
  const cvFrame = document.getElementById('cvFrame');
  const cvDownload = cvModal.querySelector('.cv-modal-download');
  let lastFocused = null;

  // Cache-bust so a replaced resume.pdf shows up immediately instead of a stale cached copy.
  const cvCacheBuster = `?v=${Date.now()}`;
  if (cvDownload) cvDownload.href = cvBtn.getAttribute('href') + cvCacheBuster;

  const openCv = (event) => {
    event.preventDefault();
    lastFocused = document.activeElement;
    cvFrame.src = cvBtn.getAttribute('href') + cvCacheBuster;
    cvModal.hidden = false;
    document.body.style.overflow = 'hidden';
    cvModal.querySelector('.cv-modal-close').focus();
  };

  const closeCv = () => {
    cvModal.hidden = true;
    document.body.style.overflow = '';
    lastFocused?.focus();
  };

  cvBtn.addEventListener('click', openCv);
  cvModal.querySelectorAll('[data-cv-close]').forEach((el) => el.addEventListener('click', closeCv));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !cvModal.hidden) closeCv();
  });
}

// Experience photo slideshows — auto-crossfade through each card's images,
// with prev/next arrows for manual control.
const reduceMotionSlides = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('[data-slideshow]').forEach((container) => {
  const slides = container.querySelectorAll('.slide');
  const dots = container.querySelectorAll('.dot');
  const prevBtn = container.querySelector('[data-slide-prev]');
  const nextBtn = container.querySelector('[data-slide-next]');
  if (slides.length < 2) return;

  let index = 0;
  let timer = null;

  const show = (newIndex) => {
    slides[index].classList.remove('active');
    dots[index]?.classList.remove('active');
    index = (newIndex + slides.length) % slides.length;
    slides[index].classList.add('active');
    dots[index]?.classList.add('active');
  };

  const restartTimer = () => {
    if (reduceMotionSlides) return;
    clearInterval(timer);
    timer = setInterval(() => show(index + 1), 3000);
  };

  prevBtn?.addEventListener('click', () => { show(index - 1); restartTimer(); });
  nextBtn?.addEventListener('click', () => { show(index + 1); restartTimer(); });

  restartTimer();
});

// Project demo videos — lazy-loaded, autoplay muted while in view, with
// hover controls to unmute or expand into a larger player.
const projectVideoWraps = document.querySelectorAll('[data-video-wrap]');
if (projectVideoWraps.length) {
  const lazyLoadVideo = (video) => {
    if (video.dataset.src && !video.src) {
      video.src = video.dataset.src;
      video.load();
    }
    if (!reduceMotionSlides) video.play().catch(() => {});
  };

  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target.querySelector('.project-video');
        if (!video) return;
        if (entry.isIntersecting) {
          lazyLoadVideo(video);
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.25 });
    projectVideoWraps.forEach((wrap) => videoObserver.observe(wrap));
  } else {
    projectVideoWraps.forEach((wrap) => lazyLoadVideo(wrap.querySelector('.project-video')));
  }

  const videoModal = document.getElementById('videoModal');
  const videoModalPlayer = document.getElementById('videoModalPlayer');
  let lastFocusedControl = null;
  let expandedSourceVideo = null;

  const closeVideoModal = () => {
    if (!videoModal || videoModal.hidden) return;
    videoModalPlayer.pause();
    videoModalPlayer.removeAttribute('src');
    videoModalPlayer.load();
    videoModal.hidden = true;
    document.body.style.overflow = '';
    if (expandedSourceVideo && !reduceMotionSlides) {
      expandedSourceVideo.play().catch(() => {});
    }
    expandedSourceVideo = null;
    lastFocusedControl?.focus();
  };

  if (videoModal && videoModalPlayer) {
    videoModal.querySelectorAll('[data-video-modal-close]').forEach((el) => el.addEventListener('click', closeVideoModal));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !videoModal.hidden) closeVideoModal();
    });
  }

  projectVideoWraps.forEach((wrap) => {
    const video = wrap.querySelector('.project-video');
    const muteBtn = wrap.querySelector('[data-video-mute]');
    const expandBtn = wrap.querySelector('[data-video-expand]');
    if (!video) return;

    muteBtn?.addEventListener('click', () => {
      video.muted = !video.muted;
      muteBtn.classList.toggle('is-muted', video.muted);
      muteBtn.setAttribute('aria-pressed', String(!video.muted));
      muteBtn.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
    });

    expandBtn?.addEventListener('click', () => {
      if (!videoModal || !videoModalPlayer) return;
      lastFocusedControl = expandBtn;
      expandedSourceVideo = video;
      video.pause();
      videoModalPlayer.src = video.dataset.src || video.src;
      videoModalPlayer.currentTime = video.currentTime;
      videoModalPlayer.muted = false;
      videoModal.hidden = false;
      document.body.style.overflow = 'hidden';
      videoModalPlayer.play().catch(() => {});
      videoModal.querySelector('.video-modal-close').focus();
    });
  });
}

// Scroll-reveal for section content blocks.
const revealTargets = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealTargets.length) {
  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealTargets.forEach((el) => revealObserver.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('in'));
}
