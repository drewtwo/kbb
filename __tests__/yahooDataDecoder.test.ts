import zlib from 'zlib';
import type { IncomingMessage } from 'http';
import { decodeYahooResponseBody } from '../utils/yahooData';

describe('decodeYahooResponseBody', () => {
  it('returns plain text when content-encoding header is absent', async () => {
    const response = { headers: {} } as IncomingMessage;
    const body = 'plain response body';

    await expect(decodeYahooResponseBody(response, [Buffer.from(body, 'utf8')])).resolves.toBe(body);
  });

  it('decompresses gzip-encoded response bodies', async () => {
    const body = 'gzip compressed body';
    const compressed = zlib.gzipSync(Buffer.from(body, 'utf8'));
    const response = { headers: { 'content-encoding': 'gzip' } } as IncomingMessage;

    await expect(decodeYahooResponseBody(response, [compressed])).resolves.toBe(body);
  });

  it('decompresses deflate-encoded response bodies', async () => {
    const body = 'deflate compressed body';
    const compressed = zlib.deflateSync(Buffer.from(body, 'utf8'));
    const response = { headers: { 'content-encoding': 'deflate' } } as IncomingMessage;

    await expect(decodeYahooResponseBody(response, [compressed])).resolves.toBe(body);
  });
});
