import { useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  SegmentedControl,
} from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { WorkoutProgram } from '@/models/program';
import { ProgramCard } from '@/features/programs/ProgramCard';
import { ProgramEditorSheet } from '@/features/programs/ProgramEditorSheet';
import { ScheduleEditor } from '@/features/schedule/ScheduleEditor';
import { useStartWorkout } from '@/features/workout/useStartWorkout';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';

type Tab = 'programs' | 'schedule';

/** Program management plus the weekly plan, kept together as two tabs. */
export function ProgramsPage() {
  const { t } = useTranslation();
  const programs = useDataStore((state) => state.programs);
  const deleteProgram = useDataStore((state) => state.deleteProgram);
  const activeSession = useWorkoutStore((state) => state.session);
  const pushToast = useToastStore((state) => state.push);
  const startWorkout = useStartWorkout();

  const [tab, setTab] = useState<Tab>('programs');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WorkoutProgram | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WorkoutProgram | null>(null);

  const openEditor = (program: WorkoutProgram | null) => {
    setEditing(program);
    setEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteProgram(pendingDelete.id);
    pushToast(t('common.delete'), 'info');
    setPendingDelete(null);
  };

  return (
    <div className="py-2">
      <PageHeader
        title={t('programs.title')}
        action={
          tab === 'programs' ? (
            <Button icon={<Plus size={18} />} onClick={() => openEditor(null)}>
              {t('common.add')}
            </Button>
          ) : undefined
        }
      />

      <SegmentedControl
        className="mb-5"
        ariaLabel={t('programs.title')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'programs', label: t('programs.tabPrograms') },
          { value: 'schedule', label: t('programs.tabSchedule') },
        ]}
      />

      {tab === 'programs' ? (
        programs.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={30} />}
            title={t('programs.empty')}
            description={t('programs.emptyHint')}
            action={
              <Button icon={<Plus size={18} />} onClick={() => openEditor(null)}>
                {t('programs.create')}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {programs.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                startDisabled={activeSession !== null}
                onStart={() => void startWorkout(program)}
                onEdit={() => openEditor(program)}
                onDelete={() => setPendingDelete(program)}
              />
            ))}
          </div>
        )
      ) : (
        <ScheduleEditor />
      )}

      {editorOpen ? (
        <ProgramEditorSheet open program={editing} onClose={() => setEditorOpen(false)} />
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('programs.deleteTitle')}
        body={t('programs.deleteBody', { name: pendingDelete?.name ?? '' })}
        confirmLabel={t('common.delete')}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
