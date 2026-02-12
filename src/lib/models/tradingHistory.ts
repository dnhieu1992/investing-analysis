export type TradeType = "long" | "short";

export type TradingHistory = {
  id: number;
  name: string;
  openDate: string;
  closeDate: string | null;
  openPrice: number;
  closePrice: number | null;
  notes: string | null;
  source: string | null;
  orderType: "scaping" | "swing" | null;
  type: TradeType;
  level: number;
  volume: number;
  strateryId: number | null;
  strateryName: string | null;
  referenceImages: string[];
};

function parseReferenceImages(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function mapTradingHistoryRow(
  row: Record<string, unknown>,
): TradingHistory {
  const record = row as Record<string, any>;
  return {
    id: Number(record.id),
    name: String(record.name),
    openDate: String(record.open_date),
    closeDate: record.close_date ? String(record.close_date) : null,
    openPrice: Number(record.open_price),
    closePrice:
      record.close_price === null ? null : Number(record.close_price),
    notes: record.notes ?? null,
    source: record.source ?? null,
    orderType:
      record.order_type === "scaping" || record.order_type === "swing"
        ? record.order_type
        : null,
    type: record.type === "short" ? "short" : "long",
    level: Number(record.level),
    volume: Number(record.volume),
    strateryId:
      record.stratery_id === null || record.stratery_id === undefined
        ? null
        : Number(record.stratery_id),
    strateryName: record.stratery_name ? String(record.stratery_name) : null,
    referenceImages: parseReferenceImages(record.reference_images),
  };
}
