import type { Metadata } from 'next';
import { ClinicIntakePageContent } from '../../../../features/clinic/components/ClinicIntakePageContent';

export const metadata: Metadata = {
  title: 'Medical Intake',
  description: 'Complete your secure telehealth medical intake and informed consent.',
};

export default function ClinicIntakePage() {
  return <ClinicIntakePageContent />;
}
