'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import {
  DEFAULT_HOMEPAGE,
  DEFAULT_PROTOCOLS,
  DEFAULT_RESEARCH_ARTICLES,
  DEFAULT_SITE_SETTINGS,
} from '../../../lib/data/storefrontCmsStaticDefaults';
import type {
  CategoryMerchandising,
  HomepageMerchandising,
  ProtocolTemplateCms,
  ResearchArticleCms,
  SiteSettings,
} from '../../../lib/schemas/storefrontCms';

type Tab = 'homepage' | 'categories' | 'research' | 'protocols' | 'tools';

interface CatalogOption {
  slug: string;
  name: string;
}

export function StorefrontAdminPageContent() {
  const [tab, setTab] = useState<Tab>('homepage');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [catalogOptions, setCatalogOptions] = useState<CatalogOption[]>([]);

  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [homepage, setHomepage] = useState<HomepageMerchandising>(DEFAULT_HOMEPAGE);
  const [categories, setCategories] = useState<CategoryMerchandising>({ categories: [] });
  const [articles, setArticles] = useState<ResearchArticleCms[]>(DEFAULT_RESEARCH_ARTICLES);
  const [protocols, setProtocols] = useState<ProtocolTemplateCms[]>(DEFAULT_PROTOCOLS);
  const [editingArticle, setEditingArticle] = useState<ResearchArticleCms | null>(null);
  const [editingProtocol, setEditingProtocol] = useState<ProtocolTemplateCms | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [settingsRes, researchRes, protocolsRes, catalogRes] = await Promise.all([
        fetch('/api/admin/storefront/settings'),
        fetch('/api/admin/storefront/research'),
        fetch('/api/admin/storefront/protocols'),
        fetch('/api/products'),
      ]);

      if (settingsRes.ok) {
        const data = (await settingsRes.json()) as {
          settings: SiteSettings | null;
          homepage: HomepageMerchandising | null;
          categories: CategoryMerchandising | null;
        };
        setSettings(data.settings ?? DEFAULT_SITE_SETTINGS);
        setHomepage(data.homepage ?? DEFAULT_HOMEPAGE);
        setCategories(data.categories ?? { categories: [] });
      }

      if (researchRes.ok) {
        const data = (await researchRes.json()) as { articles: ResearchArticleCms[] };
        if (data.articles?.length) setArticles(data.articles);
      }

      if (protocolsRes.ok) {
        const data = (await protocolsRes.json()) as { protocols: ProtocolTemplateCms[] };
        if (data.protocols?.length) setProtocols(data.protocols);
      }

      if (catalogRes.ok) {
        const products = (await catalogRes.json()) as { slug: string; name: string }[];
        const unique = new Map<string, string>();
        for (const product of products) {
          if (product.slug) unique.set(product.slug, product.name);
        }
        setCatalogOptions(
          [...unique.entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name))
        );
      }
    } catch {
      setError('Failed to load storefront CMS data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveHomepage = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/storefront/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, homepage }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Save failed');
        return;
      }
      setMessage('Homepage and hero saved. Storefront revalidated.');
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const saveCategories = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/storefront/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categories),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Save failed');
        return;
      }
      setMessage('Category merchandising saved.');
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const saveArticle = async (article: ResearchArticleCms) => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/storefront/research', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Save failed');
        return;
      }
      setMessage('Research article saved.');
      setEditingArticle(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const saveProtocol = async (protocol: ProtocolTemplateCms) => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/storefront/protocols', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(protocol),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Save failed');
        return;
      }
      setMessage('Protocol saved.');
      setEditingProtocol(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const seedCms = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/storefront/seed', { method: 'POST' });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(data.error ?? 'Seed failed');
        return;
      }
      setMessage(data.message ?? 'CMS seeded');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const exportCatalog = () => {
    window.open('/api/admin/storefront/export-catalog', '_blank');
  };

  const toggleFeaturedSlug = (slug: string) => {
    setHomepage((current) => {
      const exists = current.featuredSlugs.includes(slug);
      return {
        ...current,
        featuredSlugs: exists
          ? current.featuredSlugs.filter((value) => value !== slug)
          : [...current.featuredSlugs, slug],
      };
    });
  };

  if (loading) return <Spinner label="Loading storefront CMS..." className="py-20" />;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'homepage', label: 'Homepage' },
    { id: 'categories', label: 'Categories' },
    { id: 'research', label: 'Research' },
    { id: 'protocols', label: 'Protocols' },
    { id: 'tools', label: 'Tools' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Storefront CMS"
        subtitle="Edit the consumer-facing homepage, content, and merchandising"
        beamDelay={1}
        actions={
          <Link href="/" target="_blank" className="terminal-link text-[10px]">
            Preview Storefront
          </Link>
        }
      />

      {message && <p className="admin-banner">{message}</p>}
      {error && <p className="text-sm text-red-400/90">{error}</p>}

      <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-white/[0.06] pb-4">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`admin-filter ${tab === id ? 'admin-filter-active' : 'admin-filter-inactive'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'homepage' && (
        <div className="space-y-8 max-w-2xl">
          <section className="space-y-4">
            <h2 className="text-sm tracking-caps uppercase text-primary font-medium">Hero</h2>
            <Input label="Headline" value={settings.heroTitle} onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })} />
            <label className="block">
              <span className="text-[10px] tracking-caps uppercase text-muted block mb-2">Body copy</span>
              <textarea
                value={settings.heroBody}
                onChange={(e) => setSettings({ ...settings, heroBody: e.target.value })}
                rows={3}
                className="terminal-input resize-none w-full"
              />
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Primary CTA label" value={settings.primaryCtaLabel} onChange={(e) => setSettings({ ...settings, primaryCtaLabel: e.target.value })} />
              <Input label="Primary CTA link" value={settings.primaryCtaHref} onChange={(e) => setSettings({ ...settings, primaryCtaHref: e.target.value })} />
              <Input label="Secondary CTA label" value={settings.secondaryCtaLabel} onChange={(e) => setSettings({ ...settings, secondaryCtaLabel: e.target.value })} />
              <Input label="Secondary CTA link" value={settings.secondaryCtaHref} onChange={(e) => setSettings({ ...settings, secondaryCtaHref: e.target.value })} />
            </div>
            <Input label="Footer tagline" value={settings.footerTagline} onChange={(e) => setSettings({ ...settings, footerTagline: e.target.value })} />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm tracking-caps uppercase text-primary font-medium">Featured grid</h2>
            <Input label="Section title" value={homepage.featuredTitle} onChange={(e) => setHomepage({ ...homepage, featuredTitle: e.target.value })} />
            <label className="block">
              <span className="text-[10px] tracking-caps uppercase text-muted block mb-2">Section subtitle</span>
              <textarea
                value={homepage.featuredSubtitle}
                onChange={(e) => setHomepage({ ...homepage, featuredSubtitle: e.target.value })}
                rows={2}
                className="terminal-input resize-none w-full"
              />
            </label>
            <Input
              label="Max compounds (when no manual selection)"
              type="number"
              min={1}
              max={24}
              value={homepage.featuredLimit}
              onChange={(e) => setHomepage({ ...homepage, featuredLimit: Number(e.target.value) || 9 })}
            />
            <div>
              <p className="text-[10px] tracking-caps uppercase text-muted mb-3">Featured compounds (order preserved)</p>
              <div className="max-h-64 overflow-y-auto space-y-2 border-t border-white/[0.06] pt-3">
                {catalogOptions.map((option) => (
                  <label key={option.slug} className="flex items-center gap-3 text-sm text-secondary font-light cursor-pointer">
                    <input
                      type="checkbox"
                      checked={homepage.featuredSlugs.includes(option.slug)}
                      onChange={() => toggleFeaturedSlug(option.slug)}
                      className="accent-gold"
                    />
                    {option.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted mt-2 font-light">Leave all unchecked to show the first N catalog items alphabetically.</p>
            </div>
          </section>

          <Button onClick={saveHomepage} disabled={saving}>
            {saving ? 'Saving...' : 'Save Homepage'}
          </Button>
        </div>
      )}

      {tab === 'categories' && (
        <div className="space-y-4">
          <p className="text-sm text-secondary font-light">Control display names, sort order, and visibility in catalog filters.</p>
          <div className="admin-table-section">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Catalog category</th>
                  <th>Display name</th>
                  <th>Sort</th>
                  <th>Visible</th>
                </tr>
              </thead>
              <tbody>
                {categories.categories.map((item, index) => (
                  <tr key={item.catalogCategory}>
                    <td className="text-muted text-sm">{item.catalogCategory}</td>
                    <td>
                      <input
                        className="terminal-input text-sm"
                        value={item.displayName}
                        onChange={(e) => {
                          const next = [...categories.categories];
                          next[index] = { ...item, displayName: e.target.value };
                          setCategories({ categories: next });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="terminal-input w-16 text-sm"
                        value={item.sortOrder}
                        onChange={(e) => {
                          const next = [...categories.categories];
                          next[index] = { ...item, sortOrder: Number(e.target.value) || 0 };
                          setCategories({ categories: next });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.visible}
                        onChange={(e) => {
                          const next = [...categories.categories];
                          next[index] = { ...item, visible: e.target.checked };
                          setCategories({ categories: next });
                        }}
                        className="accent-gold"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={saveCategories} disabled={saving}>
            {saving ? 'Saving...' : 'Save Categories'}
          </Button>
        </div>
      )}

      {tab === 'research' && (
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() =>
              setEditingArticle({
                slug: '',
                title: '',
                excerpt: '',
                publishedAt: new Date().toISOString().slice(0, 10),
                category: 'Research',
                body: [''],
                published: true,
              })
            }
          >
            New Article
          </Button>
          <div className="space-y-3">
            {articles.map((article) => (
              <div key={article.slug} className="flex justify-between items-center border-b border-white/[0.06] py-3">
                <div>
                  <p className="text-sm text-primary">{article.title}</p>
                  <p className="text-[10px] text-muted uppercase tracking-caps">{article.slug}</p>
                </div>
                <Button variant="ghost" onClick={() => setEditingArticle(article)}>
                  Edit
                </Button>
              </div>
            ))}
          </div>
          {editingArticle && (
            <ArticleEditor
              article={editingArticle}
              saving={saving}
              onSave={saveArticle}
              onCancel={() => setEditingArticle(null)}
            />
          )}
        </div>
      )}

      {tab === 'protocols' && (
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() =>
              setEditingProtocol({
                id: '',
                title: '',
                compounds: [''],
                focus: '',
                href: '/catalog',
                sortOrder: protocols.length,
                published: true,
              })
            }
          >
            New Protocol
          </Button>
          <div className="space-y-3">
            {protocols.map((protocol) => (
              <div key={protocol.id} className="flex justify-between items-center border-b border-white/[0.06] py-3">
                <div>
                  <p className="text-sm text-primary">{protocol.title}</p>
                  <p className="text-[10px] text-muted uppercase tracking-caps">{protocol.id}</p>
                </div>
                <Button variant="ghost" onClick={() => setEditingProtocol(protocol)}>
                  Edit
                </Button>
              </div>
            ))}
          </div>
          {editingProtocol && (
            <ProtocolEditor
              protocol={editingProtocol}
              saving={saving}
              onSave={saveProtocol}
              onCancel={() => setEditingProtocol(null)}
            />
          )}
        </div>
      )}

      {tab === 'tools' && (
        <div className="space-y-6 max-w-lg">
          <div className="border-b border-white/[0.06] pb-6">
            <h2 className="text-sm tracking-caps uppercase text-primary font-medium mb-2">Seed CMS defaults</h2>
            <p className="text-sm text-secondary font-light mb-4">
              Push code defaults (hero, homepage, research, protocols, categories) into Firestore. Safe to re-run — merges existing docs.
            </p>
            <Button onClick={seedCms} disabled={saving}>
              Seed CMS from defaults
            </Button>
          </div>
          <div>
            <h2 className="text-sm tracking-caps uppercase text-primary font-medium mb-2">Export catalog JSON</h2>
            <p className="text-sm text-secondary font-light mb-4">
              Download current Firestore products grouped by compound (fallback: catalog.json).
            </p>
            <Button variant="ghost" onClick={exportCatalog}>
              Export catalog.json
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ArticleEditor({
  article,
  saving,
  onSave,
  onCancel,
}: {
  article: ResearchArticleCms;
  saving: boolean;
  onSave: (article: ResearchArticleCms) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(article);

  return (
    <div className="space-y-4 border-t border-white/[0.06] pt-6 max-w-2xl">
      <Input label="Slug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
      <Input label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      <Input label="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
      <Input label="Published date" value={draft.publishedAt} onChange={(e) => setDraft({ ...draft, publishedAt: e.target.value })} />
      <label className="block">
        <span className="text-[10px] tracking-caps uppercase text-muted block mb-2">Excerpt</span>
        <textarea value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} rows={2} className="terminal-input w-full resize-none" />
      </label>
      <label className="block">
        <span className="text-[10px] tracking-caps uppercase text-muted block mb-2">Body paragraphs (one per line block)</span>
        <textarea
          value={draft.body.join('\n\n')}
          onChange={(e) => setDraft({ ...draft, body: e.target.value.split('\n\n').filter(Boolean) })}
          rows={6}
          className="terminal-input w-full resize-none"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-secondary">
        <input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} className="accent-gold" />
        Published
      </label>
      <div className="flex gap-4">
        <Button onClick={() => onSave(draft)} disabled={saving}>Save Article</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function ProtocolEditor({
  protocol,
  saving,
  onSave,
  onCancel,
}: {
  protocol: ProtocolTemplateCms;
  saving: boolean;
  onSave: (protocol: ProtocolTemplateCms) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(protocol);

  return (
    <div className="space-y-4 border-t border-white/[0.06] pt-6 max-w-2xl">
      <Input label="ID" value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} />
      <Input label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      <Input label="Link href" value={draft.href} onChange={(e) => setDraft({ ...draft, href: e.target.value })} />
      <Input label="Sort order" type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })} />
      <label className="block">
        <span className="text-[10px] tracking-caps uppercase text-muted block mb-2">Focus (in-vitro framing)</span>
        <textarea value={draft.focus} onChange={(e) => setDraft({ ...draft, focus: e.target.value })} rows={3} className="terminal-input w-full resize-none" />
      </label>
      <Input
        label="Compounds (comma-separated)"
        value={draft.compounds.join(', ')}
        onChange={(e) => setDraft({ ...draft, compounds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
      />
      <label className="flex items-center gap-2 text-sm text-secondary">
        <input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} className="accent-gold" />
        Published
      </label>
      <div className="flex gap-4">
        <Button onClick={() => onSave(draft)} disabled={saving}>Save Protocol</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
