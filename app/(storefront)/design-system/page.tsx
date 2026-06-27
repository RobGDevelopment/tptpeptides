import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { SignatureBeam } from '../../../components/ui/SignatureBeam';
import { MetallicBeam } from '../../../components/ui/MetallicBeam';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SITE_TAGLINE, SITE_TERMINAL_VERSION, SITE_WORDMARK } from '../../../lib/brand';

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-void pt-32 pb-24 px-4">
      <div className="max-w-3xl mx-auto space-y-16">
        <PageHeader
          wordmark={SITE_WORDMARK}
          subtitle={`Design System · ${SITE_TAGLINE} ${SITE_TERMINAL_VERSION}`}
        />

        <section className="space-y-4">
          <h2 className="text-xs tracking-caps uppercase text-muted">Beams</h2>
          <p className="text-secondary text-sm font-light">Signature beam (global, viewport top)</p>
          <div className="relative h-8 border border-white/[0.06] overflow-hidden">
            <SignatureBeam />
          </div>
          <p className="text-secondary text-sm font-light pt-4">Header divider — full viewport sweep, fades at edges</p>
          <HeaderDividerBeam delay={1} />
          <HeaderDividerBeam delay={2} className="mt-4" />
          <div className="flex h-16 items-center gap-4">
            <MetallicBeam variant="vertical" className="h-full" />
            <p className="text-secondary text-sm font-light">Vertical beam · 1px metallic drift</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs tracking-caps uppercase text-muted">Typography</h2>
          <p className="metallic-gold text-2xl tracking-title uppercase">Metallic Gold Wordmark</p>
          <p className="text-primary font-light">Primary body — weight 300</p>
          <p className="text-secondary font-light">Secondary supporting copy</p>
          <p className="text-xs tracking-caps uppercase text-muted">Caps label · muted</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs tracking-caps uppercase text-muted">Links</h2>
          <a href="/catalog" className="terminal-link">
            Terminal Link Pattern
          </a>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs tracking-caps uppercase text-muted">Surfaces</h2>
          <div className="bg-surface/60 p-8">
            <p className="text-secondary text-sm font-light">
              Surface panel — no border box, implied depth only.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
