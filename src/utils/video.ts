/**
 * Recognises the instructional-video links people paste onto an exercise.
 *
 * The point is to decide up front whether a link can be played, so the UI can
 * offer a player, a plain external link, or nothing at all — rather than
 * rendering an embed that turns out to be a dead grey rectangle.
 */

export type VideoKind = 'youtube' | 'vimeo' | 'file' | 'external';

export interface VideoSource {
  kind: VideoKind;
  /** The original link, always safe to open in a new tab. */
  url: string;
  /** Present only when the video can be embedded in the page. */
  embedUrl?: string;
}

const YOUTUBE_ID = /^[\w-]{11}$/;
const VIMEO_ID = /^\d+$/;
const FILE_EXTENSION = /\.(mp4|webm|ogg|ogv|mov)$/i;

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1);
    return YOUTUBE_ID.test(id) ? id : null;
  }

  if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'youtube-nocookie.com') {
    return null;
  }

  const watchId = url.searchParams.get('v');
  if (watchId && YOUTUBE_ID.test(watchId)) return watchId;

  // /embed/<id>, /shorts/<id> and /live/<id> all carry the id as the last segment.
  const segments = url.pathname.split('/').filter(Boolean);
  const [prefix, id] = segments;
  if (id && (prefix === 'embed' || prefix === 'shorts' || prefix === 'live') && YOUTUBE_ID.test(id)) {
    return id;
  }

  return null;
}

function vimeoId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '');
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;

  const segments = url.pathname.split('/').filter(Boolean);
  // player.vimeo.com/video/<id> and vimeo.com/<id> both end with the numeric id.
  const id = segments[segments.length - 1];
  return id && VIMEO_ID.test(id) ? id : null;
}

/**
 * Classifies a video link, or returns `null` when there is nothing playable —
 * empty, whitespace, a non-http(s) scheme, or something that does not parse.
 */
export function parseVideoSource(raw: string | undefined | null): VideoSource | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // Anything other than http(s) — javascript:, data:, file: — is never opened.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const youtube = youtubeId(url);
  if (youtube) {
    return {
      kind: 'youtube',
      url: trimmed,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtube}`,
    };
  }

  const vimeo = vimeoId(url);
  if (vimeo) {
    return {
      kind: 'vimeo',
      url: trimmed,
      embedUrl: `https://player.vimeo.com/video/${vimeo}`,
    };
  }

  if (FILE_EXTENSION.test(url.pathname)) {
    return { kind: 'file', url: trimmed, embedUrl: trimmed };
  }

  // A valid link to something we cannot embed: offer to open it instead.
  return { kind: 'external', url: trimmed };
}

/** Whether an exercise has a link worth showing a video action for. */
export function hasPlayableVideo(raw: string | undefined | null): boolean {
  return parseVideoSource(raw) !== null;
}
