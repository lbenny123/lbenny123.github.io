# benny's Magic journey

This branch stores the Hexo source for the blog.

The live site is published from the `master` branch:

```text
https://lbenny123.github.io/
```

## First Setup

```bash
cd /Users/luobeini/lbenny123.github.io
npm install
```

## Write In The Local Web Editor

Double-click this file in Finder:

```text
启动博客写作页.command
```

Or run:

```bash
cd /Users/luobeini/lbenny123.github.io
npm run admin
```

Open:

```text
http://127.0.0.1:4001/admin
```

You can write the post title, subtitle, date, category, tags, and Markdown body there.
Click `保存草稿` to save a Markdown file under `source/_posts`.
Click `发布上线` to commit the source branch and deploy the generated site.
The editor also keeps a browser autosave draft, so refreshing the page restores
what was in the form. Use `清空当前草稿` when you want to start over.
Saved Markdown files appear in `草稿箱`; click `打开` to load one back into the
editor.

Categories can be clicked or typed. Tags support comma-separated input, for
example:

```text
电影, WALL·E, 自由生活
```

## Edit Or Delete Posts

All posts live in:

```text
source/_posts/
```

A normal post starts like this:

```markdown
---
title: "主标题"
subtitle: "副标题，可留空"
date: 2026-07-27 20:30:00
categories: thought-corner
tags:
  - 电影
  - 自由生活
---

正文从这里开始写 Markdown。
```

Markdown is rendered by Hexo when you preview or publish the blog. The local
web editor is only a writing box, so Markdown markers stay visible while you
are typing.

To edit an old post, edit the matching `.md` file, then run:

```bash
npm run publish
```

To delete a post, delete its `.md` file from `source/_posts/`, then run:

```bash
npm run publish
```

## Preview The Blog

In another terminal:

```bash
cd /Users/luobeini/lbenny123.github.io
npm run preview
```

Open:

```text
http://localhost:4000/
```

## Manual Publish

```bash
cd /Users/luobeini/lbenny123.github.io
npm run publish
```

This commits source changes, pushes the `source` branch, generates the site, and
deploys it to `master`.
