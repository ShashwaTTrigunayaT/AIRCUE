import { config } from '../config.js';
import { UpstreamError } from './errors.js';

/**
 * Fetch JSON from an upstream provider with a hard timeout and readable errors.
 * Never leaks provider payloads or keys to the client — callers decide the message.
 */
export async function fetchJson(
  url,
  { timeout = config.upstreamTimeoutMs, headers = {}, provider = 'provider', method = 'GET', body } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: { Accept: 'application/json', 'User-Agent': 'AIR-CUE/1.0 (air-quality intelligence demo)', ...headers },
      body,
      signal: controller.signal,
    });

    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const providerMessage = payload?.reason || payload?.error?.message || payload?.message;
      throw new UpstreamError(
        providerMessage ? `${provider}: ${providerMessage}` : `${provider} returned HTTP ${response.status}.`,
        { status: response.status, code: 'UPSTREAM_HTTP_ERROR', provider },
      );
    }

    if (payload === null) {
      throw new UpstreamError(`${provider} returned an unreadable response.`, { code: 'UPSTREAM_BAD_PAYLOAD', provider });
    }

    return payload;
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    if (error?.name === 'AbortError') {
      throw new UpstreamError(`${provider} did not respond within ${Math.round(timeout / 1000)} seconds.`, {
        code: 'UPSTREAM_TIMEOUT',
        provider,
      });
    }
    throw new UpstreamError(`Could not reach ${provider}.`, { code: 'UPSTREAM_UNREACHABLE', provider });
  } finally {
    clearTimeout(timer);
  }
}
