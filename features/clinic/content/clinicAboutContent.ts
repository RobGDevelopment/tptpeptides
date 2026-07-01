export const CLINIC_ABOUT_CONTENT = {
  title: 'About TPT Clinic',
  subtitle: 'Physician-led telehealth for executives and high-net-worth patients',
  sections: [
    {
      heading: 'Clinical Model',
      paragraphs: [
        'TPT Clinic is a concierge telehealth platform connecting patients with board-certified physicians for medical weight loss, hormone optimization, and longevity care.',
        'Every treatment plan is designed and overseen by licensed clinicians—not algorithms or call centers.',
      ],
    },
    {
      heading: 'Privacy & HIPAA Compliance',
      paragraphs: [
        'Patient data is protected under HIPAA. Our telehealth infrastructure uses encrypted transport, role-based access controls, and audit logging for clinical operations.',
        'Business Associate Agreements (BAAs) are maintained with infrastructure vendors that process protected health information on our behalf.',
      ],
    },
    {
      heading: 'Licensing & Professional Standards',
      paragraphs: [
        'Clinical services are delivered by physicians and affiliated medical groups licensed in the states where patients are located at the time of care.',
        'Telehealth encounters follow synchronous video standards where required by state medical boards and federal controlled-substance regulations.',
      ],
    },
    {
      heading: 'Secure Patient Portal',
      paragraphs: [
        'The TPT Clinic patient portal provides HIPAA-scoped messaging, lab results, intake status, and treatment plans in a single secure dashboard.',
        'For support, contact your care team through the portal or email support@tptclinic.com.',
      ],
    },
  ],
  trustSignals: [
    { label: 'HIPAA-Aligned Infrastructure', detail: 'Encrypted data at rest and in transit' },
    { label: 'Physician-Led Care', detail: 'Board-certified clinical oversight' },
    { label: 'BAA-Covered Vendors', detail: 'PHI processors under agreement' },
    { label: 'Secure Patient Portal', detail: 'Role-scoped clinical messaging & labs' },
  ],
} as const;
