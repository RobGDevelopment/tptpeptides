export type CorpEntityId = 'tpt' | 'openloop' | 'medfitlive' | 'kennedy503a';
export type CorpStepId = 'intake' | 'chartReview' | 'rawSupply' | 'fulfillment';
export type CorpJourneyPhase = 'entities' | 'steps';
export type CorpAccent = 'tech' | 'medical' | 'supply' | 'pharmacy' | 'money';

export type CorpIconKey =
  | 'laptop'
  | 'doctor'
  | 'flask'
  | 'bottle'
  | 'desktop'
  | 'shield'
  | 'boxes'
  | 'truck'
  | 'trendUp'
  | 'sackDollar';

export interface CorpEntity {
  id: CorpEntityId;
  title: string;
  badge: string;
  description: string;
  accent: CorpAccent;
  icon: CorpIconKey;
  linkedStepIds: CorpStepId[];
}

export interface CorpMoneyRow {
  label: string;
  value: string;
}

export interface CorpTimelineStep {
  id: CorpStepId;
  number: number;
  title: string;
  body: string;
  actionLabel: string;
  actionHeadline: string;
  accent: CorpAccent;
  icon: CorpIconKey;
  reversed: boolean;
  moneyRows: CorpMoneyRow[];
  legalNote?: string;
  cardGlow?: CorpAccent;
  cardAlign: 'left' | 'right';
}

export interface CorpUnitEconomics {
  title: string;
  grossRevenue: number;
  grossLabel: string;
  grossNote: string;
  vendorCosts: number;
  vendorLabel: string;
  vendorItems: { label: string; amount: number }[];
  netProfit: number;
  netLabel: string;
  netNote: string;
  partnerFootnotes: { entity: string; note: string }[];
}

export const CORP_STRATEGY_HEADER = {
  title: 'TPT Peptides Ecosystem',
  subtitle:
    'Legal Architecture, Data Routing, and Financial Profit Flow from First Click to Product Delivery.',
} as const;

export const JOURNEY_DWELL_MS = 4200;

/** Dwell time while each entity card is highlighted in guided tour */
export const ENTITY_DWELL_MS = 5500;

export const CORP_STEP_ORDER: CorpStepId[] = ['intake', 'chartReview', 'rawSupply', 'fulfillment'];

export const CORP_ENTITY_ORDER: CorpEntityId[] = ['tpt', 'openloop', 'medfitlive', 'kennedy503a'];

export const CORP_ENTITY_JOURNEY_LABELS: Record<CorpEntityId, string> = {
  tpt: 'TPT',
  openloop: 'OpenLoop',
  medfitlive: 'MedFitLive',
  kennedy503a: 'Kennedy',
};

export const CORP_JOURNEY_LABELS: Record<CorpStepId, string> = {
  intake: 'Intake',
  chartReview: 'Rx',
  rawSupply: 'Supply',
  fulfillment: 'Fulfill',
};

export const CORP_ENTITIES: CorpEntity[] = [
  {
    id: 'tpt',
    title: 'TPT Peptides',
    badge: 'The MSO',
    description:
      'Operates the storefront, manages patient billing, marketing, and the UI/UX. Owns the retail customer relationship.',
    accent: 'tech',
    icon: 'laptop',
    linkedStepIds: ['intake', 'chartReview', 'fulfillment'],
  },
  {
    id: 'openloop',
    title: 'OpenLoop',
    badge: 'Friendly PC / HaaS',
    description:
      'Provides the licensed physician network. Shields TPT Peptides from CPOM liability. Writes the legal prescriptions.',
    accent: 'medical',
    icon: 'doctor',
    linkedStepIds: ['chartReview', 'fulfillment'],
  },
  {
    id: 'medfitlive',
    title: 'MedFitLive',
    badge: 'FDA API Supplier',
    description:
      'The B2B wholesaler. Supplies FDA-registered raw active pharmaceutical ingredients (APIs) in bulk to the pharmacy.',
    accent: 'supply',
    icon: 'flask',
    linkedStepIds: ['rawSupply'],
  },
  {
    id: 'kennedy503a',
    title: 'Kennedy 503A',
    badge: 'Compounding Pharmacy',
    description:
      'Purchases raw materials from MedFitLive, compounds the sterile peptides, and drop-ships directly to the patient.',
    accent: 'pharmacy',
    icon: 'bottle',
    linkedStepIds: ['rawSupply', 'fulfillment'],
  },
];

