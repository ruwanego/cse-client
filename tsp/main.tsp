import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@service(#{
  title: "CSE Client",
})
@server("https://www.cse.lk/api", "CSE upstream API")
namespace CseApi;

model ErrorResponse {
  message: string;
  endpoint?: string;
  status?: int32;
}

model Company {
  symbol: string;
  name?: string;
  securityId?: int32;
  lastTradedPrice?: float64;
  change?: float64;
  changePercentage?: float64;
  marketCap?: float64;
  betaValueSpsl?: float64;
  logoPath?: string;
}

model PriceRow {
  symbol: string;
  lastTradedPrice?: float64;
  change?: float64;
  changePercentage?: float64;
}

model TradeSummaryRow {
  symbol: string;
  name?: string;
  quantity?: float64;
  price?: float64;
  turnover?: float64;
  percentageChange?: float64;
}

model DetailedTradeRow {
  symbol: string;
  name?: string;
  price?: float64;
  quantity?: float64;
  trades?: int32;
  change?: float64;
  changePercentage?: float64;
}

model MarketStatus {
  status: string;
}

model MarketSummary {
  tradeVolume?: float64;
  shareVolume?: float64;
  tradeDate?: int64;
  trades?: int32;
}

model IndexData {
  value?: float64;
  lowValue?: float64;
  highValue?: float64;
  change?: float64;
  percentage?: float64;
  timestamp?: int64;
}

model Sector {
  symbol?: string;
  name?: string;
  indexName?: string;
  indexValue?: float64;
  change?: float64;
  percentage?: float64;
}

model SecurityCode {
  id?: int32;
  name?: string;
  symbol?: string;
  active?: int32;
}

model Security {
  securityId?: int32;
  name?: string;
  symbol?: string;
  boardId?: int32;
  deleted?: int32;
}

model CompanyChart {
  symbol: string;
  securityId: int32;
  period: int32;
  points: CompanyChartPoint[];
}

model CompanyChartPoint {
  high?: float64;
  low?: float64;
  open?: float64;
  price?: float64;
  quantity?: float64;
  change?: float64;
  percentChange?: float64;
  timestamp?: int64;
  id?: int64;
}

model MarketChart {
  index: string;
  chartId: int32;
  period: int32;
  points: MarketChartPoint[];
}

model MarketChartPoint {
  date?: int64;
  value?: float64;
  percentChange?: float64;
}

model Announcement {
  id?: int64;
  announcementId?: int64;
  createdDate?: string;
  dateOfAnnouncement?: string;
  company?: string;
  symbol?: string;
  category?: string;
  fileText?: string;
  path?: string;
}

model AnnouncementDetail {
  reqBaseAnnouncement?: Record<unknown>;
  reqAnnouncementDocs?: Record<unknown>[];
}

model CorporateAnnouncementCategory {
  id?: int32;
  categoryName?: string;
  pageName?: string;
  pageView?: string;
  methodName?: string;
}

model NewsItem {
  id?: string;
  title?: string;
  shortDescription?: string;
  publishedDate?: string;
}

model EventItem {
  id?: string;
  eventType?: string;
  title?: string;
  body?: string;
}

model EducationalVideo {
  id?: string;
  link?: string;
  isHome?: boolean;
  lang?: string;
}

model WebsiteNotification {
  id?: string;
  title?: string;
  body?: string;
}

@error
model CseError is ErrorResponse;

@route("/companies/{symbol}")
@get
op getCompany(@path symbol: string): Company | CseError;

@route("/companies/{symbol}/chart")
@get
op getCompanyChart(@path symbol: string, @query period: int32): CompanyChart | CseError;

@route("/companies/{symbol}/announcements")
@get
op getCompanyAnnouncements(@path symbol: string): Announcement[] | CseError;

@route("/market/chart")
@get
op getMarketChart(@query index: string, @query period?: int32): MarketChart | CseError;

@route("/securities/codes")
@get
op getSecurityCodes(): SecurityCode[] | CseError;

@route("/securities")
@get
op getSecurities(): Security[] | CseError;

@route("/prices/today")
@get
op getTodayPrices(): PriceRow[] | CseError;

@route("/trades/summary")
@get
op getTradeSummary(): TradeSummaryRow[] | CseError;

@route("/trades/detailed")
@get
op getDetailedTrades(@query symbol?: string): DetailedTradeRow[] | CseError;

@route("/market/status")
@get
op getMarketStatus(): MarketStatus | CseError;

@route("/market/summary")
@get
op getMarketSummary(): MarketSummary | CseError;

@route("/market/aspi")
@get
op getAspi(): IndexData | CseError;

@route("/market/snp-sri-lanka-20")
@get
op getSnpSriLanka20(): IndexData | CseError;

@route("/market/sectors")
@get
op getSectors(): Sector[] | CseError;

@route("/market/top-gainers")
@get
op getTopGainers(): PriceRow[] | CseError;

@route("/market/top-losers")
@get
op getTopLosers(): PriceRow[] | CseError;

@route("/market/most-active")
@get
op getMostActiveTrades(): PriceRow[] | CseError;

@route("/announcements/{kind}")
@get
op getAnnouncements(@path kind: string): Announcement[] | CseError;

@route("/announcements/detail/{announcementId}")
@get
op getAnnouncement(@path announcementId: int32): AnnouncementDetail | CseError;

@route("/announcements/categories/corporate")
@get
op getCorporateAnnouncementCategories(): CorporateAnnouncementCategory[] | CseError;

@route("/announcements/categories/smd")
@get
op getSmdCategories(): string[] | CseError;

@route("/content/videos")
@get
op getEducationalVideos(): EducationalVideo[] | CseError;

@route("/content/notifications")
@get
op getNotifications(): WebsiteNotification[] | CseError;

@route("/content/news")
@get
op getNews(
  @query type?: string,
  @query top?: boolean,
  @query year?: int32,
  @query security?: string,
  @query numberOfRecord?: int32,
): NewsItem[] | CseError;

@route("/content/events")
@get
op getEvents(
  @query eventType?: string,
  @query year?: int32,
): EventItem[] | CseError;

@route("/content/events/top")
@get
op getTopEvents(
  @query eventType?: string,
  @query year?: int32,
  @query numberOfRecord?: int32,
): EventItem[] | CseError;
