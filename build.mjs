import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const posix = path.posix;

const site = {
  title: "nini's Magical Journey",
  author: "nini",
  tagline: "Documenting a journey uncertain, but free.",
  description: "电影感想、周记、技术踩坑和日常片段。把那些很小的瞬间，慢慢记下来。",
  motto: "Becoming is not my concern. Leaving traces, that's enough.",
  yearRange: "2022 - 2026",
};

const categoryMeta = {
  "thought-corner": {
    label: "Thought Corner",
    intro: "电影、观点、情绪和自由生活的慢慢成形。",
  },
  weekly: {
    label: "Weekly",
    intro: "保留生活的颗粒感，哪怕只是很小的一周。",
  },
  "tech-notes": {
    label: "Tech Notes",
    intro: "把踩过的坑写清楚，让下一次少掉一点混乱。",
  },
};

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFile(relativePath, content) {
  const filePath = path.join(root, relativePath);
  ensureDir(filePath);
  fs.writeFileSync(filePath, content);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(value = "") {
  return value
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFrontmatter(raw, filePath) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Missing frontmatter in ${filePath}`);

  const meta = {};
  for (const line of match[1].split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (value.startsWith('"') || value.startsWith("[") || value.startsWith("{")) {
      meta[key] = JSON.parse(value);
    } else {
      meta[key] = value;
    }
  }

  return { meta, content: match[2].trim() };
}

function readPosts() {
  const postsDir = path.join(root, "src/posts");
  return fs
    .readdirSync(postsDir)
    .filter((file) => file.endsWith(".html"))
    .map((file) => {
      const filePath = path.join(postsDir, file);
      const { meta, content } = parseFrontmatter(fs.readFileSync(filePath, "utf8"), filePath);
      const plain = stripHtml(content);
      const summary = meta.summary || plain.slice(0, 130);
      return {
        ...meta,
        content,
        sourceFile: file,
        summary,
        outputPath: `${meta.legacyPath}/index.html`,
        year: meta.date.slice(0, 4),
        month: meta.date.slice(5, 7),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

function rel(currentPage, targetPage) {
  const from = posix.dirname(currentPage);
  let result = posix.relative(from, targetPage);
  if (!result) result = ".";
  if (!result.startsWith(".") && !result.startsWith("/")) result = `./${result}`;
  return encodeURI(result).replace(/&/g, "&amp;");
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function pageTitle(title) {
  return title ? `${title} | ${site.title}` : site.title;
}

function formatCategory(category) {
  return categoryMeta[category]?.label ?? category;
}

function navLink(pagePath, targetPath, label, active) {
  return `<a class="${active ? "is-active" : ""}" href="${rel(pagePath, targetPath)}"${active ? ' aria-current="page"' : ""}>${label}</a>`;
}

function renderLayout({ pagePath, title, description = site.description, active = "", body, extraClass = "" }) {
  const cssHref = rel(pagePath, "css/main.css");
  const homeHref = rel(pagePath, "index.html");
  const avatarHref = rel(pagePath, "images/avatar.jpg");
  const nav = [
    navLink(pagePath, "index.html", "Home", active === "home"),
    navLink(pagePath, "archives/index.html", "Archives", active === "archives"),
    navLink(pagePath, "categories/index.html", "Categories", active === "categories"),
    navLink(pagePath, "about/index.html", "About", active === "about"),
  ].join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle(title))}</title>
  <meta name="author" content="${escapeHtml(site.author)}">
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="icon" href="${avatarHref}">
  <link rel="stylesheet" href="${cssHref}">
</head>
<body class="${extraClass}">
  <header class="site-header">
    <div class="shell header-inner">
      <a class="brand" href="${homeHref}" aria-label="${escapeHtml(site.title)}">
        <img src="${avatarHref}" alt="" width="40" height="40">
        <span>${escapeHtml(site.title)}</span>
      </a>
      <nav class="nav" aria-label="Primary navigation">
        ${nav}
      </nav>
    </div>
  </header>
  ${body}
  <footer class="site-footer">
    <div class="shell footer-inner">
      <p>&copy; ${site.yearRange} ${escapeHtml(site.title)} &middot; @${escapeHtml(site.author)}</p>
      <p>Notes, films, code, and ordinary days.</p>
    </div>
  </footer>
</body>
</html>`;
}

function renderPostRow(pagePath, post) {
  const categoryHref = rel(pagePath, `categories/${post.category}/index.html`);
  const summary = post.summary ? `<p>${escapeHtml(post.summary)}</p>` : "";
  const tags = post.tags?.length
    ? `<div class="tag-list">${post.tags
        .map((tag) => `<a class="tag" href="${rel(pagePath, `tags/${tag}/index.html`)}">#${escapeHtml(tag)}</a>`)
        .join("")}</div>`
    : "";

  return `<article class="post-row">
    <time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time>
    <div class="post-row-main">
      <h3><a href="${rel(pagePath, post.outputPath)}">${escapeHtml(post.title)}</a></h3>
      <div class="row-meta">
        <a href="${categoryHref}">${escapeHtml(formatCategory(post.category))}</a>
        ${tags}
      </div>
      ${summary}
    </div>
  </article>`;
}

function renderPostList(pagePath, posts) {
  if (!posts.length) return `<p class="empty">这里暂时还没有文章。</p>`;
  return `<div class="post-list">${posts.map((post) => renderPostRow(pagePath, post)).join("\n")}</div>`;
}

function renderHero(pagePath, posts) {
  const heroImage = rel(pagePath, "images/background.jpg");
  const categoryLinks = [...groupBy(posts, (post) => post.category).entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, categoryPosts]) => {
      return `<a class="chip" href="${rel(pagePath, `categories/${category}/index.html`)}">
        <span>${escapeHtml(formatCategory(category))}</span>
        <strong>${categoryPosts.length}</strong>
      </a>`;
    })
    .join("");

  return `<section class="hero shell">
    <div class="hero-copy">
      <p class="eyebrow">Personal notebook</p>
      <h1>${escapeHtml(site.title)}</h1>
      <p class="lead">${escapeHtml(site.description)}</p>
      <p class="motto">${escapeHtml(site.motto)}</p>
      <div class="chip-row">${categoryLinks}</div>
    </div>
    <div class="hero-media" style="background-image: url('${heroImage}')">
      <div>
        <span>${escapeHtml(posts.length)} posts migrated</span>
        <strong>${escapeHtml(site.tagline)}</strong>
      </div>
    </div>
  </section>`;
}

function renderHome(posts) {
  const pagePath = "index.html";
  const latest = posts.slice(0, 6);
  const body = `<main>
    ${renderHero(pagePath, posts)}
    <section class="section shell">
      <div class="section-head">
        <div>
          <p class="eyebrow">Latest</p>
          <h2>最近留下的痕迹</h2>
        </div>
        <a class="text-link" href="${rel(pagePath, "archives/index.html")}">查看全部归档</a>
      </div>
      ${renderPostList(pagePath, latest)}
    </section>
    <section class="section shell two-column">
      <div>
        <p class="eyebrow">Writing lanes</p>
        <h2>三条主线</h2>
        <p class="muted">旧博客里已经自然长出了三个方向：电影和观点、周记、技术坑位。新站保留这三个入口，之后可以继续往里面添内容。</p>
      </div>
      <div class="lane-list">
        ${Object.entries(categoryMeta)
          .map(([category, meta]) => {
            const count = posts.filter((post) => post.category === category).length;
            return `<a class="lane" href="${rel(pagePath, `categories/${category}/index.html`)}">
              <span>${escapeHtml(meta.label)}</span>
              <small>${escapeHtml(meta.intro)}</small>
              <strong>${count}</strong>
            </a>`;
          })
          .join("")}
      </div>
    </section>
  </main>`;

  writeFile(pagePath, renderLayout({ pagePath, active: "home", body }));
}

function renderArchivePage(pagePath, title, posts, active = "archives") {
  const body = `<main class="shell page">
    <header class="page-head">
      <p class="eyebrow">Archive</p>
      <h1>${escapeHtml(title)}</h1>
      <p>${posts.length} 篇文章，按时间倒序排列。</p>
    </header>
    ${renderPostList(pagePath, posts)}
  </main>`;

  writeFile(pagePath, renderLayout({ pagePath, title, active, body }));
}

function renderArchives(posts) {
  renderArchivePage("archives/index.html", "Archives", posts);

  const byYear = groupBy(posts, (post) => post.year);
  for (const [year, yearPosts] of byYear.entries()) {
    renderArchivePage(`archives/${year}/index.html`, year, yearPosts);
  }

  const byMonth = groupBy(posts, (post) => `${post.year}/${post.month}`);
  for (const [yearMonth, monthPosts] of byMonth.entries()) {
    const [year, month] = yearMonth.split("/");
    renderArchivePage(`archives/${year}/${month}/index.html`, `${year}-${month}`, monthPosts);
  }
}

function renderCategories(posts) {
  const pagePath = "categories/index.html";
  const categories = [...groupBy(posts, (post) => post.category).entries()].sort((a, b) =>
    formatCategory(a[0]).localeCompare(formatCategory(b[0])),
  );

  const body = `<main class="shell page">
    <header class="page-head">
      <p class="eyebrow">Categories</p>
      <h1>Categories</h1>
      <p>按写作场景归档，方便从不同心情进入。</p>
    </header>
    <div class="category-grid">
      ${categories
        .map(([category, categoryPosts]) => {
          const meta = categoryMeta[category] ?? { label: category, intro: "" };
          return `<a class="category-panel" href="${rel(pagePath, `categories/${category}/index.html`)}">
            <span>${escapeHtml(meta.label)}</span>
            <strong>${categoryPosts.length}</strong>
            <small>${escapeHtml(meta.intro)}</small>
          </a>`;
        })
        .join("")}
    </div>
  </main>`;

  writeFile(pagePath, renderLayout({ pagePath, title: "Categories", active: "categories", body }));

  for (const [category, categoryPosts] of categories) {
    const categoryPath = `categories/${category}/index.html`;
    const meta = categoryMeta[category] ?? { label: category, intro: "" };
    const categoryBody = `<main class="shell page">
      <header class="page-head">
        <p class="eyebrow">Category</p>
        <h1>${escapeHtml(meta.label)}</h1>
        <p>${escapeHtml(meta.intro)}</p>
      </header>
      ${renderPostList(categoryPath, categoryPosts)}
    </main>`;

    writeFile(categoryPath, renderLayout({ pagePath: categoryPath, title: meta.label, active: "categories", body: categoryBody }));
  }
}

function renderTags(posts) {
  const tags = [...groupBy(posts.flatMap((post) => post.tags.map((tag) => ({ tag, post }))), (item) => item.tag).entries()];
  const pagePath = "tags/index.html";

  const body = `<main class="shell page">
    <header class="page-head">
      <p class="eyebrow">Tags</p>
      <h1>Tags</h1>
      <p>从更细的小标签重新找到文章。</p>
    </header>
    <div class="tag-cloud">
      ${tags
        .map(([tag, items]) => `<a class="tag" href="${rel(pagePath, `tags/${tag}/index.html`)}">#${escapeHtml(tag)} <strong>${items.length}</strong></a>`)
        .join("")}
    </div>
  </main>`;

  writeFile(pagePath, renderLayout({ pagePath, title: "Tags", body }));

  for (const [tag, items] of tags) {
    const tagPath = `tags/${tag}/index.html`;
    const tagPosts = items.map((item) => item.post);
    const tagBody = `<main class="shell page">
      <header class="page-head">
        <p class="eyebrow">Tag</p>
        <h1>#${escapeHtml(tag)}</h1>
        <p>${tagPosts.length} 篇文章。</p>
      </header>
      ${renderPostList(tagPath, tagPosts)}
    </main>`;

    writeFile(tagPath, renderLayout({ pagePath: tagPath, title: `#${tag}`, body: tagBody }));
  }
}

