/**
 * Unit tests for Daraja helpers. No network: `fetch` is mocked and the controller is
 * loaded in an isolated module registry with fake (non-placeholder) credentials so the
 * real token-caching path runs.
 */
type PaymentControllerModule = typeof import('../src/controllers/paymentController');

const loadController = (env: Record<string, string> = {}): PaymentControllerModule => {
  Object.assign(process.env, env);
  let mod: PaymentControllerModule | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../src/controllers/paymentController');
  });
  return mod!;
};

const tokenResponse = (accessToken: string, expiresIn: string | number = '3599') =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ access_token: accessToken, expires_in: expiresIn })
  }) as unknown as Response;

describe('Daraja helpers', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  describe('getDarajaTimestamp', () => {
    it('formats the time as YYYYMMDDHHmmss in East Africa Time (UTC+3)', () => {
      const { getDarajaTimestamp } = loadController();
      expect(getDarajaTimestamp(new Date('2026-10-13T18:29:59.999Z'))).toBe('20261013212959');
    });

    it('rolls the date over at 21:00 UTC (midnight in Nairobi)', () => {
      const { getDarajaTimestamp } = loadController();
      expect(getDarajaTimestamp(new Date('2026-12-31T20:59:59Z'))).toBe('20261231235959');
      expect(getDarajaTimestamp(new Date('2026-12-31T21:00:00Z'))).toBe('20270101000000');
    });

    it('always returns exactly 14 digits', () => {
      const { getDarajaTimestamp } = loadController();
      expect(getDarajaTimestamp()).toMatch(/^\d{14}$/);
    });
  });

  describe('getDarajaToken caching', () => {
    const credentials = {
      DARAJA_CONSUMER_KEY: 'unit_test_consumer_key',
      DARAJA_CONSUMER_SECRET: 'unit_test_consumer_secret',
      DARAJA_ENVIRONMENT: 'sandbox'
    };

    it('reuses the cached token until it is within 2 minutes of expiry', async () => {
      const { getDarajaToken } = loadController(credentials);
      const t0 = Date.UTC(2026, 9, 13, 12, 0, 0);
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(t0);
      const fetchSpy = jest.spyOn(global, 'fetch')
        .mockResolvedValueOnce(tokenResponse('token_1'))
        .mockResolvedValueOnce(tokenResponse('token_2'));

      expect(await getDarajaToken()).toBe('token_1');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(String(fetchSpy.mock.calls[0][0])).toContain('sandbox.safaricom.co.ke/oauth/v1/generate');

      // 3599s TTL - 121s => still more than 2 minutes left: cached
      nowSpy.mockReturnValue(t0 + (3599 - 121) * 1000);
      expect(await getDarajaToken()).toBe('token_1');
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // 3599s TTL - 119s => inside the 2-minute refresh window: refetch
      nowSpy.mockReturnValue(t0 + (3599 - 119) * 1000);
      expect(await getDarajaToken()).toBe('token_2');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('shares a single in-flight OAuth request between concurrent callers', async () => {
      const { getDarajaToken } = loadController(credentials);
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(tokenResponse('shared_token'));

      const tokens = await Promise.all([getDarajaToken(), getDarajaToken(), getDarajaToken()]);

      expect(tokens).toEqual(['shared_token', 'shared_token', 'shared_token']);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('does not cache failures and retries on the next call', async () => {
      const { getDarajaToken } = loadController(credentials);
      const fetchSpy = jest.spyOn(global, 'fetch')
        .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) } as unknown as Response)
        .mockResolvedValueOnce(tokenResponse('recovered_token'));

      await expect(getDarajaToken()).rejects.toThrow(/HTTP 401/);
      expect(await getDarajaToken()).toBe('recovered_token');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('never calls Safaricom when credentials are placeholders', async () => {
      delete process.env.DARAJA_CONSUMER_KEY;
      const { getDarajaToken } = loadController();
      const fetchSpy = jest.spyOn(global, 'fetch');

      expect(await getDarajaToken()).toBe('mock_daraja_token');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
