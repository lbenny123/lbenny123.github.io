(() => {
  const posts = [...document.querySelectorAll('[data-post]')].map(element => ({
    element,
    categories: JSON.parse(element.dataset.categories),
    tags: JSON.parse(element.dataset.tags),
    text: element.dataset.search.toLocaleLowerCase(),
  }));
  const search = document.querySelector('#search');
  let category = '';
  let tag = '';
  function filter() {
    const query = (search?.value || '').trim().toLocaleLowerCase();
    let count = 0;
    posts.forEach(post => {
      const visible = (!category || post.categories.includes(category)) &&
        (!tag || post.tags.includes(tag)) && (!query || post.text.includes(query));
      post.element.hidden = !visible;
      if (visible) count++;
    });
    document.querySelector('.empty-state').hidden = count > 0;
    document.querySelector('#result-count').textContent = count;
  }
  if (search) {
    search.addEventListener('input', filter);
    document.querySelectorAll('[data-category]').forEach(button => {
      button.addEventListener('click', () => {
        category = button.dataset.category;
        document.querySelectorAll('[data-category]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        filter();
      });
    });
    document.querySelectorAll('[data-tag]').forEach(button => {
      button.addEventListener('click', () => {
        tag = tag === button.dataset.tag ? '' : button.dataset.tag;
        document.querySelectorAll('[data-tag]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.tag === tag)));
        filter();
      });
    });
  }
  const mail = document.querySelector('.star-mail');
  if (mail) {
    const pages = [...mail.querySelectorAll('.letter-page')];
    let current = 0;
    function turn(direction) {
      current = (current + direction + pages.length) % pages.length;
      pages.forEach((page, index) => { page.hidden = index !== current; });
      mail.querySelector('.letter-count').textContent = `${current + 1} / ${pages.length}`;
      mail.querySelector('.star-letter').scrollTop = 0;
    }
    function close() {
      mail.open = false;
      mail.querySelector('summary').focus({preventScroll: true});
    }
    mail.querySelector('.letter-prev').addEventListener('click', () => turn(-1));
    mail.querySelector('.letter-next').addEventListener('click', () => turn(1));
    mail.querySelector('.letter-close').addEventListener('click', close);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && mail.open) { event.preventDefault(); close(); }
    });
    document.addEventListener('click', event => {
      if (mail.open && !mail.contains(event.target)) mail.open = false;
    });
  }
  const windowButton = document.querySelector('.window-wish');
  if (windowButton) {
    const trail = document.querySelector('.shooting-star');
    windowButton.addEventListener('click', () => {
      trail.classList.remove('crossing');
      requestAnimationFrame(() => requestAnimationFrame(() => trail.classList.add('crossing')));
    });
    trail.addEventListener('animationend', () => trail.classList.remove('crossing'));
  }
  const progress = document.querySelector('.reading-progress span');
  const body = document.querySelector('.article-body');
  if (progress && body) {
    const update = () => {
      const top = body.getBoundingClientRect().top + window.scrollY;
      const distance = body.offsetHeight - window.innerHeight;
      const fraction = distance > 0 ? (window.scrollY - top) / distance : (window.scrollY >= top ? 1 : 0);
      progress.style.width = `${Math.min(1, Math.max(0, fraction)) * 100}%`;
    };
    window.addEventListener('scroll', update, {passive: true});
    window.addEventListener('resize', update);
    update();
  }
})();