function rewriteContent(post) {
  return post.content.replace(
    /<p>\s*<img[^>]+walle-oip-c\.jpg[^>]*>\s*<\/p>/i,
    `<figure class="missing-image">
      <div>原始 WALL·E 配图未保留</div>
      <figcaption>当前仓库里只剩文字内容，所以这里先保留一个说明位。</figcaption>
    </figure>`,
  );
}

function renderArticle(posts, post) {
  const pagePath = post.outputPath;
  const related = posts.filter((candidate) => candidate.category === post.category && candidate.outputPath !== post.outputPath).slice(0, 3);
  const tags = post.tags?.length
    ? `<div class="tag-list">${post.tags
        .map((tag) => `<a class="tag" href="${rel(pagePath, `tags/${tag}/index.html`)}">#${escapeHtml(tag)}</a>`)
        .join("")}</div>`
    : "";
  const relatedMarkup = related.length
    ? `<section class="related">
        <p class="eyebrow">More in ${escapeHtml(formatCategory(post.category))}</p>
        ${renderPostList(pagePath, related)}
      </section>`
    : "";

  const body = `<main class="article-shell">
    <header class="article-head">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="${rel(pagePath, "index.html")}">Home</a>
        <span>/</span>
        <a href="${rel(pagePath, `categories/${post.category}/index.html`)}">${escapeHtml(formatCategory(post.category))}</a>
      </nav>
      <h1>${escapeHtml(post.title)}</h1>
      ${post.summary ? `<p class="article-summary">${escapeHtml(post.summary)}</p>` : ""}
      <div class="article-meta">
        <time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time>
        <a href="${rel(pagePath, `categories/${post.category}/index.html`)}">${escapeHtml(formatCategory(post.category))}</a>
        ${tags}
      </div>
    </header>
    <article class="article-body">
      ${rewriteContent(post)}
    </article>
    ${relatedMarkup}
  </main>`;

  writeFile(pagePath, renderLayout({ pagePath, title: post.title, description: post.summary || site.description, body, extraClass: "article-page" }));
}

function renderAbout(posts) {
  const pagePath = "about/index.html";
  const body = `<main class="shell page about-page">
    <header class="page-head">
      <p class="eyebrow">About</p>
      <h1>关于这个小站</h1>
      <p>${escapeHtml(site.motto)}</p>
    </header>
    <section class="about-copy">
      <p>这里保留的是一些生活化的痕迹：看完一部电影后的余震，某一周没来得及展开的日记，还有把技术问题从混乱里理出来的一点点快乐。</p>
      <p>旧 Hexo 静态页面已经迁移成 ${posts.length} 篇文章源文件。之后新增内容时，只要在 <code>src/posts</code> 里加一篇带 frontmatter 的 HTML，再运行 <code>npm run build</code> 即可生成新站。</p>
    </section>
  </main>`;

  writeFile(pagePath, renderLayout({ pagePath, title: "About", active: "about", body }));
}

const css = String.raw`
:root {
  --bg: #f7f8fb;
  --paper: #ffffff;
  --ink: #1c2430;
  --muted: #677181;
  --line: #dfe5ee;
  --soft-line: #edf1f6;
  --blue: #265d96;
  --green: #1f7a68;
  --coral: #b35f42;
  --shadow: 0 18px 48px rgba(29, 43, 68, 0.12);
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background:
    linear-gradient(180deg, rgba(38, 93, 150, 0.08), transparent 360px),
    linear-gradient(135deg, #fbfcfe 0%, #f4f6f1 48%, #f8fbff 100%);
  color: var(--ink);
  font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
  letter-spacing: 0;
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  max-width: 100%;
}

.shell {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(247, 248, 251, 0.88);
  border-bottom: 1px solid rgba(223, 229, 238, 0.86);
  backdrop-filter: blur(18px);
}

.header-inner {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.brand {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 12px;
  font-weight: 800;
}

.brand img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--line);
}

