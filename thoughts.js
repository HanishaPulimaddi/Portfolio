// Thoughts page — a two-pane blog shell. The left sidebar lists every piece
// from THOUGHTS (thoughts-data.js); the right pane shows either the About
// panel (default landing view) or a full article, routed by the URL hash
// so each piece stays a shareable, back-button-friendly link
// (thoughts.html#slug).
(function () {
  const toc = document.getElementById('blogToc');
  if (!toc || typeof THOUGHTS === 'undefined') return;

  const countEl = document.getElementById('blogCount');
  const aboutView = document.getElementById('blogAbout');
  const articleView = document.getElementById('blogArticle');
  const articleTag = document.getElementById('articleTag');
  const articleDate = document.getElementById('articleDate');
  const articleReadTime = document.getElementById('articleReadTime');
  const articleTitle = document.getElementById('articleTitle');
  const articleLead = document.getElementById('articleLead');
  const articleBody = document.getElementById('articleBody');
  const latestLink = document.getElementById('blogLatestLink');
  const homeLinks = document.querySelectorAll('.blog-sidebar-brand, .blog-byline-name');
  const shareFacebook = document.getElementById('shareFacebook');
  const shareX = document.getElementById('shareX');
  const shareLinkedIn = document.getElementById('shareLinkedIn');

  const bySlug = new Map(THOUGHTS.map((thought) => [thought.slug, thought]));
  const baseTitle = document.title;
  const READ_WPM = 200;

  function estimateReadMinutes(html) {
    const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / READ_WPM));
  }

  function renderTocItem(thought, index) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'blog-toc-item';
    item.dataset.slug = thought.slug;
    item.innerHTML = `
      <span class="toc-index">${String(index + 1).padStart(2, '0')}</span>
      <span class="toc-meta">
        <span class="toc-title">${thought.title}</span>
        <span class="toc-sub">${thought.date} · ${estimateReadMinutes(thought.body)} min</span>
      </span>
    `;
    item.addEventListener('click', () => { location.hash = thought.slug; });
    return item;
  }

  function renderToc() {
    toc.replaceChildren(...THOUGHTS.map(renderTocItem));
    countEl.textContent = `${THOUGHTS.length} Essay${THOUGHTS.length === 1 ? '' : 's'}`;
  }

  function setActiveToc(slug) {
    toc.querySelectorAll('.blog-toc-item').forEach((item) => {
      const active = item.dataset.slug === slug;
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  function renderArticle(thought) {
    articleTag.textContent = thought.category;
    articleDate.textContent = thought.date;
    articleReadTime.textContent = `${estimateReadMinutes(thought.body)} min read`;
    articleTitle.textContent = thought.title;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = thought.body.trim();
    const lead = wrapper.querySelector('p');
    lead?.remove();

    const leadNodes = [];
    if (thought.note) {
      const note = document.createElement('p');
      note.className = 'thought-note';
      note.innerHTML = `<em>${thought.note}</em>`;
      leadNodes.push(note);
    }
    if (lead) leadNodes.push(lead);
    articleLead.replaceChildren(...leadNodes);

    articleBody.replaceChildren(...wrapper.childNodes);
    if (thought.refs?.length) {
      articleBody.insertAdjacentHTML(
        'beforeend',
        `<div class="thought-refs">${thought.refs.map((ref) => `<span>${ref}</span>`).join('')}</div>`
      );
    }

    const shareUrl = `${location.origin}${location.pathname}#${thought.slug}`;
    if (shareFacebook) shareFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    if (shareX) shareX.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(thought.title)}`;
    if (shareLinkedIn) shareLinkedIn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  }

  function showAbout() {
    setActiveToc(null);
    aboutView.hidden = false;
    articleView.hidden = true;
    document.title = baseTitle;
  }

  function showArticle(thought) {
    renderArticle(thought);
    setActiveToc(thought.slug);
    aboutView.hidden = true;
    articleView.hidden = false;
    window.scrollTo(0, 0);
    document.title = `${thought.title} — Hanisha Pulimaddi`;
  }

  function route() {
    const slug = decodeURIComponent(location.hash.slice(1));
    const thought = bySlug.get(slug);
    thought ? showArticle(thought) : showAbout();
  }

  if (latestLink && THOUGHTS.length) latestLink.href = `#${THOUGHTS[0].slug}`;

  // Plain <a href="thoughts.html">, so a normal click stays a same-document
  // hash change instead of a full reload; modified clicks (new tab, etc.)
  // fall through to default browser behavior.
  homeLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (location.hash) location.hash = '';
      else route();
    });
  });

  renderToc();
  window.addEventListener('hashchange', route);
  route();
})();
