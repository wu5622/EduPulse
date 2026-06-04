const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
  /(?:youtu\.be\/)([^?\s]+)/,
  /(?:youtube\.com\/embed\/)([^?\s]+)/,
];

export function extractYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function toYouTubeEmbedUrl(videoId: string, autoplay: boolean): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    ...(autoplay ? { autoplay: "1" } : {}),
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}
