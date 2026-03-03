import type { ArticleContent } from "@/lib/types";

const TWITTER_URL_RE =
  /^https?:\/\/(?:(?:www\.)?twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/;

const MAX_THREAD_TWEETS = 50;

// --- FxTwitter types ---

interface FxMedia {
  url: string;
  type: string;
  altText?: string;
}

interface FxInlineStyle {
  offset: number;
  length: number;
  style: string; // "BOLD", "ITALIC", etc.
}

interface FxEntityRange {
  offset: number;
  length: number;
  key: number;
}

interface FxEntity {
  type: string; // "LINK", "MENTION", etc.
  data: { url?: string; screenName?: string };
}

interface FxArticleBlock {
  text: string;
  type: string; // "unstyled", "header-two", "header-three", "blockquote", "unordered-list-item", "ordered-list-item"
  depth: number;
  inlineStyleRanges: FxInlineStyle[];
  entityRanges: FxEntityRange[];
}

interface FxMediaEntity {
  media_info?: {
    __typename?: string;
    original_img_url?: string;
    original_img_width?: number;
    original_img_height?: number;
  };
}

interface FxArticle {
  title: string;
  preview_text?: string;
  cover_media?: { media_info?: { original_img_url?: string } };
  content: { blocks: FxArticleBlock[] };
  entityMap: FxEntity[] | null;
  media_entities?: FxMediaEntity[];
}

interface FxTweet {
  id: string;
  text: string;
  is_note_tweet?: boolean;
  article?: FxArticle;
  author: {
    name: string;
    screen_name: string;
    avatar_url?: string;
  };
  created_at: string;
  media?: {
    all?: FxMedia[];
  };
  quote?: FxTweet;
  replying_to_status?: string;
  replying_to?: string;
}

interface FxResponse {
  code: number;
  message: string;
  tweet?: FxTweet;
}

// --- URL helpers ---

export function isTwitterUrl(url: string): boolean {
  return TWITTER_URL_RE.test(url);
}

export function extractTweetId(url: string): string | null {
  const match = url.match(TWITTER_URL_RE);
  return match ? match[2] : null;
}

// --- FxTwitter fetching ---

async function fetchTweet(tweetId: string): Promise<FxTweet> {
  const res = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(
      `FxTwitter returned ${res.status}: tweet may be deleted or unavailable`
    );
  }

  const data: FxResponse = await res.json();

  if (!data.tweet) {
    throw new Error("Tweet not found");
  }

  return data.tweet;
}

async function fetchThread(tweetId: string): Promise<FxTweet[]> {
  const tweets: FxTweet[] = [];
  let currentId: string | undefined = tweetId;

  while (currentId && tweets.length < MAX_THREAD_TWEETS) {
    const tweet = await fetchTweet(currentId);
    tweets.unshift(tweet);

    if (
      !tweet.replying_to_status ||
      (tweet.replying_to &&
        tweet.replying_to.toLowerCase() !==
          tweet.author.screen_name.toLowerCase())
    ) {
      break;
    }

    currentId = tweet.replying_to_status;
  }

  return tweets;
}

// --- HTML formatting helpers ---

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTweetText(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/\n/g, "<br>");
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  html = html.replace(
    /@(\w+)/g,
    '<a href="https://x.com/$1" target="_blank" rel="noopener noreferrer">@$1</a>'
  );
  return html;
}

// --- Article (note tweet) rendering ---

