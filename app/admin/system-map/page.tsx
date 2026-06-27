import type { Metadata } from 'next';
import { SystemMapPageContent } from '../../../features/admin/components/SystemMapPageContent';

export const metadata: Metadata = {
  title: 'System Architecture',
};

export default function AdminSystemMapPage() {
  return <SystemMapPageContent />;
}
