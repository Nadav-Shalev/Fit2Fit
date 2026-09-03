import { describe, expect, it } from 'vitest';
import { hasPlayableVideo, parseVideoSource } from './video';

describe('parseVideoSource', () => {
  it('returns null for nothing to play', () => {
    expect(parseVideoSource(undefined)).toBeNull();
    expect(parseVideoSource(null)).toBeNull();
    expect(parseVideoSource('')).toBeNull();
    expect(parseVideoSource('   ')).toBeNull();
  });

  it('rejects anything that is not a URL', () => {
    expect(parseVideoSource('not a link')).toBeNull();
    expect(parseVideoSource('youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });

  it('refuses schemes other than http and https', () => {
    expect(parseVideoSource('javascript:alert(1)')).toBeNull();
    expect(parseVideoSource('data:text/html,<script></script>')).toBeNull();
    expect(parseVideoSource('file:///C:/clip.mp4')).toBeNull();
  });

  it('embeds a YouTube watch link without cookies', () => {
    const source = parseVideoSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(source).toEqual({
      kind: 'youtube',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
  });

  it('recognises the short, shorts and embed forms of a YouTube link', () => {
    for (const url of [
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
    ]) {
      expect(parseVideoSource(url)?.embedUrl).toBe(
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      );
    }
  });

  it('treats a YouTube search as an external link, not a video', () => {
    // This is exactly what the demo data ships, so it must not become an embed.
    const source = parseVideoSource('https://www.youtube.com/results?search_query=push+up+form');
    expect(source?.kind).toBe('external');
    expect(source?.embedUrl).toBeUndefined();
  });

  it('embeds a Vimeo link through its player', () => {
    expect(parseVideoSource('https://vimeo.com/76979871')?.embedUrl).toBe(
      'https://player.vimeo.com/video/76979871',
    );
    expect(parseVideoSource('https://player.vimeo.com/video/76979871')?.embedUrl).toBe(
      'https://player.vimeo.com/video/76979871',
    );
  });

  it('plays a direct video file inline', () => {
    const source = parseVideoSource('https://example.com/clips/squat.mp4');
    expect(source?.kind).toBe('file');
    expect(source?.embedUrl).toBe('https://example.com/clips/squat.mp4');
  });

  it('offers any other valid link for opening externally', () => {
    const source = parseVideoSource('https://example.com/how-to-squat');
    expect(source?.kind).toBe('external');
    expect(source?.embedUrl).toBeUndefined();
  });

  it('trims surrounding whitespace before parsing', () => {
    expect(parseVideoSource('  https://vimeo.com/76979871  ')?.kind).toBe('vimeo');
  });

  it('hasPlayableVideo answers the same question', () => {
    expect(hasPlayableVideo('https://vimeo.com/76979871')).toBe(true);
    expect(hasPlayableVideo('nonsense')).toBe(false);
    expect(hasPlayableVideo(undefined)).toBe(false);
  });
});
