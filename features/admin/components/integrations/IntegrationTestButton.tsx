'use client';

import { useTransition } from 'react';
import { testIntegrationConnection } from '../../actions/integrationActions';
import { Button } from '../../../../components/ui/Button';

type IntegrationTestButtonProps = {
  slug: string;
  disabled?: boolean;
  onResult: (result: { ok: true; detail?: string } | { ok: false; error: string }) => void;
};

export function IntegrationTestButton({ slug, disabled, onResult }: IntegrationTestButtonProps) {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await testIntegrationConnection(slug);
      if (!result.ok) {
        onResult({ ok: false, error: result.error });
        return;
      }
      onResult({ ok: true, detail: result.data.detail });
    });
  };

  return (
    <Button type="button" disabled={disabled || pending} onClick={handleClick}>
      {pending ? 'Testing connection…' : 'Test connection'}
    </Button>
  );
}
