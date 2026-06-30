import type { IntegrationDefinition, IntegrationSlug } from './types';
import { UnknownIntegrationError } from './errors';
import {
  fullscriptIntegrationDefinition,
  gohighlevelIntegrationDefinition,
  nmiIntegrationDefinition,
  openLoopIntegrationDefinition,
  personaIntegrationDefinition,
  quickbooksOnlineIntegrationDefinition,
  resendIntegrationDefinition,
  rupaHealthIntegrationDefinition,
  slackIntegrationDefinition,
  twilioIntegrationDefinition,
  twoAcceptIntegrationDefinition,
} from './providers/definitions';

export const INTEGRATION_REGISTRY: Record<IntegrationSlug, IntegrationDefinition> = {
  openloop: openLoopIntegrationDefinition,
  rupa_health: rupaHealthIntegrationDefinition,
  fullscript: fullscriptIntegrationDefinition,
  nmi: nmiIntegrationDefinition,
  two_accept: twoAcceptIntegrationDefinition,
  quickbooks_online: quickbooksOnlineIntegrationDefinition,
  gohighlevel: gohighlevelIntegrationDefinition,
  twilio: twilioIntegrationDefinition,
  resend: resendIntegrationDefinition,
  persona: personaIntegrationDefinition,
  slack: slackIntegrationDefinition,
};

export const INTEGRATION_DEFINITIONS = Object.values(INTEGRATION_REGISTRY);

export function getIntegrationDefinition(slug: string): IntegrationDefinition {
  const definition = INTEGRATION_REGISTRY[slug as IntegrationSlug];
  if (!definition) {
    throw new UnknownIntegrationError(slug);
  }
  return definition;
}

export function isIntegrationSlug(value: string): value is IntegrationSlug {
  return value in INTEGRATION_REGISTRY;
}

export function listIntegrationsByCategory(): Record<
  IntegrationDefinition['category'],
  IntegrationDefinition[]
> {
  const grouped: Record<IntegrationDefinition['category'], IntegrationDefinition[]> = {
    fulfillment: [],
    financial: [],
    crm_comms: [],
    compliance: [],
    ops: [],
  };

  for (const definition of INTEGRATION_DEFINITIONS) {
    grouped[definition.category].push(definition);
  }

  return grouped;
}
