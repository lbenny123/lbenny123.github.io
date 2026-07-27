# nini's Magical Journey

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

You can write the post title, date, category, tags, and Markdown body there.
Click `保存草稿` to save a Markdown file under `source/_posts`.
Click `发布上线` to commit the source branch and deploy the generated site.

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
