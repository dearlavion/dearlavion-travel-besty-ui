// Recognizes the handful of YouTube URL shapes an admin is likely to paste in
// (watch?v=, youtu.be/, shorts/) and pulls out the 11-character video id. Anything else — a
// TikTok/Instagram/Vimeo link, or a malformed YouTube-looking one — returns null, which the
// product detail page treats as "render a watch-elsewhere card" instead of an inline embed.
const YOUTUBE_ID_PATTERN = /^[\w-]{11}$/;

export function parseYouTubeId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1);
    return YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v') ?? '';
      return YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([\w-]{11})$/);
    if (shortsMatch) return shortsMatch[1];
  }

  return null;
}