.brand span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  color: var(--muted);
  font-size: 14px;
}

.nav a {
  padding: 8px 10px;
  border-radius: 999px;
}

.nav a:hover,
.nav a.is-active {
  background: var(--ink);
  color: #fff;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 460px);
  gap: 32px;
  align-items: stretch;
  padding: 48px 0 32px;
}

.hero-copy {
  padding: 16px 0;
}

.eyebrow {
  margin: 0 0 10px;
  color: var(--blue);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  overflow-wrap: anywhere;
}

.hero h1,
.page-head h1,
.article-head h1 {
  margin: 0;
  line-height: 1.08;
  font-weight: 900;
}

.hero h1 {
  max-width: 720px;
  font-size: 44px;
}

.lead {
  max-width: 680px;
  margin: 18px 0 0;
  color: #3f4b59;
  font-size: 18px;
  line-height: 1.75;
}

.motto {
  max-width: 680px;
  margin: 12px 0 0;
  color: var(--muted);
  line-height: 1.7;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 8px 13px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--ink);
}

.chip strong {
  color: var(--green);
}

.hero-media {
  min-height: 340px;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background-color: #cfd6df;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  box-shadow: var(--shadow);
}

.hero-media::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 0%, rgba(10, 18, 28, 0.7) 100%);
}

