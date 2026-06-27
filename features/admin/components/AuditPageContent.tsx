'use client';

import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { db } from '../../../lib/firebase/firestore';
import type { AuditLogRow } from '../types';
import { Spinner } from '../../../components/ui/Spinner';

function parseTimestamp(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function formatLogType(row: AuditLogRow): string {
  if (row.type === 'age_verification' || row.action === 'age_verification') {
    return 'Age Gate Verification';
  }
  if (row.type === 'admin_action') {
    return `Admin: ${String(row.action ?? 'action')}`;
  }
  return row.type || row.action || 'Unknown';
}

export function AuditPageContent() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'age' | 'admin'>('all');

  useEffect(() => {
    const logsQuery = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(200));
    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        setLogs(
          snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              type: String(data.type ?? data.action ?? 'unknown'),
              action: data.action as string | undefined,
              userId: (data.userId as string | null) ?? null,
              metadata: (data.metadata as Record<string, unknown> | undefined) ?? undefined,
              timestamp: parseTimestamp(data.timestamp),
              userAgent: data.userAgent as string | undefined,
            };
          })
        );
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <Spinner label="Loading audit logs..." className="py-20" />;
  }

  const filteredLogs = logs.filter((log) => {
    if (filter === 'age') {
      return log.type === 'age_verification' || log.action === 'age_verification';
    }
    if (filter === 'admin') {
      return log.type === 'admin_action' || log.action?.startsWith('admin') || log.action?.includes('purchase_order');
    }
    return true;
  });

  const exportCsv = () => {
    const header = 'timestamp,event,userId,details\n';
    const rows = filteredLogs
      .map((log) =>
        [
          log.timestamp?.toISOString() ?? '',
          formatLogType(log),
          log.userId ?? '',
          JSON.stringify(log.metadata ?? log.userAgent ?? ''),
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'tpt-audit-logs.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Compliance Audit Logs"
        subtitle="Read-only trail of age gate verifications and admin actions for legal compliance"
        beamDelay={2}
        actions={
          <button type="button" onClick={exportCsv} className="terminal-link text-[10px]">
            Export CSV
          </button>
        }
      />

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {(['all', 'age', 'admin'] as const).map((value, index, arr) => (
          <span key={value} className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setFilter(value)}
              className={`admin-filter ${filter === value ? 'admin-filter-active' : 'admin-filter-inactive'}`}
            >
              {value === 'all' ? 'All events' : value === 'age' ? 'Age gate' : 'Admin actions'}
            </button>
            {index < arr.length - 1 ? (
              <span className="h-3 w-px bg-white/[0.08]" aria-hidden />
            ) : null}
          </span>
        ))}
      </div>

      <div className="admin-table-section">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event</th>
                <th>User</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted">
                    No audit logs match this filter.
                  </td>
                </tr>
              )}
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="text-muted whitespace-nowrap">
                    {log.timestamp?.toLocaleString() ?? '—'}
                  </td>
                  <td className="text-primary">{formatLogType(log)}</td>
                  <td className="text-muted">{log.userId ?? 'anonymous'}</td>
                  <td className="text-muted max-w-md truncate font-mono text-xs">
                    {log.metadata ? JSON.stringify(log.metadata) : log.userAgent ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
