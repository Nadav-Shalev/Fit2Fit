import { useState } from 'react';
import { ExternalLink, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { parseVideoSource } from '@/utils/video';

interface ExerciseVideoProps {
  url: string | undefined;
  /** Compact rendering for the focused workout screens. */
  compact?: boolean;
}

/**
 * The instructional video for an exercise.
 *
 * The link is classified before anything renders, so an empty, malformed or
 * unsupported URL produces no control at all rather than a dead player. The
 * embed is only mounted after the user asks for it, which keeps a third-party
 * iframe out of the page for everyone who never taps play.
 */
export function ExerciseVideo({ url, compact = false }: ExerciseVideoProps) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const source = parseVideoSource(url);

  if (!source) return null;

  // Nothing embeddable: opening the link is the honest option.
  if (source.kind === 'external' || !source.embedUrl) {
    return (
      <Button
        variant="secondary"
        size={compact ? 'sm' : 'md'}
        fullWidth={!compact}
        icon={<ExternalLink size={17} />}
        onClick={() => window.open(source.url, '_blank', 'noopener,noreferrer')}
      >
        {t('exercise.openVideo')}
      </Button>
    );
  }

  if (!playing) {
    return (
      <Button
        variant="secondary"
        size={compact ? 'sm' : 'md'}
        fullWidth={!compact}
        icon={<PlayCircle size={18} />}
        onClick={() => setPlaying(true)}
      >
        {t('exercise.playVideo')}
      </Button>
    );
  }

  return (
    <div className="bg-elevated aspect-video w-full overflow-hidden rounded-xl">
      {source.kind === 'file' ? (
        <video src={source.embedUrl} controls autoPlay className="h-full w-full" />
      ) : (
        <iframe
          src={`${source.embedUrl}?autoplay=1&rel=0`}
          title={t('exercise.videoTitle')}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      )}
    </div>
  );
}
