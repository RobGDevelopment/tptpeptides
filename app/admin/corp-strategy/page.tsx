import { redirect } from 'next/navigation';
import { ExecutiveManualGate } from '../../../features/admin/components/ExecutiveManualGate';
import { CorpStrategyPageContent } from '../../../features/admin/components/corpStrategy/CorpStrategyPageContent';
import { resolveExecutiveManualAccess } from '../../../lib/admin/executiveManualAccess.server';

export const metadata = {
  title: 'Corp Strategy — Ecosystem Flow',
};

export default async function CorpStrategyPage() {
  const access = await resolveExecutiveManualAccess();
  if (!access.allowed) {
    redirect('/admin');
  }

  return (
    <ExecutiveManualGate>
      <CorpStrategyPageContent />
    </ExecutiveManualGate>
  );
}
