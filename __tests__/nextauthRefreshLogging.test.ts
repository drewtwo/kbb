/**
 * Ensures the NextAuth token refresh flow never logs Yahoo access/refresh tokens.
 */
const ACCESS_TOKEN = 'secret-access-token-value';
const REFRESH_TOKEN = 'secret-refresh-token-value';
const OLD_REFRESH_TOKEN = 'old-refresh-token-value';

type JwtCallback = (args: { token: Record<string, unknown> }) => Promise<Record<string, unknown>>;

let jwtCallback: JwtCallback;

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn((options: { callbacks: { jwt: JwtCallback } }) => {
    jwtCallback = options.callbacks.jwt;
    return jest.fn();
  }),
}));

const ENV_KEYS = ['NEXTAUTH_SECRET', 'YAHOO_TOKEN_URL', 'YAHOO_CLIENT_ID', 'YAHOO_CLIENT_SECRET'] as const;

function allLogOutput(spies: jest.SpyInstance[]): string {
  return spies
    .flatMap((spy) => spy.mock.calls as unknown[][])
    .map((args) => args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
    .join('\n');
}

describe('nextauth refreshAccessToken logging', () => {
  const originalEnv: Record<string, string | undefined> = {};
  let spies: jest.SpyInstance[];

  beforeAll(() => {
    ENV_KEYS.forEach((k) => {
      originalEnv[k] = process.env[k];
    });
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.YAHOO_TOKEN_URL = 'https://example.test/token';
    process.env.YAHOO_CLIENT_ID = 'client-id-123456';
    process.env.YAHOO_CLIENT_SECRET = 'client-secret';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../pages/api/auth/[...nextauth]');
  });

  afterAll(() => {
    ENV_KEYS.forEach((k) => {
      if (originalEnv[k] === undefined) delete process.env[k];
      else process.env[k] = originalEnv[k];
    });
  });

  beforeEach(() => {
    spies = (['info', 'warn', 'error', 'debug', 'log'] as const).map((m) =>
      jest.spyOn(console, m).mockImplementation(() => undefined)
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockFetch(status: number, body: string): void {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: async () => body,
    }) as unknown as typeof fetch;
  }

  const expiredToken = (): Record<string, unknown> => ({
    sub: 'user-1',
    refreshToken: OLD_REFRESH_TOKEN,
    accessTokenExpires: Date.now() - 1000,
  });

  it('does not log tokens on a successful refresh', async () => {
    mockFetch(200, JSON.stringify({ access_token: ACCESS_TOKEN, refresh_token: REFRESH_TOKEN, expires_in: 3600 }));
    const result = await jwtCallback({ token: expiredToken() });

    expect(result.accessToken).toBe(ACCESS_TOKEN);
    const output = allLogOutput(spies);
    expect(output).not.toContain(ACCESS_TOKEN);
    expect(output).not.toContain(REFRESH_TOKEN);
    expect(output).toContain('HTTP 200');
  });

  it('logs only status and OAuth error fields on a failed refresh', async () => {
    mockFetch(
      400,
      JSON.stringify({
        error: 'invalid_grant',
        error_description: 'expired',
        access_token: ACCESS_TOKEN,
        refresh_token: REFRESH_TOKEN,
      })
    );
    const result = await jwtCallback({ token: expiredToken() });

    expect(result.error).toBe('RefreshAccessTokenError');
    const output = allLogOutput(spies);
    expect(output).not.toContain(ACCESS_TOKEN);
    expect(output).not.toContain(REFRESH_TOKEN);
    expect(output).toContain('invalid_grant');
  });

  it('does not log the raw body when the response is not valid JSON', async () => {
    mockFetch(200, `{"access_token":"${ACCESS_TOKEN}", broken`);
    const result = await jwtCallback({ token: expiredToken() });

    expect(result.error).toBe('RefreshAccessTokenError');
    expect(allLogOutput(spies)).not.toContain(ACCESS_TOKEN);
  });
});
