export type JsonObject = Record<string, unknown>;
export type ChartPeriod = 1 | 7 | 30 | 90 | 365;
export type MarketChartIndex = "ASPI" | "SNP_SL_20";
export type NewsType = "CN" | "BN" | "MR";

export interface CseClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  userAgent?: string;
  fetch?: typeof fetch;
}

export interface Company {
  symbol: string;
  name?: string;
  securityId?: number;
  lastTradedPrice?: number;
  change?: number;
  changePercentage?: number;
  marketCap?: number;
  betaValueSpsl?: number;
  logoPath?: string;
  raw: JsonObject;
}

export interface PriceRow extends JsonObject {
  symbol?: string;
  lastTradedPrice?: number;
  change?: number;
  changePercentage?: number;
}

export interface TradeSummaryRow extends JsonObject {
  symbol?: string;
  name?: string;
  quantity?: number;
  price?: number;
  turnover?: number;
  percentageChange?: number;
}

export interface DetailedTradeRow extends JsonObject {
  symbol?: string;
  name?: string;
  price?: number;
  qty?: number;
  trades?: number;
  change?: number;
  changePercentage?: number;
}

export interface MarketStatus {
  status: string;
  raw: JsonObject;
}

export interface MarketSummary extends JsonObject {
  tradeVolume?: number;
  shareVolume?: number;
  tradeDate?: number;
  trades?: number;
}

export interface IndexData extends JsonObject {
  value?: number;
  lowValue?: number;
  highValue?: number;
  change?: number;
  percentage?: number;
  timestamp?: number;
}

export interface Sector extends JsonObject {
  symbol?: string;
  name?: string;
  indexName?: string;
}

export interface SecurityCode extends JsonObject {
  id?: number;
  name?: string;
  symbol?: string;
  active?: number;
}

export interface Security extends JsonObject {
  securityId?: number;
  name?: string;
  symbol?: string;
  boardId?: number;
  deleted?: number;
}

export interface CompanyChart {
  symbol: string;
  securityId: number;
  period: ChartPeriod;
  points: CompanyChartPoint[];
  raw: JsonObject;
}

export interface CompanyChartPoint {
  high?: number;
  low?: number;
  open?: number | null;
  price?: number;
  sequence?: number;
  quantity?: number;
  change?: number | null;
  percentChange?: number | null;
  timestamp?: number;
  name?: string | null;
  id?: number;
  raw: JsonObject;
}

export interface MarketChart {
  index: MarketChartIndex;
  chartId: number;
  period: ChartPeriod;
  points: MarketChartPoint[];
}

export interface MarketChartPoint {
  date?: number;
  value?: number;
  percentChange?: number | null;
  raw: JsonObject;
}

export interface Announcement extends JsonObject {
  id?: number;
  announcementId?: number;
  createdDate?: string;
  dateOfAnnouncement?: string;
  company?: string;
  symbol?: string;
  announcementCategory?: string;
  fileText?: string;
  path?: string;
}

export interface AnnouncementDetail extends JsonObject {
  reqBaseAnnouncement?: JsonObject;
  reqAnnouncementDocs?: JsonObject[];
}

export interface CorporateAnnouncementCategory extends JsonObject {
  id?: number;
  categoryName?: string;
  pageName?: string;
  pageView?: string;
  methodName?: string;
}

export interface NewsOptions {
  type?: NewsType | string;
  top?: boolean;
  year?: number;
  security?: string;
  numberOfRecord?: number;
}

export interface NewsItem extends JsonObject {
  id?: string;
  title?: string;
  shortDescription?: string;
  publishedDate?: string;
}

export interface EventOptions {
  eventType?: string;
  year?: number;
  numberOfRecord?: number;
}

export interface EventItem extends JsonObject {
  id?: string;
  eventType?: string;
  title?: string;
  body?: string;
}

export interface EducationalVideo extends JsonObject {
  id?: string;
  link?: string;
  isHome?: boolean;
  lang?: string;
}

export interface WebsiteNotification extends JsonObject {
  id?: string;
  title?: string;
  body?: string;
}

