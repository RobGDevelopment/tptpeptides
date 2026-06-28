/**
 * EBITDA waterfall for proforma underwriting scenarios (Sprint F/G).
 * Pure math — no side effects.
 */

export interface ProformaWaterfallInput {
  /** Top-line gross revenue (monthly or annual — keep units consistent) */
  grossRevenue: number;
  /** Customer acquisition cost per period */
  cac: number;
  /** COGS as percent of revenue (0–100) */
  cogsPercent: number;
  /** Merchant / processing fees as percent of revenue (0–100) */
  merchantFeePercent: number;
  /** Monthly churn percent applied to revenue retention (0–100) */
  churnPercent: number;
  /** General partner profit share of distributable EBITDA (0–100) */
  gpSplitPercent: number;
  /** Limited partner profit share of distributable EBITDA (0–100) */
  lpSplitPercent: number;
  /** Fixed operating expenses below gross profit */
  opex?: number;
}

export interface ProformaWaterfallResult {
  grossRevenue: number;
  revenueAfterChurn: number;
  cogs: number;
  grossProfit: number;
  merchantFees: number;
  cac: number;
  opex: number;
  ebitda: number;
  gpDistribution: number;
  lpDistribution: number;
  retainedEbitda: number;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Calculates revenue → EBITDA → GP/LP distribution waterfall. */
export function calculateEbitdaWaterfall(input: ProformaWaterfallInput): ProformaWaterfallResult {
  const grossRevenue = Math.max(0, input.grossRevenue);
  const churn = clampPercent(input.churnPercent) / 100;
  const revenueAfterChurn = roundMoney(grossRevenue * (1 - churn));

  const cogsRate = clampPercent(input.cogsPercent) / 100;
  const feeRate = clampPercent(input.merchantFeePercent) / 100;

  const cogs = roundMoney(revenueAfterChurn * cogsRate);
  const grossProfit = roundMoney(revenueAfterChurn - cogs);
  const merchantFees = roundMoney(revenueAfterChurn * feeRate);
  const cac = Math.max(0, input.cac);
  const opex = Math.max(0, input.opex ?? 0);

  const ebitda = roundMoney(grossProfit - merchantFees - cac - opex);

  const gpRate = clampPercent(input.gpSplitPercent) / 100;
  const lpRate = clampPercent(input.lpSplitPercent) / 100;
  const splitTotal = gpRate + lpRate;

  const distributable = Math.max(0, ebitda);
  const gpDistribution =
    splitTotal > 0 ? roundMoney(distributable * (gpRate / splitTotal)) : 0;
  const lpDistribution =
    splitTotal > 0 ? roundMoney(distributable * (lpRate / splitTotal)) : 0;
  const retainedEbitda = roundMoney(distributable - gpDistribution - lpDistribution);

  return {
    grossRevenue,
    revenueAfterChurn,
    cogs,
    grossProfit,
    merchantFees,
    cac,
    opex,
    ebitda,
    gpDistribution,
    lpDistribution,
    retainedEbitda,
  };
}