export const CORP_TIMELINE_STEPS: CorpTimelineStep[] = [
  {
    id: 'intake',
    number: 1,
    title: '1. Intake & Checkout',
    body: 'Patient visits the portal, completes the medical intake form, and submits payment for the wellness program.',
    actionLabel: 'System Action',
    actionHeadline: 'The Digital Front Door',
    accent: 'tech',
    icon: 'desktop',
    reversed: false,
    cardAlign: 'left',
    moneyRows: [{ label: 'Patient pays $399 Retail to TPT Peptides', value: '' }],
  },
  {
    id: 'chartReview',
    number: 2,
    title: '2. Chart Review & Rx',
    body: "TPT's Express backend POSTs the intake via API to OpenLoop. A licensed physician reviews asynchronously and approves the script.",
    actionLabel: 'System Action',
    actionHeadline: 'API Hand-off & Compliance',
    accent: 'medical',
    icon: 'shield',
    reversed: true,
    cardAlign: 'right',
    moneyRows: [{ label: 'TPT pays OpenLoop', value: '-$30 Flat Consult Fee' }],
    legalNote: 'Legal: No fee-splitting. OpenLoop acts as independent medical evaluator.',
  },
  {
    id: 'rawSupply',
    number: 3,
    title: '3. Raw Material Supply',
    body: 'Kennedy 503A purchases FDA-registered bulk Active Pharmaceutical Ingredients (APIs) from MedFitLive.',
    actionLabel: 'Supply Chain',
    actionHeadline: 'The B2B Ingredient Flow',
    accent: 'supply',
    icon: 'boxes',
    reversed: false,
    cardAlign: 'left',
    moneyRows: [{ label: 'Kennedy 503A pays MedFitLive', value: 'Bulk B2B Rates' }],
    legalNote:
      'Legal: MedFitLive profits strictly on wholesale B2B volume, avoiding AKS steering violations.',
  },
  {
    id: 'fulfillment',
    number: 4,
    title: '4. White-Label Delivery',
    body: 'OpenLoop API routes Rx exclusively to Kennedy 503A. They compound the peptide, package it with TPT branding, and ship to the patient.',
    actionLabel: 'Fulfillment',
    actionHeadline: 'Compounding & Drop-Ship',
    accent: 'pharmacy',
    icon: 'truck',
    reversed: true,
    cardAlign: 'right',
    cardGlow: 'money',
    moneyRows: [{ label: 'TPT pays Kennedy 503A', value: '-$75 Fulfillment Cost' }],
  },
];

export const CORP_UNIT_ECONOMICS: CorpUnitEconomics = {
  title: 'Unit Economics (Per $399 Patient)',
  grossRevenue: 399,
  grossLabel: 'Gross Revenue',
  grossNote: 'Paid directly to TPT Peptides merchant gateway.',
  vendorCosts: 105,
  vendorLabel: 'Vendor Costs',
  vendorItems: [
    { label: 'OpenLoop API:', amount: 30 },
    { label: 'Kennedy 503A:', amount: 75 },
  ],
  netProfit: 294,
  netLabel: 'TPT Net Profit',
  netNote: 'Total retained margin per patient.',
  partnerFootnotes: [
    { entity: 'MedFitLive Profits:', note: 'Bulk API sales to Kennedy.' },
    { entity: 'Kennedy Profits:', note: 'Wholesale Rx volume ($75) - Raw Cost ($20).' },
    { entity: 'OpenLoop Profits:', note: 'High-volume $30 API pings.' },
  ],
};

export const CORP_ENTITY_MAP = Object.fromEntries(
  CORP_ENTITIES.map((entity) => [entity.id, entity])
) as Record<CorpEntityId, CorpEntity>;

export const CORP_STEP_MAP = Object.fromEntries(
  CORP_TIMELINE_STEPS.map((step) => [step.id, step])
) as Record<CorpStepId, CorpTimelineStep>;

export function getLinkedEntitiesForStep(stepId: CorpStepId): CorpEntity[] {
  return CORP_ENTITIES.filter((entity) => entity.linkedStepIds.includes(stepId));
}

export function getLinkedStepsForEntity(entityId: CorpEntityId): CorpTimelineStep[] {
  const entity = CORP_ENTITY_MAP[entityId];
  return entity.linkedStepIds.map((id) => CORP_STEP_MAP[id]);
}

export const CORP_ACCENT_CLASSES: Record<
  CorpAccent,
  { text: string; border: string; bg: string; glow: string }
> = {
  tech: {
    text: 'text-sky-400',
    border: 'border-sky-400/50',
    bg: 'bg-sky-400/20',
    glow: 'corp-strategy-glow-tech',
  },
  medical: {
    text: 'text-purple-500',
    border: 'border-purple-500/50',
    bg: 'bg-purple-500/20',
    glow: 'corp-strategy-glow-medical',
  },
  supply: {
    text: 'text-amber-500',
    border: 'border-amber-500/50',
    bg: 'bg-amber-500/20',
    glow: 'corp-strategy-glow-supply',
  },
  pharmacy: {
    text: 'text-pink-500',
    border: 'border-pink-500/50',
    bg: 'bg-pink-500/20',
    glow: 'corp-strategy-glow-pharmacy',
  },
  money: {
    text: 'text-emerald-500',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    glow: 'corp-strategy-glow-money',
  },
};
