import { describe, expect, it, vi } from "vitest";
import { CseClient, CseEmptyDataError, CseValidationError } from "../src/index.js";

type ResponseSpec = { status?: number; body: unknown };

function createFetch(responses: Record<string, ResponseSpec[]>): {
  fetch: typeof fetch;
  calls: Array<{ endpoint: string; body: string }>;
} {
  const calls: Array<{ endpoint: string; body: string }> = [];

  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const endpoint = url.slice(url.lastIndexOf("/") + 1);
    const body = init?.body instanceof URLSearchParams ? init.body.toString() : String(init?.body ?? "");
    calls.push({ endpoint, body });

    const queue = responses[endpoint];
    const next = queue?.shift();
    if (!next) {
      return new Response(JSON.stringify({ message: `unexpected endpoint ${endpoint}` }), { status: 404 });
    }

    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  });

  return { fetch: fetchMock as unknown as typeof fetch, calls };
}

describe("CseClient", () => {
  it("resolves securityId and maps company chart points", async () => {
    const { fetch, calls } = createFetch({
      companyInfoSummery: [
        {
          body: {
            reqSymbolInfo: { symbol: "LOLC.N0000", name: "L O L C HOLDINGS PLC" },
            reqSymbolBetaInfo: { securityId: 378, betaValueSPSL: 0.43 },
            reqLogo: { id: 2168, path: "upload_logo/378_1601611239.jpeg" },
          },
        },
      ],
      companyChartDataByStock: [
        {
          body: {
            id: 378,
            chartData: [
              {
                h: 54.7,
                l: 54.7,
                o: null,
                s: 57118421,
                q: 918,
                p: 54.7,
                c: -0.1,
                pc: -0.1824,
                t: 1783051488212,
                n: null,
                id: 57118421,
              },
            ],
          },
        },
      ],
    });
    const client = new CseClient({ fetch });

    const chart = await client.getCompanyChart("LOLC.N0000", 1);

    expect(chart.securityId).toBe(378);
    expect(chart.points).toHaveLength(1);
    expect(chart.points[0]).toMatchObject({
      high: 54.7,
      low: 54.7,
      open: null,
      price: 54.7,
      quantity: 918,
      timestamp: 1783051488212,
    });
    expect(calls).toEqual([
      { endpoint: "companyInfoSummery", body: "symbol=LOLC.N0000" },
      { endpoint: "companyChartDataByStock", body: "stockId=378&period=1" },
    ]);
  });

  it("maps getTopLosers to the misspelled upstream endpoint", async () => {
    const { fetch, calls } = createFetch({
      topLooses: [{ body: [{ symbol: "CFLB.N0000", changePercentage: -7.27 }] }],
    });
    const client = new CseClient({ fetch });

    const losers = await client.getTopLosers();

    expect(losers).toEqual([{ symbol: "CFLB.N0000", changePercentage: -7.27 }]);
    expect(calls).toEqual([{ endpoint: "topLooses", body: "" }]);
  });

  it("rejects unsupported chart periods before making a request", async () => {
    const { fetch, calls } = createFetch({});
    const client = new CseClient({ fetch });

    await expect(client.getCompanyChart("LOLC.N0000", "1D" as never)).rejects.toBeInstanceOf(CseValidationError);
    expect(calls).toEqual([]);
  });

  it("throws a clear error for empty company chart data", async () => {
    const { fetch } = createFetch({
      companyInfoSummery: [
        {
          body: {
            reqSymbolInfo: { symbol: "LOLC.N0000" },
            reqSymbolBetaInfo: { securityId: 378 },
          },
        },
      ],
      companyChartDataByStock: [{ body: { id: 378, chartData: [] } }],
    });
    const client = new CseClient({ fetch });

    await expect(client.getCompanyChart("LOLC.N0000", 1)).rejects.toBeInstanceOf(CseEmptyDataError);
  });

  it("flattens dailyMarketSummery nested arrays", async () => {
    const { fetch } = createFetch({
      dailyMarketSummery: [{ body: [[{ id: 26367, marketTurnover: 1541395970 }]] }],
    });
    const client = new CseClient({ fetch });

    await expect(client.getDailyMarketSummary()).resolves.toEqual([{ id: 26367, marketTurnover: 1541395970 }]);
  });
});
