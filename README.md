# nini's Magical Journey

This branch stores the Hexo source for the blog.

The live site is published from the `master` branch:

```text
https://lbenny123.github.io/
```

## First Setup

```bash
npm install
```

## Write In The Local Web Editor

```bash
npm run admin
```

Open:

```text
http://127.0.0.1:4001/admin
```

You can write the post title, date, category, tags, and Markdown body there.
Click `保存草稿` to save a Markdown file under `source/_posts`.
Click `发布上线` to commit the source branch and deploy the generated site.

## Preview The Blog

In another terminal:

```bash
npm run preview
```

Open:

```text
http://localhost:4000/
```

## Manual Publish

```bash
npm run publish
```

This commits source changes, pushes the `source` branch, generates the site, and
deploys it to `master`.
