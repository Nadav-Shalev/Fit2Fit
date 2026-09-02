import { Badge, Sheet } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { WeightUnit } from '@/models/settings';
import { formatRange, formatWeight } from '@/utils/format';
import { hasPlayableVideo } from '@/utils/video';
import { ExerciseVideo } from './ExerciseVideo';
import type { ExerciseDetails } from './exerciseDetails';

interface ExerciseDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  details: ExerciseDetails | null;
  weightUnit: WeightUnit;
}

/** One label/value row of the target table. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line flex items-baseline justify-between gap-3 border-b py-2 last:border-0">
      <span className="text-muted text-sm">{label}</span>
      <span dir="ltr" className="font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

/**
 * What an exercise asks for: its targets, its rest, its instructions and, when
 * one is available, its demonstration video.
 */
export function ExerciseDetailsSheet({
  open,
  onClose,
  details,
  weightUnit,
}: ExerciseDetailsSheetProps) {
  const { t } = useTranslation();
  if (!details) return null;

  const rows: Array<{ label: string; value: string }> = [
    { label: t('exercise.sets'), value: String(details.sets) },
  ];

  if (details.isTimed && details.durationSeconds !== undefined) {
    rows.push({
      label: t('exercise.duration'),
      value: `${details.durationSeconds} ${t('units.sec')}`,
    });
  } else if (details.reps) {
    rows.push({ label: t('exercise.reps'), value: formatRange(details.reps) });
  }

  if (details.isWeighted && details.targetWeightKg !== undefined) {
    rows.push({
      label: t('exercise.targetWeight'),
      value: formatWeight(details.targetWeightKg, weightUnit, t),
    });
  }

  if (details.rir) {
    rows.push({ label: t('exercise.rir'), value: formatRange(details.rir) });
  }

  rows.push({
    label: t('exercise.rest'),
    value: `${details.restSeconds} ${t('units.sec')}`,
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={details.name}
      description={details.secondaryName}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {details.category ? (
          <div>
            <Badge tone="primary">{t(`muscle.${details.category}`)}</Badge>
          </div>
        ) : null}

        <div>
          <h3 className="mb-1 font-bold">{t('exercise.plannedTargets')}</h3>
          {rows.map((row) => (
            <DetailRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>

        {details.notes ? (
          <div>
            <h3 className="mb-1 font-bold">{t('exercise.instructions')}</h3>
            <p className="text-muted whitespace-pre-line text-sm">{details.notes}</p>
          </div>
        ) : null}

        {/* An unusable link is treated exactly like a missing one. */}
        {hasPlayableVideo(details.videoUrl) ? (
          <ExerciseVideo url={details.videoUrl} />
        ) : (
          <p className="text-muted text-sm">{t('exercise.noVideo')}</p>
        )}
      </div>
    </Sheet>
  );
}