function applyInlineStyles(
  text: string,
  styles: FxInlineStyle[],
  entities: FxEntityRange[],
  entityMap: FxEntity[] | null
): string {
  if (text.length === 0) return "";

  // Build a list of markup insertions at character offsets
  type Marker = { offset: number; order: number; tag: string };
  const markers: Marker[] = [];

  for (const style of styles) {
    const end = style.offset + style.length;
    if (style.style === "BOLD") {
      markers.push({ offset: style.offset, order: 0, tag: "<strong>" });
      markers.push({ offset: end, order: 1, tag: "</strong>" });
    } else if (style.style === "ITALIC") {
      markers.push({ offset: style.offset, order: 0, tag: "<em>" });
      markers.push({ offset: end, order: 1, tag: "</em>" });
    }
  }

  for (const er of entities) {
    const entity = entityMap?.[er.key];
    if (!entity) continue;
    const end = er.offset + er.length;
    if (entity.type === "LINK" && entity.data.url) {
      markers.push({
        offset: er.offset,
        order: 0,
        tag: `<a href="${escapeHtml(entity.data.url)}" target="_blank" rel="noopener noreferrer">`,
      });
      markers.push({ offset: end, order: 1, tag: "</a>" });
    }
  }

  // Sort: by offset ascending, then closing tags before opening tags at same offset
  markers.sort((a, b) => a.offset - b.offset || b.order - a.order);

  // Build the output by walking through the text
  let result = "";
  let cursor = 0;
  for (const m of markers) {
    if (m.offset > cursor) {
      result += escapeHtml(text.slice(cursor, m.offset));
    }
    result += m.tag;
    cursor = m.offset;
  }
  if (cursor < text.length) {
    result += escapeHtml(text.slice(cursor));
  }

  return result;
}

function renderArticleBlocks(
  blocks: FxArticleBlock[],
  entityMap: FxEntity[] | null,
  mediaEntities: FxMediaEntity[]
): string {
  const parts: string[] = [];
  let inList: "ul" | "ol" | null = null;
  let mediaIndex = 0; // consume media_entities in order for atomic blocks

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Handle list grouping
    const isList =
      block.type === "unordered-list-item" ||
      block.type === "ordered-list-item";
    const listTag = block.type === "ordered-list-item" ? "ol" : "ul";

    if (!isList && inList) {
      parts.push(`</${inList}>`);
      inList = null;
    }

    // Atomic blocks = inline images
    if (block.type === "atomic") {
      const media = mediaEntities[mediaIndex];
      mediaIndex++;
      const imgUrl = media?.media_info?.original_img_url;
      if (imgUrl) {
        parts.push(
          `<figure><img src="${escapeHtml(imgUrl)}" alt="" loading="lazy" /></figure>`
        );
      }
      continue;
    }

    const styledText = applyInlineStyles(
      block.text,
      block.inlineStyleRanges,
      block.entityRanges,
      entityMap
    );

    if (isList) {
      if (inList !== listTag) {
        if (inList) parts.push(`</${inList}>`);
        parts.push(`<${listTag}>`);
        inList = listTag;
      }
      parts.push(`<li>${styledText}</li>`);
      continue;
    }

    switch (block.type) {
      case "header-one":
        parts.push(`<h1>${styledText}</h1>`);
        break;
      case "header-two":
        parts.push(`<h2>${styledText}</h2>`);
        break;
      case "header-three":
        parts.push(`<h3>${styledText}</h3>`);
        break;
      case "blockquote":
        parts.push(`<blockquote><p>${styledText}</p></blockquote>`);
        break;
      default:
        if (block.text.trim().length === 0) {
          continue;
        }
        parts.push(`<p>${styledText}</p>`);
        break;
    }
  }

  if (inList) {
    parts.push(`</${inList}>`);
  }

  return parts.join("\n");
}

function formatArticleAsHtml(tweet: FxTweet): string {
  const article = tweet.article!;
  const parts: string[] = [];

  // Author byline
  parts.push(
    `<p><strong>${escapeHtml(tweet.author.name)}</strong> <span style="opacity:0.6">@${escapeHtml(tweet.author.screen_name)}</span> · <time>${formatTimestamp(tweet.created_at)}</time></p>`
  );

  // Cover image
  const coverUrl = article.cover_media?.media_info?.original_img_url;
  if (coverUrl) {
    parts.push(
      `<figure><img src="${escapeHtml(coverUrl)}" alt="" loading="lazy" /></figure>`
    );
  }

  // Article body
  parts.push(
    renderArticleBlocks(
      article.content.blocks,
      article.entityMap,
      article.media_entities ?? []
    )
  );

  return parts.join("\n");
}

// --- Regular tweet/thread rendering ---

