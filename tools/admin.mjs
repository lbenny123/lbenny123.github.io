import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const postsDir = path.join(root, "source/_posts");
const host = "127.0.0.1";
const port = Number(process.env.BLOG_ADMIN_PORT || 4001);

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "post"
  );
}

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function nowDateTime(date = today()) {
  const current = new Date();
  const hh = String(current.getHours()).padStart(2, "0");
  const mm = String(current.getMinutes()).padStart(2, "0");
  const ss = String(current.getSeconds()).padStart(2, "0");
  return `${date} ${hh}:${mm}:${ss}`;
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ""));
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function uniquePostPath(date, title) {
  const base = `${date}-${slugify(title)}`;
  let filePath = path.join(postsDir, `${base}.md`);
  let index = 2;
  while (await fileExists(filePath)) {
    filePath = path.join(postsDir, `${base}-${index}.md`);
    index += 1;
  }
  return filePath;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const front = match[1];
  const categories = front
    .match(/^categories:\s*(.+)$/m)?.[1]
    ?.trim()
    .replace(/^["']|["']$/g, "");
  const inlineTags = front.match(/^tags:\s*\[(.*?)\]\s*$/m)?.[1];
  const blockTags = [...front.matchAll(/^\s*-\s*(.+)$/gm)].map((item) =>
    item[1].replace(/^["']|["']$/g, "").trim(),
  );
  const tags = inlineTags
    ? inlineTags
        .split(",")
        .map((tag) => tag.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean)
    : blockTags;
  return { categories, tags };
}

async function readOptions() {
  await fs.mkdir(postsDir, { recursive: true });
  const files = (await fs.readdir(postsDir)).filter((file) => file.endsWith(".md"));
  const categories = new Set(["thought-corner", "tech-notes"]);
  const tags = new Set();
  for (const file of files) {
    const front = parseFrontmatter(await fs.readFile(path.join(postsDir, file), "utf8"));
    if (front.categories) categories.add(front.categories.replace(/_/g, "-"));
    for (const tag of front.tags || []) tags.add(tag);
  }
  return {
    categories: [...categories].sort(),
    tags: [...tags].sort((a, b) => a.localeCompare(b, "zh-CN")),
  };
}

function renderMarkdown({ title, subtitle, date, category, tags, content }) {
  const cleanTags = tags.map((tag) => tag.trim()).filter(Boolean);
  return [
    "---",
    `title: ${yamlString(title)}`,
    ...(subtitle ? [`subtitle: ${yamlString(subtitle)}`] : []),
    `date: ${nowDateTime(date)}`,
    `categories: ${yamlString(category || "thought-corner")}`,
    "tags:",
    ...cleanTags.map((tag) => `  - ${yamlString(tag)}`),
    "---",
    "",
    content.trim(),
    "",
  ].join("\n");
}

async function savePost(payload) {
  const title = String(payload.title || "").trim();
  if (!title) throw new Error("标题不能为空。");
  const subtitle = String(payload.subtitle || "").trim();
  const date = String(payload.date || today()).slice(0, 10);
  const category = String(payload.category || "thought-corner").trim().replace(/_/g, "-");
  const tags = String(payload.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const content = String(payload.content || "");

  let filePath;
  if (payload.file) {
    filePath = path.resolve(root, payload.file);
    if (!filePath.startsWith(postsDir + path.sep)) throw new Error("文章路径不在 source/_posts。");
  } else {
    filePath = await uniquePostPath(date, title);
  }

  await fs.mkdir(postsDir, { recursive: true });
  await fs.writeFile(filePath, renderMarkdown({ title, subtitle, date, category, tags, content }));
  return path.relative(root, filePath);
}

function runPublish(title) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["tools/publish.mjs"], {
      cwd: root,
      env: { ...process.env, BLOG_POST_TITLE: title || "blog source" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(output || `publish failed with code ${code}`));
    });
  });
}

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "content-type": `${type}; charset=utf-8` });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

function htmlPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Blog Writer</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f6f7fb; color: #1f2633; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans SC", sans-serif; }
    main { width: min(980px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 42px; }
    header { display: flex; justify-content: space-between; align-items: end; gap: 16px; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 30px; }
    p { color: #697383; line-height: 1.7; }
    label { display: block; margin: 14px 0 7px; font-weight: 700; }
    input, textarea { width: 100%; border: 1px solid #d8dee9; border-radius: 8px; background: #fff; color: #1f2633; font: inherit; }
    input { height: 42px; padding: 0 12px; }
    textarea { min-height: 420px; padding: 14px; line-height: 1.8; resize: vertical; }
    .grid { display: grid; grid-template-columns: 1fr 180px; gap: 14px; }
    .panel { background: rgba(255,255,255,.78); border: 1px solid #e3e8f0; border-radius: 8px; padding: 18px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    button, .chip { border: 1px solid #d8dee9; border-radius: 999px; background: #fff; color: #244e7a; cursor: pointer; font: inherit; font-weight: 700; }
    button { min-height: 40px; padding: 0 16px; }
    button.primary { background: #1f2633; border-color: #1f2633; color: white; }
    button:disabled { opacity: .58; cursor: wait; }
    .chip { min-height: 30px; padding: 5px 10px; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
    #status { white-space: pre-wrap; min-height: 28px; margin-top: 14px; color: #526071; }
    .hint { margin: 6px 0 0; font-size: 13px; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } header { align-items: start; flex-direction: column; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Blog Writer</h1>
        <p>写完保存，确认后发布到 <strong>lbenny123.github.io</strong>。</p>
      </div>
      <button id="reload" type="button">刷新选项</button>
    </header>
    <section class="panel">
      <div class="grid">
        <div>
          <label for="title">标题</label>
          <input id="title" placeholder="比如：今天想留下的一点东西">
        </div>
        <div>
          <label for="date">日期</label>
          <input id="date" type="date">
        </div>
      </div>
      <label for="subtitle">副标题</label>
      <input id="subtitle" placeholder="可选，比如：当死亡不再只是死因，而成为每个人最后的世界">

      <label for="category">分类</label>
      <input id="category" list="category-list" value="thought-corner">
      <datalist id="category-list"></datalist>
      <div id="categories" class="chips"></div>
      <p class="hint">可以点已有分类，也可以直接输入新分类，比如 <code>reading-notes</code>。</p>

      <label for="tags">标签</label>
      <input id="tags" placeholder="电影, WALL·E, 自由生活">
      <div id="tag-buttons" class="chips"></div>

      <label for="content">正文 Markdown</label>
      <textarea id="content" placeholder="从这里开始写。Markdown、中文段落、图片链接都可以。"></textarea>

      <div class="actions">
        <button id="save" type="button">保存草稿</button>
        <button id="publish" class="primary" type="button">发布上线</button>
        <button id="clear" type="button">清空当前草稿</button>
      </div>
      <div id="status"></div>
    </section>
  </main>
  <script>
    let currentFile = "";
    const draftKey = "lbenny-blog-writer-draft";
    const fieldIds = ["title", "subtitle", "date", "category", "tags", "content"];
    const $ = (id) => document.getElementById(id);
    $("date").value = new Date().toISOString().slice(0, 10);

    function setStatus(text) { $("status").textContent = text; }
    function formPayload() {
      return {
        file: currentFile,
        title: $("title").value,
        subtitle: $("subtitle").value,
        date: $("date").value,
        category: $("category").value,
        tags: $("tags").value,
        content: $("content").value
      };
    }
    function saveBrowserDraft() {
      localStorage.setItem(draftKey, JSON.stringify(formPayload()));
    }
    function restoreBrowserDraft() {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      let draft;
      try {
        draft = JSON.parse(raw);
      } catch {
        localStorage.removeItem(draftKey);
        return;
      }
      currentFile = draft.file || "";
      for (const id of fieldIds) {
        if (draft[id] !== undefined) $(id).value = draft[id];
      }
      setStatus("已恢复浏览器暂存草稿。");
    }
    function tagsArray() {
      return $("tags").value.split(",").map((tag) => tag.trim()).filter(Boolean);
    }
    function setTags(tags) {
      $("tags").value = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].join(", ");
    }
    async function loadOptions() {
      const res = await fetch("/api/options");
      const data = await res.json();
      $("category-list").innerHTML = data.categories.map((item) => '<option value="' + item + '"></option>').join("");
      $("categories").innerHTML = data.categories.map((item) => '<button class="chip" type="button" data-category="' + item + '">' + item + '</button>').join("");
      $("tag-buttons").innerHTML = data.tags.map((item) => '<button class="chip" type="button" data-tag="' + item + '">#' + item + '</button>').join("");
    }
    async function save() {
      const payload = formPayload();
      const res = await fetch("/api/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      currentFile = data.file;
      saveBrowserDraft();
      setStatus("已保存：" + data.file);
      await loadOptions();
      return data;
    }
    $("categories").addEventListener("click", (event) => {
      const category = event.target.dataset.category;
      if (category) {
        $("category").value = category;
        saveBrowserDraft();
      }
    });
    $("tag-buttons").addEventListener("click", (event) => {
      const tag = event.target.dataset.tag;
      if (tag) {
        setTags([...tagsArray(), tag]);
        saveBrowserDraft();
      }
    });
    for (const id of fieldIds) $(id).addEventListener("input", saveBrowserDraft);
    $("reload").addEventListener("click", loadOptions);
    $("clear").addEventListener("click", () => {
      if (!confirm("确认清空当前页面里的草稿？已经保存成 Markdown 的文件不会被删除。")) return;
      currentFile = "";
      for (const id of fieldIds) $(id).value = "";
      $("date").value = new Date().toISOString().slice(0, 10);
      $("category").value = "thought-corner";
      localStorage.removeItem(draftKey);
      setStatus("已清空当前页面草稿。");
    });
    $("save").addEventListener("click", async () => {
      try {
        $("save").disabled = true;
        await save();
      } catch (error) {
        setStatus(error.message);
      } finally {
        $("save").disabled = false;
      }
    });
    $("publish").addEventListener("click", async () => {
      if (!confirm("确认发布到公网博客？")) return;
      try {
        $("save").disabled = true;
        $("publish").disabled = true;
        const saved = await save();
        setStatus("正在发布，请等终端完成部署...\\n" + saved.file);
        const res = await fetch("/api/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: $("title").value }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "发布失败");
        setStatus("发布完成。\\n\\n" + data.output);
      } catch (error) {
        setStatus(error.message);
      } finally {
        $("save").disabled = false;
        $("publish").disabled = false;
      }
    });
    restoreBrowserDraft();
    loadOptions().catch((error) => setStatus(error.message));
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${host}:${port}`);
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/admin")) {
      send(res, 200, htmlPage(), "text/html");
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/options") {
      send(res, 200, await readOptions());
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/save") {
      const file = await savePost(await readJson(req));
      send(res, 200, { ok: true, file });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/publish") {
      const payload = await readJson(req);
      const output = await runPublish(String(payload.title || "blog source"));
      send(res, 200, { ok: true, output });
      return;
    }
    send(res, 404, { error: "Not found" });
  } catch (error) {
    send(res, 500, { error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`Blog writer: http://${host}:${port}/admin`);
});
