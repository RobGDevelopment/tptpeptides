import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { InviteWelcomeContent } from '../../../../features/invite/components/InviteWelcomeContent';
import { getInviteWelcomeViewModel } from '../../../../lib/email/inviteWelcome.server';
import { SITE_NAME } from '../../../../lib/brand';

export const metadata: Metadata = {
  title: `Welcome | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function InviteWelcomePage({
  params,
}: {
  params: Promise<{ inviteId: string }>;
}) {
  const { inviteId } = await params;
  const welcome = await getInviteWelcomeViewModel(inviteId);

  if (!welcome) {
    notFound();
  }

  return <InviteWelcomeContent welcome={welcome} />;
}