.hero-media > div {
  position: absolute;
  z-index: 1;
  left: 22px;
  right: 22px;
  bottom: 22px;
  color: #fff;
}

.hero-media span {
  display: block;
  font-size: 13px;
  opacity: 0.82;
}

.hero-media strong {
  display: block;
  margin-top: 6px;
  font-size: 20px;
  line-height: 1.35;
}

.section {
  padding: 34px 0;
}

.section-head,
.footer-inner {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.section-head h2,
.page-head h1 {
  margin: 0;
  font-size: 32px;
}

.text-link {
  color: var(--blue);
  font-weight: 800;
}

.post-list {
  border-top: 1px solid var(--line);
}

.post-row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 24px;
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
}

.post-row time {
  color: var(--muted);
  font-size: 14px;
}

.post-row h3 {
  margin: 0;
  font-size: 21px;
  line-height: 1.35;
}

.post-row h3 a:hover {
  color: var(--blue);
}

.post-row p {
  margin: 9px 0 0;
  color: #465160;
  line-height: 1.8;
}

.row-meta,
.article-meta,
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.row-meta {
  margin-top: 8px;
  color: var(--muted);
  font-size: 14px;
}

.tag,
.row-meta > a,
.article-meta > a {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 9px;
  border: 1px solid var(--soft-line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--blue);
  font-size: 13px;
  font-weight: 700;
}

