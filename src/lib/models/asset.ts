export type TransactionType = "buy" | "sell";

export type Asset = {
  id: number;
  name: string;
  quantity: number;
  pricePerCoin: number;
  type: TransactionType;
  date: Date | null;
  notes: string | null;
};

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function mapAssetRow(row: Record<string, unknown>): Asset {
  const record = row as Record<string, unknown>;
  return {
    id: Number(record.id),
    name: String(record.name),
    quantity: Number(record.quantity),
    pricePerCoin: Number(record.price_per_coin),
    type: record.transaction_type === "sell" ? "sell" : "buy",
    date: parseDate(record.transaction_date),
    notes: record.notes == null ? null : String(record.notes),
  };
}
