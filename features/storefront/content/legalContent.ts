export type LegalSlug = 'terms' | 'privacy' | 'research-policy';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export const LEGAL_SLUGS: LegalSlug[] = ['terms', 'privacy', 'research-policy'];

export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocument> = {
  terms: {
    title: 'Terms of Service',
    subtitle: 'TPT Peptides B2B Research Supply Platform',
    lastUpdated: 'June 2026',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        paragraphs: [
          'By accessing or using the TPT Peptides platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service.',
          'The Service is intended exclusively for qualified researchers, laboratories, and institutional buyers engaged in lawful in vitro or preclinical research.',
        ],
      },
      {
        heading: '2. Research Use Only',
        paragraphs: [
          'All products offered through TPT Peptides are sold strictly for laboratory research purposes. Products are not intended for human or veterinary consumption, diagnostic use, or any clinical application.',
          'You represent that you are at least 21 years of age and possess the qualifications necessary to handle research compounds safely and legally within your jurisdiction.',
        ],
      },
      {
        heading: '3. Orders & Payment',
        paragraphs: [
          'All orders are subject to acceptance and availability. Prices are verified server-side at checkout. Payment is processed securely through Stripe.',
          'TPT Peptides reserves the right to refuse or cancel any order that violates applicable law, these Terms, or our Research Use Only Policy.',
        ],
      },
      {
        heading: '4. Limitation of Liability',
        paragraphs: [
          'To the maximum extent permitted by law, TPT Peptides shall not be liable for any indirect, incidental, or consequential damages arising from use of the Service or research products.',
          'You assume full responsibility for compliance with local, state, federal, and international regulations governing research compounds.',
        ],
      },
      {
        heading: '5. Contact',
        paragraphs: [
          'For questions regarding these Terms, contact TPT Peptides compliance at the address provided in your account portal or purchase confirmation.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How TPT Peptides Collects, Uses, and Protects Your Data',
    lastUpdated: 'June 2026',
    sections: [
      {
        heading: '1. Information We Collect',
        paragraphs: [
          'We collect account information (email, authentication identifiers), order history, age verification audit events, and technical data such as browser user agent for compliance logging.',
          'Payment card data is processed directly by Stripe and is never stored on TPT Peptides servers.',
        ],
      },
      {
        heading: '2. How We Use Information',
        paragraphs: [
          'Information is used to fulfill orders, maintain account security, enforce age and research-use compliance, prevent fraud, and improve platform reliability.',
          'Admin audit logs may record administrative actions for legal and operational compliance.',
        ],
      },
      {
        heading: '3. Data Storage & Security',
        paragraphs: [
          'Customer and order data is stored in Google Firebase/Firestore with role-based access controls and server-side validation for sensitive operations.',
          'We employ HTTPS encryption, secure session cookies, Firebase App Check (production), and Stripe PCI-compliant payment processing.',
        ],
      },
      {
        heading: '4. Your Rights',
        paragraphs: [
          'You may request access to or deletion of personal data subject to legal retention requirements for order and compliance records.',
          'Contact us through your account portal to submit a data request.',
        ],
      },
      {
        heading: '5. Third-Party Services',
        paragraphs: [
          'We use Firebase (authentication, database), Stripe (payments), and Vercel (hosting). Each provider maintains its own privacy policy governing data they process.',
        ],
      },
    ],
  },
  'research-policy': {
    title: 'Research Use Only Policy',
    subtitle: 'Mandatory Compliance for All TPT Peptides Purchases',
    lastUpdated: 'June 2026',
    sections: [
      {
        heading: '1. Purpose',
        paragraphs: [
          'TPT Peptides supplies research-grade peptides and related compounds exclusively for in vitro, in vivo preclinical, and other qualified laboratory research—not for human or animal consumption.',
          'This policy applies to all customers, guest checkouts, and institutional accounts.',
        ],
      },
      {
        heading: '2. Buyer Qualifications',
        paragraphs: [
          'Buyers must be 21 years of age or older and must affirm research-use intent at checkout and through the platform age gate.',
          'Institutional buyers are responsible for ensuring personnel handling compounds are properly trained and licensed where required.',
        ],
      },
      {
        heading: '3. Prohibited Uses',
        paragraphs: [
          'Products may not be used for human or veterinary diagnosis, treatment, or consumption. Resale for non-research purposes is prohibited unless explicitly authorized in writing.',
          'Misrepresentation of buyer intent or research purpose may result in account termination and referral to appropriate authorities.',
        ],
      },
      {
        heading: '4. Compliance Logging',
        paragraphs: [
          'Age gate verifications and administrative actions are logged to auditLogs in Firestore for regulatory traceability.',
          'TPT Peptides cooperates with lawful requests from regulatory bodies when required.',
        ],
      },
      {
        heading: '5. Acknowledgment',
        paragraphs: [
          'By completing checkout, you acknowledge that you have read, understood, and agree to comply with this Research Use Only Policy and all applicable laws.',
        ],
      },
    ],
  },
};

export function isLegalSlug(value: string): value is LegalSlug {
  return LEGAL_SLUGS.includes(value as LegalSlug);
}
