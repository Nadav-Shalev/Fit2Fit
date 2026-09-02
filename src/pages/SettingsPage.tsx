import { Card, NumberStepper, PageHeader, SegmentedControl, SelectField, Toggle } from '@/components/ui';
import { FieldShell, TextField } from '@/components/ui/Field';
import { useTranslation } from '@/i18n';
import { LANGUAGES, LANGUAGE_NAMES, type Language } from '@/i18n/types';
import type { DayOfWeek } from '@/models/common';
import { DAYS_OF_WEEK } from '@/models/common';
import type { ThemeMode, WeightUnit } from '@/models/settings';
import { DataSection } from '@/features/settings/DataSection';
import { useDataStore } from '@/store/useDataStore';
import { weekdayName } from '@/utils/date';

const APP_VERSION = '1.0.0';

/** Preferences plus everything to do with the stored data. */
export function SettingsPage() {
  const { t, language } = useTranslation();
  const settings = useDataStore((state) => state.settings);
  const updateSettings = useDataStore((state) => state.updateSettings);

  return (
    <div className="py-2">
      <PageHeader title={t('settings.title')} />

      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="mb-4 font-bold">{t('settings.appearance')}</h2>

          <div className="flex flex-col gap-4">
            <TextField
              label={t('settings.userName')}
              hint={t('settings.userNameHint')}
              placeholder={t('settings.userNamePlaceholder')}
              value={settings.userName ?? ''}
              onChange={(event) => void updateSettings({ userName: event.target.value })}
            />

            <FieldShell label={t('settings.theme')}>
              <SegmentedControl
                ariaLabel={t('settings.theme')}
                value={settings.theme}
                onChange={(value: ThemeMode) => void updateSettings({ theme: value })}
                options={[
                  { value: 'dark', label: t('settings.themeDark') },
                  { value: 'light', label: t('settings.themeLight') },
                  { value: 'system', label: t('settings.themeSystem') },
                ]}
              />
            </FieldShell>

            <FieldShell label={t('settings.language')}>
              <SegmentedControl
                ariaLabel={t('settings.language')}
                value={settings.language}
                onChange={(value: Language) => void updateSettings({ language: value })}
                options={LANGUAGES.map((option) => ({
                  value: option,
                  label: LANGUAGE_NAMES[option],
                }))}
              />
            </FieldShell>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-bold">{t('settings.workoutDefaults')}</h2>

          <div className="flex flex-col gap-4">
            <FieldShell label={t('settings.weightUnit')}>
              <SegmentedControl
                ariaLabel={t('settings.weightUnit')}
                value={settings.weightUnit}
                onChange={(value: WeightUnit) => void updateSettings({ weightUnit: value })}
                options={[
                  { value: 'kg', label: t('units.kg') },
                  { value: 'lb', label: t('units.lb') },
                ]}
              />
            </FieldShell>

            <FieldShell label={`${t('settings.defaultRest')} (${t('units.sec')})`}>
              <NumberStepper
                label={t('settings.defaultRest')}
                value={settings.defaultRestSeconds}
                step={15}
                max={900}
                onChange={(value) => void updateSettings({ defaultRestSeconds: value ?? 60 })}
              />
            </FieldShell>

            <SelectField
              label={t('settings.weekStart')}
              value={String(settings.weekStartsOn)}
              onChange={(event) =>
                void updateSettings({ weekStartsOn: Number(event.target.value) as DayOfWeek })
              }
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {weekdayName(day, language)}
                </option>
              ))}
            </SelectField>

            <div className="border-line flex flex-col gap-3 border-t pt-3">
              <Toggle
                checked={settings.soundEnabled}
                onChange={(checked) => void updateSettings({ soundEnabled: checked })}
                label={t('settings.sound')}
              />
              <Toggle
                checked={settings.vibrationEnabled}
                onChange={(checked) => void updateSettings({ vibrationEnabled: checked })}
                label={t('settings.vibration')}
              />
              <Toggle
                checked={settings.showPreviousPerformance}
                onChange={(checked) => void updateSettings({ showPreviousPerformance: checked })}
                label={t('settings.showPrevious')}
                hint={t('settings.showPreviousHint')}
              />
            </div>
          </div>
        </Card>

        <DataSection />

        <Card>
          <h2 className="mb-2 font-bold">{t('settings.about')}</h2>
          <p className="text-muted text-sm">{t('app.tagline')}</p>
          <p className="text-muted mt-1 text-xs">{t('settings.version', { version: APP_VERSION })}</p>
        </Card>
      </div>
    </div>
  );
}
