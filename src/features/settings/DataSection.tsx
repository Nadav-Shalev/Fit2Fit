import { useRef, useState } from 'react';
import { Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import { Button, Card, ConfirmDialog, SegmentedControl, Sheet } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { Fit2FitBackup } from '@/models/database';
import {
  applyImport,
  backupFileName,
  parseBackup,
  serializeBackup,
  type ImportMode,
} from '@/services/backupService';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { downloadTextFile } from './downloadFile';

interface PendingImport {
  backup: Fit2FitBackup;
  counts: { programs: number; workouts: number; runs: number };
}

/**
 * Backup and restore.
 *
 * An imported file is fully validated and previewed before anything is written,
 * so a wrong file cannot quietly destroy training history.
 */
export function DataSection() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const snapshot = useDataStore((state) => state.snapshot);
  const replaceDatabase = useDataStore((state) => state.replaceDatabase);
  const restoreDemo = useDataStore((state) => state.restoreDemo);
  const clearAll = useDataStore((state) => state.clearAll);
  const pushToast = useToastStore((state) => state.push);

  const [pending, setPending] = useState<PendingImport | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [confirmClear, setConfirmClear] = useState(false);

  const handleExport = () => {
    downloadTextFile(backupFileName(), serializeBackup(snapshot()));
    pushToast(t('backup.exported'));
  };

  const handleFile = async (file: File) => {
    let text: string;
    try {
      text = await file.text();
    } catch {
      pushToast(t('backup.readFailed'), 'error');
      return;
    }

    const result = parseBackup(text);
    if (!result.ok) {
      pushToast(t(result.error.messageKey), 'error');
      return;
    }

    setPending({
      backup: result.backup,
      counts: {
        programs: result.preview.programs,
        workouts: result.preview.workoutSessions,
        runs: result.preview.runningSessions,
      },
    });
  };

  const confirmImport = async () => {
    if (!pending) return;
    await replaceDatabase(applyImport(snapshot(), pending.backup.data, mode));
    pushToast(
      t('backup.imported', {
        programs: pending.counts.programs,
        workouts: pending.counts.workouts,
        runs: pending.counts.runs,
      }),
    );
    setPending(null);
  };

  const handleClear = async () => {
    await clearAll();
    setConfirmClear(false);
    pushToast(t('backup.cleared'), 'info');
  };

  const handleRestoreDemo = async () => {
    await restoreDemo();
    pushToast(t('backup.demoRestored'));
  };

  return (
    <>
      <Card>
        <h2 className="mb-1 font-bold">{t('settings.data')}</h2>
        <p className="text-muted mb-4 text-xs">{t('settings.storageInfo')}</p>

        <div className="flex flex-col gap-4">
          <div>
            <Button fullWidth variant="secondary" icon={<Download size={17} />} onClick={handleExport}>
              {t('settings.export')}
            </Button>
            <p className="text-muted mt-1.5 text-xs">{t('settings.exportHint')}</p>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                // Reset so re-selecting the same file fires change again.
                event.target.value = '';
              }}
            />
            <Button
              fullWidth
              variant="secondary"
              icon={<Upload size={17} />}
              onClick={() => fileInputRef.current?.click()}
            >
              {t('settings.import')}
            </Button>
            <p className="text-muted mt-1.5 text-xs">{t('settings.importHint')}</p>
          </div>

          <div>
            <Button
              fullWidth
              variant="secondary"
              icon={<RotateCcw size={17} />}
              onClick={() => void handleRestoreDemo()}
            >
              {t('settings.restoreDemo')}
            </Button>
            <p className="text-muted mt-1.5 text-xs">{t('settings.restoreDemoHint')}</p>
          </div>

          <div>
            <Button
              fullWidth
              variant="danger"
              icon={<Trash2 size={17} />}
              onClick={() => setConfirmClear(true)}
            >
              {t('settings.clearData')}
            </Button>
            <p className="text-muted mt-1.5 text-xs">{t('settings.clearDataHint')}</p>
          </div>
        </div>
      </Card>

      <Sheet
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t('settings.import')}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setPending(null)}>
              {t('common.cancel')}
            </Button>
            <Button fullWidth onClick={() => void confirmImport()}>
              {t('common.confirm')}
            </Button>
          </div>
        }
      >
        {pending ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              {t('backup.imported', {
                programs: pending.counts.programs,
                workouts: pending.counts.workouts,
                runs: pending.counts.runs,
              })}
            </p>

            <div>
              <p className="text-muted mb-2 text-sm font-medium">{t('settings.importMode')}</p>
              <SegmentedControl
                ariaLabel={t('settings.importMode')}
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'merge', label: t('settings.importMerge') },
                  { value: 'replace', label: t('settings.importReplace') },
                ]}
              />
              <p className="text-muted mt-2 text-xs">
                {mode === 'merge' ? t('settings.importMergeHint') : t('settings.importReplaceHint')}
              </p>
            </div>
          </div>
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={confirmClear}
        title={t('settings.clearTitle')}
        body={t('settings.clearBody')}
        confirmLabel={t('common.delete')}
        onConfirm={() => void handleClear()}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}
