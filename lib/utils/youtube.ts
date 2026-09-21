/**
 * Extracts the 11-character YouTube video ID and returns an embeddable URL.
 */
export function getYouTubeVideoId(url?: string): string {
  if (!url) return "Wo9IFU0-qZo";
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match && match[1] ? match[1] : "Wo9IFU0-qZo";
}

export function getYouTubeEmbedUrl(url?: string, autoplay: boolean = false): string {
  const videoId = getYouTubeVideoId(url);
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0${
    autoplay ? "&autoplay=1" : ""
  }`;
}