.two-column {
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(280px, 1fr);
  gap: 34px;
  align-items: start;
}

.muted {
  color: var(--muted);
  line-height: 1.8;
}

.lane-list {
  display: grid;
  gap: 12px;
}

.lane,
.category-panel {
  display: grid;
  gap: 6px;
  padding: 16px 0;
  border-top: 1px solid var(--line);
}

.lane span,
.category-panel span {
  font-size: 20px;
  font-weight: 900;
}

.lane small,
.category-panel small {
  color: var(--muted);
  line-height: 1.6;
}

.lane strong,
.category-panel strong {
  color: var(--coral);
}

.page {
  padding: 44px 0 70px;
}

.page-head {
  max-width: 780px;
  margin-bottom: 30px;
}

.page-head p {
  color: var(--muted);
  font-size: 17px;
  line-height: 1.8;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

.category-panel {
  min-height: 160px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.74);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.article-shell {
  width: min(880px, calc(100% - 40px));
  margin: 0 auto;
  padding: 42px 0 70px;
}

.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--muted);
  font-size: 14px;
}

.breadcrumbs a:hover {
  color: var(--blue);
}

.article-head {
  padding-bottom: 28px;
  border-bottom: 1px solid var(--line);
}

.article-head h1 {
  margin-top: 16px;
  font-size: 38px;
}

