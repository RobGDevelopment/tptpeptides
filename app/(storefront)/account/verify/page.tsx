import { redirect } from 'next/navigation';
import Link from 'next/link';
import { InstitutionVerifyForm } from '../../../../features/account/components/InstitutionVerifyForm';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { getModuleFlags } from '../../../../lib/firebase/modules.server';
import { isModuleEnabled } from '../../../../lib/modules/flags';
import { SITE_WORDMARK } from '../../../../lib/brand';

export default async function AccountVerifyPage() {
  const flags = await getModuleFlags();
  if (!isModuleEnabled(flags, 'isInstitutionVerificationEnabled')) {
    redirect('/account');
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">
      <Link href="/account" className="terminal-link text-[10px]">
        Client Portal
      </Link>

      <PageHeader
        wordmark={SITE_WORDMARK}
        title="Institution Verification"
        subtitle="KYB · B2B Procurement Gateway"
        align="left"
        className="mt-10"
      />

      <div className="mt-10">
        <InstitutionVerifyForm />
      </div>
    </div>
  );
}
