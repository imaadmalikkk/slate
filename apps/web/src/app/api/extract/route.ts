import { NextRequest, NextResponse } from "next/server";
import { Defuddle } from "defuddle/node";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";
import type { ArticleContent } from "@/lib/types";
import { isTwitterUrl, extractTwitterContent } from "@/lib/twitter";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Twitter/X: bypass Defuddle and use FxTwitter API
    if (isTwitterUrl(parsedUrl.toString())) {
      try {
        const article = await extractTwitterContent(parsedUrl.toString());
        return NextResponse.json(article);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to extract tweet";
        return NextResponse.json({ error: message }, { status: 422 });
      }
    }

    // Fetch the page
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 502 }
      );
    }

    const html = await response.text();

    if (!html || html.trim().length === 0) {
      return NextResponse.json(
        { error: "Empty page content" },
        { status: 422 }
      );
    }

    // Extract with Defuddle
    const result = await Defuddle(html, parsedUrl.toString());

    if (!result || !result.content) {
      return NextResponse.json(
        { error: "Could not extract content from this page" },
        { status: 422 }
      );
    }

    // Sanitize HTML content server-side
    const purifyWindow = new JSDOM("").window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const purify = DOMPurify(purifyWindow as any);
    const sanitizedContent = purify.sanitize(result.content, {
      ADD_TAGS: ["figure", "figcaption", "picture", "source"],
      ADD_ATTR: ["loading", "decoding", "srcset", "sizes"],
    });

    // Count words from the text content (strip HTML tags)
    const textContent = sanitizedContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 238));

    const article: ArticleContent = {
      url: parsedUrl.toString(),
      title: result.title || "Untitled",
      author: result.author || null,
      date: result.published || null,
      siteName: result.site || null,
      excerpt: result.description || null,
      content: sanitizedContent,
      wordCount,
      readingTime,
    };

    return NextResponse.json(article);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Request timed out — the page took too long to load" },
        { status: 504 }
      );
    }

    console.error("Extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract content" },
      { status: 500 }
    );
  }
}
