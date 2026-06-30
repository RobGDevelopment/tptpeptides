export type ClinicLegalSlug = 'terms' | 'privacy';

export interface ClinicLegalSection {
  heading: string;
  paragraphs: string[];
}

export interface ClinicLegalDocument {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: ClinicLegalSection[];
}

export const CLINIC_LEGAL_SLUGS: ClinicLegalSlug[] = ['terms', 'privacy'];

export const CLINIC_LEGAL_DOCUMENTS: Record<ClinicLegalSlug, ClinicLegalDocument> = {
  terms: {
    title: 'Terms of Service',
    subtitle: 'TPT Clinic Telehealth Platform',
    lastUpdated: 'June 2026',
    sections: [
      {
        heading: '1. Agreement',
        paragraphs: [
          'By accessing the TPT Clinic telehealth platform ("Service"), you agree to these Terms of Service. If you do not agree, do not use the Service.',
          'The Service provides physician-led telehealth intake, care coordination, and patient portal access for eligible patients.',
        ],
      },
      {
        heading: '2. Medical Services',
        paragraphs: [
          'Telehealth services are provided by licensed clinicians and affiliated medical groups where permitted by law. The Service does not replace emergency care — call 911 for emergencies.',
          'Clinical eligibility, treatment decisions, and prescriptions are determined solely by licensed providers after review of your medical intake and consultation.',
        ],
      },
      {
        heading: '3. Patient Responsibilities',
        paragraphs: [
          'You agree to provide accurate health information, participate in scheduled follow-ups, and use the Service only for your own care unless authorized as a caregiver or guardian.',
          'You are responsible for maintaining the confidentiality of your account credentials and notifying us of unauthorized access.',
        ],
      },
      {
        heading: '4. Payments & Cancellations',
        paragraphs: [
          'Fees for services, memberships, or programs are disclosed before you complete intake or checkout. Refund policies, where applicable, are provided at the point of purchase.',
          'We may suspend access for non-payment, policy violations, or misuse of the platform.',
        ],
      },
      {
        heading: '5. Limitation of Liability',
        paragraphs: [
          'To the extent permitted by law, TPT Clinic and its affiliates are not liable for indirect or consequential damages arising from use of the Service.',
          'Nothing in these Terms limits rights that cannot be waived under applicable healthcare or consumer protection laws.',
        ],
      },
      {
        heading: '6. Contact',
        paragraphs: [
          'Questions about these Terms may be directed to support@tptclinic.com or the contact information provided in your patient portal.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How TPT Clinic Protects Patient Information',
    lastUpdated: 'June 2026',
    sections: [
      {
        heading: '1. Information We Collect',
        paragraphs: [
          'We collect information you provide during intake and care — including contact details, health history, identifiers required for clinical review, and communications with our care team.',
          'We also collect technical data such as device type and session logs needed to secure the platform.',
        ],
      },
      {
        heading: '2. How We Use Information',
        paragraphs: [
          'Information is used to deliver telehealth services, coordinate care with licensed providers, comply with clinical and legal obligations, and improve platform security and reliability.',
          'We do not sell patient information.',
        ],
      },
      {
        heading: '3. HIPAA & Security',
        paragraphs: [
          'Protected health information is handled in accordance with applicable HIPAA requirements and our Business Associate agreements with infrastructure vendors where required.',
          'We use encryption in transit, access controls, audit logging, and role-based administrative access for sensitive operations.',
        ],
      },
      {
        heading: '4. Sharing',
        paragraphs: [
          'We may share information with licensed clinicians, laboratories, pharmacies, and service providers who assist in delivering care — only as permitted by law and consistent with your authorization.',
          'We may disclose information when required by law, court order, or to protect safety.',
        ],
      },
      {
        heading: '5. Your Rights',
        paragraphs: [
          'Depending on your jurisdiction, you may have rights to access, amend, or request restrictions on certain uses of your health information.',
          'Submit privacy requests through support@tptclinic.com or your patient portal.',
        ],
      },
      {
        heading: '6. Retention',
        paragraphs: [
          'Medical and compliance records are retained as required by applicable healthcare regulations and clinical best practices.',
        ],
      },
    ],
  },
};

export function isClinicLegalSlug(value: string): value is ClinicLegalSlug {
  return CLINIC_LEGAL_SLUGS.includes(value as ClinicLegalSlug);
}
