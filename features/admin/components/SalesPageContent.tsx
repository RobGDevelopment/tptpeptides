'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/admin/adminFetch.client';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { Button } from '../../../components/ui/Button';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import type { AeRosterMember, InstitutionAccountRow, MarginReport } from '../../../lib/schemas/sales';

interface WorkspaceData {
  institutionAccounts: InstitutionAccountRow[];
  openQuoteCount: number;
  recentLeadCount: number;
  recentOrderCount: number;
  aeRoster: AeRosterMember[];
}

export function SalesPageContent({
  showMarginReporting,
  showLeadRouting,
  showImpersonation,
}: {
  showMarginReporting: boolean;
  showLeadRouting: boolean;
  showImpersonation: boolean;
}) {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [marginReport, setMarginReport] = useState<MarginReport | null>(null);
  const [aeRoster, setAeRoster] = useState<AeRosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);

  const [aeName, setAeName] = useState('');
  const [aeEmail, setAeEmail] = useState('');
  const [aeUid, setAeUid] = useState('');

  const load = useCallback(async () => {
    setError('');
    const [workspaceRes, settingsRes, marginRes] = await Promise.all([
      adminFetch('/api/admin/sales'),
      showLeadRouting ? adminFetch('/api/admin/sales/settings') : Promise.resolve(null),
      showMarginReporting ? adminFetch('/api/admin/margins') : Promise.resolve(null),
    ]);

    if (workspaceRes.status === 404) {
      window.location.href = '/admin';
      return;
    }
    if (!workspaceRes.ok) {
      setError('Unable to load sales workspace.');
      setLoading(false);
      return;
    }

    const workspaceData = (await workspaceRes.json()) as { workspace: WorkspaceData };
    setWorkspace(workspaceData.workspace);

    if (settingsRes?.ok) {
      const settingsData = (await settingsRes.json()) as { settings: { aeRoster: AeRosterMember[] } };
      setAeRoster(settingsData.settings.aeRoster);
    } else {
      setAeRoster(workspaceData.workspace.aeRoster);
    }

    if (marginRes?.ok) {
      const marginData = (await marginRes.json()) as { report: MarginReport };
      setMarginReport(marginData.report);
    }

    setLoading(false);
  }, [showLeadRouting, showMarginReporting]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRoster = async () => {
    setMessage('');
    setError('');
    const response = await adminFetch('/api/admin/sales/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aeRoster }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? 'Unable to save AE roster');
      return;
    }
    setMessage('AE roster saved.');
  };

  const addAe = () => {
    if (!aeName.trim() || !aeEmail.trim() || !aeUid.trim()) {
      setError('AE name, email, and UID are required.');
      return;
    }
    setAeRoster((rows) => [
      ...rows.filter((row) => row.uid !== aeUid.trim()),
      {
        uid: aeUid.trim(),
        email: aeEmail.trim().toLowerCase(),
        name: aeName.trim(),
        active: true,
      },
    ]);
    setAeName('');
    setAeEmail('');
    setAeUid('');
    setError('');
  };

  const startCoBrowse = async (targetUid: string) => {
    setActingOn(targetUid);
    setMessage('');
    setError('');
    const response = await adminFetch('/api/admin/impersonation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid }),
    });
    setActingOn(null);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? 'Unable to start co-browse');
      return;
    }
    const data = (await response.json()) as { redirectUrl?: string };
    window.location.href = data.redirectUrl ?? '/catalog';
  };

  if (loading || !workspace) {
    return <Spinner label="Loading sales workspace..." className="py-16" />;
  }

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Sales Command Center"
        subtitle="Institution pipeline, AE assignments, margin intelligence, and client co-browse"
        beamDelay={2}
      />

      {error && <p className="admin-banner">{error}</p>}
      {message && <p className="admin-banner">{message}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-white/[0.04]">
        {[
          { label: 'Institution Accounts', value: workspace.institutionAccounts.filter((a) => a.institutionVerified).length },
          { label: 'Open Quotes', value: workspace.openQuoteCount },
          { label: 'Leads (30d)', value: workspace.recentLeadCount },
          { label: 'Recent Orders', value: workspace.recentOrderCount },
        ].map((card) => (
          <div key={card.label} className="admin-stat bg-void">
            <p className="text-[10px] tracking-caps uppercase text-muted">{card.label}</p>
            <p className="text-3xl font-light mt-2 text-primary">{card.value}</p>
          </div>
        ))}
      </div>

      {showMarginReporting && marginReport && (
        <section className="admin-table-section">
          <div className="p-6 border-b border-white/[0.04] space-y-3">
            <h2 className="text-sm tracking-caps uppercase text-heading font-medium">Gross Margin</h2>
            <HeaderDividerBeam delay={2} />
            <p className="text-sm text-secondary font-light">
              {marginReport.orderCount} fulfilled orders · {marginReport.marginPercent.toFixed(1)}% blended margin
            </p>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] tracking-caps uppercase text-muted">Revenue</p>
              <p className="metallic-gold text-2xl font-light mt-1">${marginReport.revenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-caps uppercase text-muted">COGS</p>
              <p className="text-primary text-2xl font-light mt-1">${marginReport.cogs.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-caps uppercase text-muted">Gross Profit</p>
              <p className="text-gold-light text-2xl font-light mt-1">${marginReport.grossMargin.toFixed(2)}</p>
            </div>
          </div>
          <div className="overflow-x-auto border-t border-white/[0.04]">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Units</th>
                  <th>Revenue</th>
                  <th>COGS</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {marginReport.skuRows.slice(0, 10).map((row) => (
                  <tr key={row.productId}>
                    <td>
                      <div className="text-secondary">{row.name}</div>
                      <div className="text-xs text-muted">{row.tag}</div>
                    </td>
                    <td>{row.unitsSold}</td>
                    <td className="metallic-gold">${row.revenue.toFixed(2)}</td>
                    <td>${row.cogs.toFixed(2)}</td>
                    <td className="text-gold-light">{row.marginPercent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showLeadRouting && (
        <section className="admin-table-section p-6 space-y-4">
          <div>
            <h2 className="admin-heading text-xl">AE Roster</h2>
            <p className="admin-subheading">Round-robin lead assignment for new researcher registrations.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="AE name" value={aeName} onChange={(e) => setAeName(e.target.value)} />
            <Input label="AE email" type="email" value={aeEmail} onChange={(e) => setAeEmail(e.target.value)} />
            <Input label="Firebase UID" value={aeUid} onChange={(e) => setAeUid(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={addAe}>
              Add AE
            </Button>
            <Button onClick={() => void saveRoster()}>Save Roster</Button>
          </div>
          {aeRoster.length > 0 && (
            <ul className="text-sm text-secondary font-light space-y-2">
              {aeRoster.map((ae) => (
                <li key={ae.uid}>
                  {ae.name} · {ae.email} · {ae.active ? 'Active' : 'Inactive'}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="admin-table-section">
        <div className="p-6 border-b border-white/[0.04] space-y-3">
          <h2 className="text-sm tracking-caps uppercase text-heading font-medium">Institution Accounts</h2>
          <HeaderDividerBeam delay={2} />
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Verified</th>
                <th>Tier</th>
                <th>Lead Score</th>
                <th>Assigned AE</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {workspace.institutionAccounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted">
                    No customer accounts yet.
                  </td>
                </tr>
              )}
              {workspace.institutionAccounts.map((account) => (
                <tr key={account.uid}>
                  <td className="text-secondary">{account.email}</td>
                  <td className={account.institutionVerified ? 'text-gold-light' : 'text-muted'}>
                    {account.institutionVerified ? 'Yes' : 'No'}
                  </td>
                  <td>{account.institutionTier ?? '—'}</td>
                  <td>{account.leadScore ?? '—'}</td>
                  <td className="text-muted text-xs">{account.assignedAeEmail ?? 'Unassigned'}</td>
                  <td>
                    {showImpersonation && (
                      <button
                        type="button"
                        disabled={actingOn === account.uid}
                        onClick={() => void startCoBrowse(account.uid)}
                        className="terminal-link text-[10px]"
                      >
                        Co-browse
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
