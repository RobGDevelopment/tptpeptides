export class PaymentProviderError extends Error {
  readonly provider: string;
  readonly statusCode?: number;

  constructor(provider: string, message: string, statusCode?: number) {
    super(message);
    this.name = 'PaymentProviderError';
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

export class PaymentConfigurationError extends PaymentProviderError {
  constructor(provider: string, message: string) {
    super(provider, message);
    this.name = 'PaymentConfigurationError';
  }
}
