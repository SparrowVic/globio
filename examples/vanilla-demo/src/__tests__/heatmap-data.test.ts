import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const feed = JSON.stringify({ features: [{ geometry: { coordinates: [16, 52, 10] }, properties: { mag: 4.8 } }] });
const result = [{ position: [52, 16], value: 4.8 }];
const feedNames = ['fetchEarthquakesWeek', 'fetchEarthquakesMonth', 'fetchEarthquakesYear'] as const;

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('USGS feed caching', () => {
  it.each(feedNames)('%s retries a failed request and then reuses the recovered feed', async (name) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('Temporarily unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response(feed));
    vi.stubGlobal('fetch', fetchMock);
    const { [name]: load } = await import('../heatmap-data');

    await expect(load()).rejects.toThrow('503');
    await expect(load()).resolves.toEqual(result);
    await expect(load()).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(feedNames)('%s shares an in-flight request between concurrent consumers', async (name) => {
    let resolve!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal('fetch', fetchMock);
    const { [name]: load } = await import('../heatmap-data');

    const first = load();
    const second = load();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve(new Response(feed));

    await expect(Promise.all([first, second])).resolves.toEqual([result, result]);
    await expect(load()).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('recovers after an offline request', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Network disconnected'))
      .mockResolvedValueOnce(new Response(feed));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchEarthquakesWeek: load } = await import('../heatmap-data');

    await expect(load()).rejects.toThrow('Network disconnected');
    await expect(load()).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retain an invalid response in the cache', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{broken json'))
      .mockResolvedValueOnce(new Response(feed));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchEarthquakesMonth: load } = await import('../heatmap-data');

    await expect(load()).rejects.toBeInstanceOf(SyntaxError);
    await expect(load()).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