.article-summary {
  margin: 14px 0 0;
  color: #465160;
  font-size: 17px;
  line-height: 1.8;
}

.article-meta {
  margin-top: 18px;
  color: var(--muted);
}

.article-body {
  padding-top: 28px;
  font-size: 17px;
  line-height: 1.95;
}

.article-body h1,
.article-body h2,
.article-body h3,
.article-body h4,
.article-body h5 {
  margin: 30px 0 10px;
  line-height: 1.35;
}

.article-body h1 {
  font-size: 28px;
}

.article-body h2 {
  font-size: 24px;
}

.article-body h3 {
  font-size: 21px;
}

.article-body p {
  margin: 14px 0;
}

.article-body blockquote {
  margin: 20px 0;
  padding-left: 18px;
  border-left: 4px solid var(--green);
  color: #354052;
}

.article-body ul,
.article-body ol {
  padding-left: 24px;
}

.article-body code {
  padding: 2px 6px;
  border-radius: 6px;
  background: #eef3f8;
  color: #203042;
}

.article-body img {
  display: block;
  width: 100%;
  max-height: 520px;
  object-fit: cover;
  margin: 22px 0;
  border-radius: 8px;
  border: 1px solid var(--line);
}

.missing-image {
  margin: 22px 0;
  padding: 22px;
  border: 1px dashed #c8d1dd;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
}

.missing-image div {
  font-weight: 900;
}

.missing-image figcaption {
  margin-top: 6px;
  color: var(--muted);
  font-size: 14px;
}

.related {
  margin-top: 46px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}

.about-copy {
  max-width: 780px;
  font-size: 17px;
  line-height: 1.9;
}

.about-copy code {
  padding: 2px 6px;
  border-radius: 6px;
  background: #eef3f8;
}

.empty {
  color: var(--muted);
}

.site-footer {
  border-top: 1px solid var(--line);
  color: var(--muted);
}

.footer-inner {
  min-height: 92px;
  font-size: 14px;
}

.footer-inner p {
  margin: 0;
}

@media (max-width: 900px) {
  .header-inner,
  .section-head,
  .footer-inner {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero,
  .two-column,
  .category-grid {
    grid-template-columns: 1fr;
  }

  .hero h1 {
    font-size: 36px;
  }

  .hero-media {
    min-height: 280px;
  }

  .post-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}

@media (max-width: 560px) {
  .shell,
  .article-shell {
    width: min(100% - 28px, 1120px);
  }

  .nav {
    justify-content: flex-start;
  }

  .hero {
    padding-top: 32px;
  }

  .hero h1 {
    font-size: 31px;
  }

  .lead,
  .article-body,
  .about-copy {
    font-size: 16px;
  }

  .page-head h1,
  .section-head h2,
  .article-head h1 {
    font-size: 29px;
  }
}
`;

function build() {
  const posts = readPosts();
  renderHome(posts);
  renderArchives(posts);
  renderCategories(posts);
  renderTags(posts);
  renderAbout(posts);
  for (const post of posts) renderArticle(posts, post);
  writeFile("css/main.css", css);
  writeFile(".nojekyll", "");
  console.log(`Built ${posts.length} posts and site indexes.`);
}

build();
