import { redirect } from 'next/navigation';
import { ExecutiveManualFlipbook } from '../../../features/admin/components/ExecutiveManualFlipbook';
import { ExecutiveManualGate } from '../../../features/admin/components/ExecutiveManualGate';
import { resolveExecutiveManualAccess } from '../../../lib/admin/executiveManualAccess.server';
import { loadExecutiveManualPayload } from '../../../lib/admin/manualParser.server';

export const metadata = {
  title: 'Operating System — Executive Manual',
};

export default async function ExecutiveManualPage() {
  const access = await resolveExecutiveManualAccess();
  if (!access.allowed) {
    redirect('/admin');
  }

  const manual = await loadExecutiveManualPayload();

  return (
    <ExecutiveManualGate>
      <ExecutiveManualFlipbook manual={manual} />
    </ExecutiveManualGate>
  );
}
