'use client';

import { Input } from '../../../../components/ui/Input';
import type { IntegrationSecretPayload } from '../../../../lib/integrations/types';
import { SECRET_FIELD_LABELS } from '../../../../lib/integrations/fieldLabels';

type IntegrationSecretFieldsProps = {
  credentialMode: 'sandbox' | 'live';
  fields: (keyof IntegrationSecretPayload)[];
  maskedSecrets: Partial<Record<keyof IntegrationSecretPayload, string>>;
  values: Partial<Record<keyof IntegrationSecretPayload, string>>;
  onChange: (field: keyof IntegrationSecretPayload, value: string) => void;
  disabled?: boolean;
};

export function IntegrationSecretFields({
  credentialMode,
  fields,
  maskedSecrets,
  values,
  onChange,
  disabled,
}: IntegrationSecretFieldsProps) {
  if (fields.length === 0) {
    return (
      <p className="text-xs text-muted font-light">
        No credential fields required for {credentialMode} mode.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[10px] tracking-caps uppercase text-muted">
        {credentialMode === 'sandbox' ? 'Sandbox credentials' : 'Live credentials'}
      </p>
      {fields.map((field) => {
        const masked = maskedSecrets[field];
        const placeholder = masked ? `Leave blank to keep ${masked}` : `Enter ${SECRET_FIELD_LABELS[field]}`;

        return (
          <Input
            key={`${credentialMode}-${field}`}
            label={SECRET_FIELD_LABELS[field]}
            type={field.toLowerCase().includes('secret') || field === 'apiKey' ? 'password' : 'text'}
            value={values[field] ?? ''}
            onChange={(event) => onChange(field, event.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}