export class CseApiError extends Error {
  readonly endpoint: string;
  readonly status?: number;
  readonly body?: string;

  constructor(message: string, options: { endpoint: string; status?: number; body?: string }) {
    super(message);
    this.name = "CseApiError";
    this.endpoint = options.endpoint;
    this.status = options.status;
    this.body = options.body;
  }
}

export class CseEmptyDataError extends CseApiError {
  constructor(endpoint: string, message: string) {
    super(message, { endpoint });
    this.name = "CseEmptyDataError";
  }
}

export class CseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CseValidationError";
  }
}

const DEFAULT_BASE_URL = "https://www.cse.lk/api";
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_USER_AGENT = "cse-client-js/0.1.0";
const CHART_PERIODS = new Set<number>([1, 7, 30, 90, 365]);
const MARKET_CHART_IDS: Record<MarketChartIndex, number> = {
  ASPI: 1,
  SNP_SL_20: 40,
};

export class CseClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly userAgent: string;
  private readonly fetchImpl: typeof fetch;
  private readonly securityIdCache = new Map<string, number>();

  constructor(options: CseClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.fetchImpl = options.fetch ?? globalThis.fetch;

    if (!this.fetchImpl) {
      throw new CseValidationError("No fetch implementation available. Use Node.js 20+ or pass options.fetch.");
    }
  }

  async raw(endpoint: string, data: Record<string, string | number | boolean | null | undefined> = {}): Promise<unknown> {
    return this.post(endpoint, data);
  }

  async rawGet(endpoint: string, params: Record<string, string | number | boolean | null | undefined> = {}): Promise<unknown> {
    return this.get(endpoint, params);
  }

  async getCompany(symbol: string): Promise<Company> {
    this.requireSymbol(symbol);
    const raw = await this.post("companyInfoSummery", { symbol });
    const root = asRecord(raw, "companyInfoSummery");
    const info = optionalRecord(root.reqSymbolInfo);
    const beta = optionalRecord(root.reqSymbolBetaInfo);
    const logo = optionalRecord(root.reqLogo);
    const resolvedSymbol = stringValue(info?.symbol) ?? symbol;
    const securityId = numberValue(beta?.securityId) ?? numberValue(info?.securityId) ?? numberValue(info?.id);

    if (!info && securityId === undefined) {
      throw new CseEmptyDataError("companyInfoSummery", `No company data returned for symbol ${symbol}.`);
    }

    if (securityId !== undefined) {
      this.securityIdCache.set(resolvedSymbol, securityId);
      this.securityIdCache.set(symbol, securityId);
    }

    return {
      symbol: resolvedSymbol,
      name: stringValue(info?.name),
      securityId,
      lastTradedPrice: numberValue(info?.lastTradedPrice),
      change: numberValue(info?.change),
      changePercentage: numberValue(info?.changePercentage),
      marketCap: numberValue(info?.marketCap),
      betaValueSpsl: numberValue(beta?.betaValueSPSL),
      logoPath: stringValue(logo?.path),
      raw: root,
    };
  }

  async getCompanyChart(symbol: string, period: ChartPeriod): Promise<CompanyChart> {
    this.requireSymbol(symbol);
    this.requireChartPeriod(period);

    const securityId = await this.resolveSecurityId(symbol);
    const raw = await this.post("companyChartDataByStock", { stockId: securityId, period });
    const root = asRecord(raw, "companyChartDataByStock");
    const points = arrayProperty(root, "chartData").map(normalizeChartPoint);

    if (points.length === 0) {
      throw new CseEmptyDataError(
        "companyChartDataByStock",
        `No chart data returned for ${symbol}. Use companyInfoSummery.reqSymbolBetaInfo.securityId as stockId.`,
      );
    }

    return {
      symbol,
      securityId,
      period,
      points,
      raw: root,
    };
  }

  async getMarketChart(index: MarketChartIndex, period: ChartPeriod = 1): Promise<MarketChart> {
    this.requireChartPeriod(period);
    const chartId = MARKET_CHART_IDS[index];
    if (chartId === undefined) {
      throw new CseValidationError("index must be ASPI or SNP_SL_20.");
    }

    const rows = topLevelRecords(await this.post("chartData", { chartId, period }), "chartData");
    return {
      index,
      chartId,
      period,
      points: rows.map(normalizeMarketChartPoint),
    };
  }

  async getSecurityCodes(): Promise<SecurityCode[]> {
    return this.getTopLevelArray("allSecurityCode");
  }

  async getSecurities(): Promise<Security[]> {
    return this.getContentArray("cntSecurity");
  }

  async getTradeSummary(): Promise<TradeSummaryRow[]> {
    return this.objectArray("tradeSummary", "reqTradeSummery");
  }

  async getTodayPrices(): Promise<PriceRow[]> {
    return this.topLevelArray("todaySharePrice");
  }

  async getTopGainers(): Promise<PriceRow[]> {
    return this.topLevelArray("topGainers");
  }

  async getTopLosers(): Promise<PriceRow[]> {
    return this.topLevelArray("topLooses");
  }

  async getMostActiveTrades(): Promise<PriceRow[]> {
    return this.topLevelArray("mostActiveTrades");
  }

  async getNewListingsAnnouncements(): Promise<Announcement[]> {
    return this.objectArray("getNewListingsRelatedNoticesAnnouncements", "newListingRelatedAnnouncements");
  }

  async getBuyInBoardAnnouncements(): Promise<Announcement[]> {
    return this.objectArray("getBuyInBoardAnnouncements", "buyInBoardAnnouncements");
  }

  async getApprovedAnnouncements(): Promise<Announcement[]> {
    return this.objectArray("approvedAnnouncement", "approvedAnnouncements");
  }

  async getCovidAnnouncements(): Promise<Announcement[]> {
    return this.objectArray("getCOVIDAnnouncements", "covidAnnouncements");
  }

  async getFinancialAnnouncements(): Promise<Announcement[]> {
    return this.objectArray("getFinancialAnnouncement", "reqFinancialAnnouncemnets");
  }

  async getCircularAnnouncements(): Promise<Announcement[]> {
    return this.objectArray("circularAnnouncement", "reqCircularAnnouncement");
  }

  async getDirectiveAnnouncements(): Promise<Announcement[]> {
    return this.objectArray("directiveAnnouncement", "reqDirectiveAnnouncement");
  }

  async getNonComplianceAnnouncements(): Promise<Announcement[]> {
    return this.objectArray("getNonComplianceAnnouncements", "nonComplianceAnnouncements");
  }

  async getAnnouncement(announcementId: number): Promise<AnnouncementDetail> {
    if (!Number.isInteger(announcementId) || announcementId <= 0) {
      throw new CseValidationError("announcementId must be a positive integer.");
    }

    return asRecord(await this.post("getAnnouncementById", { announcementId }), "getAnnouncementById") as AnnouncementDetail;
  }

  async getCompanyAnnouncements(symbol: string): Promise<Announcement[]> {
    this.requireSymbol(symbol);
    return this.objectArray("getAnnouncementByCompany", "reqCompanyAnnouncement", { symbol });
  }

  async getCorporateAnnouncementCategories(): Promise<CorporateAnnouncementCategory[]> {
    return this.getTopLevelArray("corporateAnnouncementCategory");
  }

  async getSmdCategories(): Promise<string[]> {
    const raw = await this.get("smd/categories");
    if (!Array.isArray(raw)) {
      throw new CseEmptyDataError("smd/categories", "Expected smd/categories to return a JSON array.");
    }

    return raw.filter((value): value is string => typeof value === "string");
  }

  async getEducationalVideos(): Promise<EducationalVideo[]> {
    return this.getContentArray("educationalVideos");
  }

  async getNotifications(): Promise<WebsiteNotification[]> {
    return this.getContentArray("notifications");
  }

  async getNews(options: NewsOptions = {}): Promise<NewsItem[]> {
    const params = cleanParams({
      top: options.top ?? false,
      type: options.type,
      year: options.year,
      security: options.security,
      numberOfRecord: options.numberOfRecord,
    });
    return groupedRecords(await this.get("news/web", params), "news/web") as NewsItem[];
  }

  async getTopNews(options: Omit<NewsOptions, "top"> = {}): Promise<NewsItem[]> {
    return this.getNews({ ...options, top: true, numberOfRecord: options.numberOfRecord ?? 3 });
  }

  async getEvents(options: EventOptions = {}): Promise<EventItem[]> {
    const params = cleanParams({
      eventType: options.eventType ?? "OT",
      year: options.year ?? new Date().getFullYear(),
    });
    return groupedRecords(await this.get("events", params), "events") as EventItem[];
  }

  async getTopEvents(options: EventOptions = {}): Promise<EventItem[]> {
    const params = cleanParams({
      top: true,
      eventType: options.eventType ?? "OT",
      year: options.year ?? new Date().getFullYear(),
      numberOfRecord: options.numberOfRecord ?? 3,
    });
    const raw = await this.get("events/top", params);
    return Array.isArray(raw) ? raw.filter(isRecord) as EventItem[] : [];
  }

  async getMarketStatus(): Promise<MarketStatus> {
    const raw = await this.post("marketStatus");
    const root = asRecord(raw, "marketStatus");
    const status = stringValue(root.status);

    if (!status) {
      throw new CseEmptyDataError("marketStatus", "No market status returned.");
    }

    return { status, raw: root };
  }

  async getMarketSummary(): Promise<MarketSummary> {
    return asRecord(await this.post("marketSummery"), "marketSummery") as MarketSummary;
  }

  async getAspi(): Promise<IndexData> {
    return asRecord(await this.post("aspiData"), "aspiData") as IndexData;
  }

  async getSnpSriLanka20(): Promise<IndexData> {
    return asRecord(await this.post("snpData"), "snpData") as IndexData;
  }

  async getSectors(): Promise<Sector[]> {
    return this.topLevelArray("allSectors");
  }

  async getDetailedTrades(symbol?: string): Promise<DetailedTradeRow[]> {
    return this.objectArray("detailedTrades", "reqDetailTrades", symbol ? { symbol } : {});
  }

  async getDailyMarketSummary(): Promise<JsonObject[]> {
    const raw = await this.post("dailyMarketSummery");
    return topLevelRecords(raw, "dailyMarketSummery");
  }

  private async resolveSecurityId(symbol: string): Promise<number> {
    const cached = this.securityIdCache.get(symbol);
    if (cached !== undefined) {
      return cached;
    }

    const company = await this.getCompany(symbol);
    if (company.securityId === undefined) {
      throw new CseEmptyDataError("companyInfoSummery", `No securityId returned for ${symbol}.`);
    }

    return company.securityId;
  }

  private async objectArray<T extends JsonObject>(
    endpoint: string,
    property: string,
    data: Record<string, string | number | boolean | null | undefined> = {},
  ): Promise<T[]> {
    const raw = await this.post(endpoint, data);
    const root = asRecord(raw, endpoint);
    return arrayProperty(root, property) as T[];
  }

  private async topLevelArray<T extends JsonObject>(endpoint: string): Promise<T[]> {
    const raw = await this.post(endpoint);
    return topLevelRecords(raw, endpoint) as T[];
  }

  private async getTopLevelArray<T extends JsonObject>(
    endpoint: string,
    params: Record<string, string | number | boolean | null | undefined> = {},
  ): Promise<T[]> {
    const raw = await this.get(endpoint, params);
    return topLevelRecords(raw, endpoint) as T[];
  }

  private async getContentArray<T extends JsonObject>(
    endpoint: string,
    params: Record<string, string | number | boolean | null | undefined> = {},
  ): Promise<T[]> {
    const raw = await this.get(endpoint, params);
    const root = asRecord(raw, endpoint);
    return arrayProperty(root, "content") as T[];
  }

  private async get(
    endpoint: string,
    params: Record<string, string | number | boolean | null | undefined> = {},
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    }

    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/${endpoint}${suffix}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": this.userAgent,
        },
        signal: controller.signal,
      });
    } catch (error) {
      throw new CseApiError(`Request to ${endpoint} failed: ${errorMessage(error)}`, { endpoint });
    } finally {
      clearTimeout(timeout);
    }

    return parseResponse(endpoint, response);
  }

  private async post(
    endpoint: string,
    data: Record<string, string | number | boolean | null | undefined> = {},
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const body = new URLSearchParams();

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        body.set(key, String(value));
      }
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/${endpoint}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": this.userAgent,
        },
        body,
        signal: controller.signal,
      });
    } catch (error) {
      throw new CseApiError(`Request to ${endpoint} failed: ${errorMessage(error)}`, { endpoint });
    } finally {
      clearTimeout(timeout);
    }

    return parseResponse(endpoint, response);
  }

  private requireSymbol(symbol: string): void {
    if (!symbol || symbol.trim() === "") {
      throw new CseValidationError("symbol is required.");
    }
  }

  private requireChartPeriod(period: ChartPeriod): void {
    if (!CHART_PERIODS.has(period)) {
      throw new CseValidationError("period must be one of 1, 7, 30, 90, or 365.");
    }
  }
}

