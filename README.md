# Slate

A distraction-free reader for the web. Paste a URL, get a clean reading experience.

## Features

- **Article extraction** — strips ads, nav, sidebars. Just the content.
- **Twitter/X support** — renders tweets, threads, and long-form Twitter Articles with inline images.
- **Three themes** — light, dark, and sepia.
- **Reading progress** — scroll progress bar, reading time estimates, and scroll position memory.
- **Keyboard-first** — navigate paragraphs with `j`/`k`, cycle themes with `t`, adjust font size with `+`/`-`.
- **Reading history** — saved locally in your browser via IndexedDB. Nothing leaves your machine.

## Privacy

All saved articles and reading history are stored in your browser's IndexedDB. There is no database, no accounts, no server-side persistence. Your reading data stays on your device.

## Setup

```bash
git clone https://github.com/imaadmalikkk/slate.git
cd slate
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `j` / `k` | Next / previous paragraph |
| `t` | Cycle theme |
| `f` | Cycle font family |
| `+` / `-` | Increase / decrease font size |
| `w` | Cycle line width |
| `?` | Show all shortcuts |
| `Esc` | Back to home |

## Stack

- [Next.js](https://nextjs.org) with Turbopack
- [Defuddle](https://github.com/nicepkg/defuddle) for article extraction
- [FxTwitter](https://github.com/FixTweet/FxTwitter) API for Twitter/X content
- [Tailwind CSS](https://tailwindcss.com) v4
- IndexedDB for local-only storage

## License

AGPL-3.0
