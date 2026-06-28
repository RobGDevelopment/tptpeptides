import { redirect } from 'next/navigation';
import { QuotesPageContent } from '../../../features/admin/components/QuotesPageContent';
import { getModuleFlags } from '../../../lib/firebase/modules.server';
import { isB2BFeatureEnabled } from '../../../lib/modules/b2b';

export default async function AdminQuotesPage() {
  const flags = await getModuleFlags();
  if (!isB2BFeatureEnabled(flags, 'isQuoteWorkflowEnabled')) {
    redirect('/admin');
  }

  return <QuotesPageContent />;
}