function renderQuote(quote: FxTweet): string {
  return `<blockquote>
<p><strong>${escapeHtml(quote.author.name)}</strong> <span style="opacity:0.6">@${escapeHtml(quote.author.screen_name)}</span></p>
<p>${formatTweetText(quote.text)}</p>
</blockquote>`;
}

function formatTweetsAsHtml(tweets: FxTweet[], truncated: boolean): string {
  const parts = tweets.map((tweet, i) => {
    const header = `<p><strong>${escapeHtml(tweet.author.name)}</strong> <span style="opacity:0.6">@${escapeHtml(tweet.author.screen_name)}</span> · <time>${formatTimestamp(tweet.created_at)}</time></p>`;

    const body = `<p>${formatTweetText(tweet.text)}</p>`;

    const images =
      tweet.media?.all
        ?.filter((m) => m.type === "photo")
        .map(
          (m) =>
            `<figure><img src="${escapeHtml(m.url)}" alt="${escapeHtml(m.altText || "")}" loading="lazy" /></figure>`
        )
        .join("\n") ?? "";

    const quote = tweet.quote ? renderQuote(tweet.quote) : "";

    const separator = i < tweets.length - 1 ? "<hr>" : "";

    return [header, body, images, quote, separator].filter(Boolean).join("\n");
  });

  if (truncated) {
    parts.push(
      `<p><em>Thread truncated at ${MAX_THREAD_TWEETS} tweets. <a href="https://x.com/${tweets[0].author.screen_name}/status/${tweets[tweets.length - 1].id}" target="_blank" rel="noopener noreferrer">View full thread on X</a></em></p>`
    );
  }

  return parts.join("\n");
}

// --- Main export ---

export async function extractTwitterContent(
  url: string
): Promise<ArticleContent> {
  const tweetId = extractTweetId(url);
  if (!tweetId) {
    throw new Error("Could not parse tweet ID from URL");
  }

  // Fetch the target tweet first to check if it's an article
  const targetTweet = await fetchTweet(tweetId);

  // Article / note tweet — render the long-form content directly
  if (targetTweet.article) {
    const article = targetTweet.article;
    const content = formatArticleAsHtml(targetTweet);
    const textContent = article.content.blocks.map((b) => b.text).join(" ");
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 238));

    return {
      url,
      title: article.title,
      author: targetTweet.author.name,
      date: targetTweet.created_at,
      siteName: "X (Twitter)",
      excerpt: article.preview_text || targetTweet.text.slice(0, 200),
      content,
      wordCount,
      readingTime,
    };
  }

  // Regular tweet or thread — reconstruct via reply chain
  // We already have the target tweet, so start the chain from it
  const tweets: FxTweet[] = [targetTweet];

  // Walk backwards through the reply chain
  let parentId = targetTweet.replying_to_status;
  while (
    parentId &&
    tweets.length < MAX_THREAD_TWEETS &&
    targetTweet.replying_to?.toLowerCase() ===
      targetTweet.author.screen_name.toLowerCase()
  ) {
    const parent = await fetchTweet(parentId);
    tweets.unshift(parent);

    if (
      !parent.replying_to_status ||
      (parent.replying_to &&
        parent.replying_to.toLowerCase() !==
          parent.author.screen_name.toLowerCase())
    ) {
      break;
    }

    parentId = parent.replying_to_status;
  }

  const truncated = tweets.length >= MAX_THREAD_TWEETS;
  const isThread = tweets.length > 1;
  const author = tweets[0].author;

  const title = isThread
    ? `Thread by @${author.screen_name}`
    : `@${author.screen_name}: ${tweets[0].text.slice(0, 80)}${tweets[0].text.length > 80 ? "..." : ""}`;

  const content = formatTweetsAsHtml(tweets, truncated);
  const textContent = tweets.map((t) => t.text).join(" ");
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 238));

  return {
    url,
    title,
    author: author.name,
    date: tweets[0].created_at,
    siteName: "X (Twitter)",
    excerpt: tweets[0].text.slice(0, 200),
    content,
    wordCount,
    readingTime,
  };
}
