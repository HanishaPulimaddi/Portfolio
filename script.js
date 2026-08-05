// Light/dark theme toggle — persisted to localStorage, defaults to system preference.
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  const root = document.documentElement;
  const applyTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
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
const navItems = document.querySelectorAll('.nav-link[data-section]');
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

// CV modal — opens the PDF in an in-page viewer instead of navigating away.
// Multiple triggers (nav "CV" link, contact "Resume" row) share one modal.
const cvTriggers = document.querySelectorAll('.cv-trigger');
const cvModal = document.getElementById('cvModal');
if (cvTriggers.length && cvModal) {
  const cvFrame = document.getElementById('cvFrame');
  const cvDownload = cvModal.querySelector('.cv-modal-download');
  let lastFocused = null;

  // Cache-bust so a replaced resume.pdf shows up immediately instead of a stale cached copy.
  const cvCacheBuster = `?v=${Date.now()}`;
  const cvHref = cvTriggers[0].getAttribute('href') + cvCacheBuster;
  if (cvDownload) cvDownload.href = cvHref;

  const openCv = (event) => {
    event.preventDefault();
    lastFocused = document.activeElement;
    cvFrame.src = cvHref;
    cvModal.hidden = false;
    document.body.style.overflow = 'hidden';
    cvModal.querySelector('.cv-modal-close').focus();
  };

  const closeCv = () => {
    cvModal.hidden = true;
    document.body.style.overflow = '';
    lastFocused?.focus();
  };

  cvTriggers.forEach((btn) => btn.addEventListener('click', openCv));
  cvModal.querySelectorAll('[data-cv-close]').forEach((el) => el.addEventListener('click', closeCv));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !cvModal.hidden) closeCv();
  });
}

// Projects carousel — prev/next buttons page the viewport by one screenful,
// showing two project cards at a time.
const projectsViewport = document.querySelector('[data-projects-viewport]');
const projectsPrev = document.querySelector('[data-projects-prev]');
const projectsNext = document.querySelector('[data-projects-next]');
if (projectsViewport && projectsPrev && projectsNext) {
  const updateProjectsNav = () => {
    const maxScroll = projectsViewport.scrollWidth - projectsViewport.clientWidth;
    projectsPrev.disabled = projectsViewport.scrollLeft <= 4;
    projectsNext.disabled = projectsViewport.scrollLeft >= maxScroll - 4;
  };
  projectsPrev.addEventListener('click', () => {
    projectsViewport.scrollBy({ left: -projectsViewport.clientWidth, behavior: 'smooth' });
  });
  projectsNext.addEventListener('click', () => {
    projectsViewport.scrollBy({ left: projectsViewport.clientWidth, behavior: 'smooth' });
  });
  projectsViewport.addEventListener('scroll', updateProjectsNav, { passive: true });
  window.addEventListener('resize', updateProjectsNav);
  updateProjectsNav();
}

// Contact form — no backend, so it hands the message off to the visitor's
// mail client via a pre-filled mailto: link.
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = contactForm.name.value.trim();
    const email = contactForm.email.value.trim();
    const subject = contactForm.subject.value.trim() || `Portfolio contact from ${name}`;
    const message = contactForm.message.value.trim();
    const body = `${message}\n\n— ${name} (${email})`;
    window.location.href =
      `mailto:hani.pulimaddi@outlook.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

// Thoughts modal — "Read fully" expands an article card into the full
// write-up, styled like the rest of the site rather than an embedded PDF.
const thoughtCards = document.querySelectorAll('.thought-card');
const thoughtModal = document.getElementById('thoughtModal');
if (thoughtCards.length && thoughtModal) {
  const thoughtModalTitle = document.getElementById('thoughtModalTitle');
  const thoughtModalDate = document.getElementById('thoughtModalDate');
  const thoughtModalBody = document.getElementById('thoughtModalBody');
  const thoughtModalScroll = thoughtModal.querySelector('.thought-modal-scroll');
  let lastFocusedThought = null;

  const openThought = (card) => {
    const template = card.querySelector('template.thought-full');
    if (!template) return;
    lastFocusedThought = document.activeElement;
    thoughtModalTitle.textContent = card.querySelector('h3').textContent;
    thoughtModalDate.textContent = card.querySelector('.thought-date').textContent;
    thoughtModalBody.replaceChildren(template.content.cloneNode(true));
    thoughtModalScroll.scrollTop = 0;
    thoughtModal.hidden = false;
    document.body.style.overflow = 'hidden';
    thoughtModal.querySelector('.thought-modal-close').focus();
  };

  const closeThought = () => {
    thoughtModal.hidden = true;
    document.body.style.overflow = '';
    lastFocusedThought?.focus();
  };

  thoughtCards.forEach((card) => {
    card.querySelector('[data-thought-open]')?.addEventListener('click', () => openThought(card));
  });
  thoughtModal.querySelectorAll('[data-thought-close]').forEach((el) => el.addEventListener('click', closeThought));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !thoughtModal.hidden) closeThought();
  });
}

// Project modal — clicking a project card's content (outside its links)
// expands it into a dialog with the problem, solution, and learnings.
const projectBodies = document.querySelectorAll('[data-project-open]');
const projectModal = document.getElementById('projectModal');
if (projectBodies.length && projectModal) {
  const projectModalTitle = document.getElementById('projectModalTitle');
  const projectModalTags = document.getElementById('projectModalTags');
  const projectModalLinks = document.getElementById('projectModalLinks');
  const projectModalBody = document.getElementById('projectModalBody');
  const projectModalScroll = projectModal.querySelector('.project-modal-scroll');
  let lastFocusedProject = null;

  const openProject = (body) => {
    const template = body.querySelector('template.project-full');
    if (!template) return;
    lastFocusedProject = document.activeElement;
    projectModalTitle.textContent = body.querySelector('h3').textContent;
    projectModalTags.replaceChildren(...body.querySelector('.tag-row').cloneNode(true).childNodes);
    projectModalLinks.replaceChildren(...body.querySelector('.project-links').cloneNode(true).childNodes);
    projectModalBody.replaceChildren(template.content.cloneNode(true));
    projectModalScroll.scrollTop = 0;
    projectModal.hidden = false;
    document.body.style.overflow = 'hidden';
    projectModal.querySelector('.project-modal-close').focus();
  };

  const closeProject = () => {
    projectModal.hidden = true;
    document.body.style.overflow = '';
    lastFocusedProject?.focus();
  };

  projectBodies.forEach((body) => {
    body.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      openProject(body);
    });
    body.addEventListener('keydown', (event) => {
      if (event.target.closest('a')) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openProject(body);
      }
    });
  });
  projectModal.querySelectorAll('[data-project-close]').forEach((el) => el.addEventListener('click', closeProject));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !projectModal.hidden) closeProject();
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

