'use client';

import Link from 'next/link';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { navigateToAdmin } from '../../../lib/firebase/adminNav';
import type { InviteWelcomeViewModel } from '../../../lib/email/inviteWelcome.server';
import { SITE_WORDMARK } from '../../../lib/brand';

interface InviteWelcomeContentProps {
  welcome: InviteWelcomeViewModel;
}

export function InviteWelcomeContent({ welcome }: InviteWelcomeContentProps) {
  let host = welcome.siteBaseUrl;
  try {
    host = new URL(welcome.siteBaseUrl).host;
  } catch {
    /* keep raw */
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">
      <p className="text-[10px] tracking-caps uppercase metallic-gold font-medium mb-3">
        {SITE_WORDMARK}
      </p>
      <HeaderDividerBeam contained animated={false} className="mb-8" />

      <Card className="p-8 md:p-10 space-y-8">
        <div className="space-y-3">
          <p className="text-[10px] tracking-caps uppercase text-gold-light">Welcome</p>
          <h1 className="text-xl font-light tracking-title uppercase text-primary">
            You&apos;re in — {welcome.personaLabel}
          </h1>
          <p className="text-sm text-secondary font-light leading-relaxed">
            {welcome.personaDescription}
          </p>
          <p className="text-xs text-muted font-light">
            Signed in as <span className="text-primary">{welcome.email}</span>
          </p>
        </div>

        {welcome.personalNote ? (
          <blockquote className="border-l-2 border-gold/40 pl-4 text-sm text-secondary font-light italic leading-relaxed">
            {welcome.personalNote}
          </blockquote>
        ) : null}

        {welcome.institutionName ? (
          <p className="text-[10px] tracking-caps uppercase text-muted">
            Institution · {welcome.institutionName}
            {welcome.institutionTier ? ` · ${welcome.institutionTier} tier` : ''}
          </p>
        ) : null}

        <div className="space-y-3">
          <p className="text-[10px] tracking-caps uppercase text-muted">Live preview site</p>
          <p className="text-sm text-secondary font-light">
            Explore the full platform at{' '}
            <span className="text-primary">{host}</span> — storefront, client portal
            {welcome.isAdminPersona ? ', and back-office' : ''}.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-4">
          {welcome.isAdminPersona ? (
            <Button type="button" onClick={() => void navigateToAdmin()}>
              Open Back-Office
            </Button>
          ) : null}
          <Link href={welcome.catalogUrl} className="terminal-link text-sm">
            Browse Catalog
          </Link>
          <Link href={welcome.signInUrl} className="terminal-link text-sm">
            Client Portal
          </Link>
        </div>

        {welcome.isAdminPersona ? (
          <div className="pt-4 border-t border-white/[0.06] space-y-2">
            <p className="text-[10px] tracking-caps uppercase text-muted">After your first login</p>
            <Link href={welcome.modulesUrl} className="terminal-link text-[10px]">
              Enable feature modules
            </Link>
          </div>
        ) : null}

        {welcome.persona === 'lab_buyer' ? (
          <Link href={welcome.verifyUrl} className="terminal-link text-[10px] inline-block">
            Verify institution for B2B access
          </Link>
        ) : null}
      </Card>
    </div>
  );
}