function normalizeChartPoint(raw: JsonObject): CompanyChartPoint {
  return {
    high: numberValue(raw.h),
    low: numberValue(raw.l),
    open: nullableNumber(raw.o),
    sequence: numberValue(raw.s),
    quantity: numberValue(raw.q),
    price: numberValue(raw.p),
    change: nullableNumber(raw.c),
    percentChange: nullableNumber(raw.pc),
    timestamp: numberValue(raw.t),
    name: nullableString(raw.n),
    id: numberValue(raw.id),
    raw,
  };
}

function normalizeMarketChartPoint(raw: JsonObject): MarketChartPoint {
  return {
    date: numberValue(raw.d),
    value: numberValue(raw.v),
    percentChange: nullableNumber(raw.pc),
    raw,
  };
}

function asRecord(value: unknown, endpoint: string): JsonObject {
  if (!isRecord(value)) {
    throw new CseEmptyDataError(endpoint, `Expected ${endpoint} to return a JSON object.`);
  }

  return value;
}

function optionalRecord(value: unknown): JsonObject | undefined {
  return isRecord(value) ? value : undefined;
}

function arrayProperty(root: JsonObject, property: string): JsonObject[] {
  const value = root[property];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
}

function topLevelRecords(value: unknown, endpoint: string): JsonObject[] {
  if (!Array.isArray(value)) {
    throw new CseEmptyDataError(endpoint, `Expected ${endpoint} to return a JSON array.`);
  }

  return value.flatMap((item) => {
    if (Array.isArray(item)) {
      return item.filter(isRecord);
    }

    return isRecord(item) ? [item] : [];
  });
}

function groupedRecords(value: unknown, endpoint: string): JsonObject[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  const root = asRecord(value, endpoint);
  return Object.values(root).flatMap((item) => Array.isArray(item) ? item.filter(isRecord) : []);
}

function cleanParams(
  params: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, string | number | boolean] => (
      entry[1] !== undefined && entry[1] !== null
    )),
  );
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nullableNumber(value: unknown): number | null | undefined {
  return value === null ? null : numberValue(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function nullableString(value: unknown): string | null | undefined {
  return value === null ? null : stringValue(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function parseResponse(endpoint: string, response: Response): Promise<unknown> {
  const text = await response.text();

  if (!response.ok) {
    throw new CseApiError(`CSE API request failed for ${endpoint} with HTTP ${response.status}.`, {
      endpoint,
      status: response.status,
      body: text.slice(0, 500),
    });
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new CseApiError(`CSE API returned invalid JSON for ${endpoint}: ${errorMessage(error)}`, {
      endpoint,
      status: response.status,
      body: text.slice(0, 500),
    });
  }
}
