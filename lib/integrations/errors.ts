export class IntegrationHubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrationHubError';
  }
}

export class MasterKeyNotConfiguredError extends IntegrationHubError {
  constructor() {
    super(
      'INTEGRATIONS_MASTER_KEY is not configured. Generate with: openssl rand -base64 32'
    );
    this.name = 'MasterKeyNotConfiguredError';
  }
}

export class IntegrationDecryptError extends IntegrationHubError {
  constructor(slug: string, cause?: string) {
    super(
      cause
        ? `Failed to decrypt integration secrets for "${slug}": ${cause}`
        : `Failed to decrypt integration secrets for "${slug}".`
    );
    this.name = 'IntegrationDecryptError';
  }
}

export class IntegrationValidationError extends IntegrationHubError {
  constructor(slug: string, detail: string) {
    super(`Invalid integration configuration for "${slug}": ${detail}`);
    this.name = 'IntegrationValidationError';
  }
}

export class IntegrationNotConfiguredError extends IntegrationHubError {
  constructor(slug: string, mode?: string) {
    super(
      mode
        ? `Integration "${slug}" is not configured for mode "${mode}".`
        : `Integration "${slug}" is not configured.`
    );
    this.name = 'IntegrationNotConfiguredError';
  }
}

export class UnknownIntegrationError extends IntegrationHubError {
  constructor(slug: string) {
    super(`Unknown integration slug: "${slug}".`);
    this.name = 'UnknownIntegrationError';
  }
}
