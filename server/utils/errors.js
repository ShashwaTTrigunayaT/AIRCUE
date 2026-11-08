export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class UpstreamError extends Error {
  constructor(message, { status, code = 'UPSTREAM_ERROR', provider = 'provider' } = {}) {
    super(message);
    this.name = 'UpstreamError';
    this.status = status;
    this.code = code;
    this.provider = provider;
  }
}
