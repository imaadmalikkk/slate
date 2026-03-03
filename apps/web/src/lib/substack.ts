import type { ArticleContent } from "@/lib/types";

const SUBSTACK_NOTE_RE =
  /^https?:\/\/(?:www\.)?substack\.com\/@[\w.-]+\/note\/c-\d+/;

// --- URL helper ---

export function isSubstackNoteUrl(url: string): boolean {
  return SUBSTACK_NOTE_RE.test(url);
}

// --- ld+json extraction ---

interface SubstackLdJson {
  text?: string;
  author?: { name?: string };
  dateCreated?: string;
  identifier?: string;
}

function parseLdJson(html: string): SubstackLdJson | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data && typeof data.text === "string") {
        return data as SubstackLdJson;
      }
    } catch {
      // malformed JSON block — try the next one
    }
  }

  return null;
}

// --- HTML formatting ---

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function noteTextToHtml(text: string): string {
  return text
    .split(/\n+/)
    .filter((line) => line.trim().length > 0)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("\n");
}

// --- Main export ---

export async function extractSubstackNote(
  url: string
): Promise<ArticleContent> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Substack returned ${res.status}`);
  }

  const html = await res.text();
  const data = parseLdJson(html);

  if (!data?.text) {
    throw new Error("Could not extract note content from Substack page");
  }

  const content = noteTextToHtml(data.text);
  const wordCount = data.text.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 238));

  const author = data.author?.name || null;
  const title = author ? `Note by ${author}` : "Substack Note";

  return {
    url,
    title,
    author,
    date: data.dateCreated || null,
    siteName: "Substack Notes",
    excerpt: data.text.slice(0, 200),
    content,
    wordCount,
    readingTime,
  };
}
