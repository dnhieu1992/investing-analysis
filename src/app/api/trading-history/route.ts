import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { mapTradingHistoryRow } from "@/lib/models/tradingHistory";

function normalizeReferenceImages(value: unknown): string[] | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return null;
}

export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT trading_history.*, stratery.name AS stratery_name
       FROM trading_history
       LEFT JOIN stratery ON trading_history.stratery_id = stratery.id
       ORDER BY trading_history.id DESC`,
    );
    const trades = (rows as Record<string, unknown>[]).map(
      mapTradingHistoryRow,
    );
    return NextResponse.json({ ok: true, trades });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const openDate = String(body.openDate ?? "").trim();
    const closeDate = body.closeDate ? String(body.closeDate) : null;
    const openPrice = Number(body.openPrice);
    const closePrice =
      body.closePrice === null || body.closePrice === undefined
        ? null
        : Number(body.closePrice);
    const notes = body.notes ? String(body.notes) : null;
    const source = body.source ? String(body.source) : null;
    const orderType =
      body.orderType === "scaping" || body.orderType === "swing"
        ? body.orderType
        : null;
    const type = body.type === "short" ? "short" : "long";
    const level = Number(body.level);
    const volume = Number(body.volume);
    const strateryId =
      body.strateryId === null || body.strateryId === undefined
        ? null
        : Number(body.strateryId);
    const referenceImages = normalizeReferenceImages(body.referenceImages);

    if (
      !name ||
      !openDate ||
      Number.isNaN(openPrice) ||
      Number.isNaN(level) ||
      Number.isNaN(volume) ||
      (strateryId !== null && Number.isNaN(strateryId))
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    const referenceImagesValue =
      referenceImages === null ? null : JSON.stringify(referenceImages);

    const [result] = await pool.execute(
      `INSERT INTO trading_history
        (name, open_date, close_date, open_price, close_price, notes, source, order_type, type, level, volume, stratery_id, reference_images)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        openDate,
        closeDate,
        openPrice,
        closePrice,
        notes,
        source,
        orderType,
        type,
        level,
        volume,
        strateryId,
        referenceImagesValue,
      ],
    );

    const insertId = (result as { insertId: number }).insertId;
    const [rows] = await pool.query(
      `SELECT trading_history.*, stratery.name AS stratery_name
       FROM trading_history
       LEFT JOIN stratery ON trading_history.stratery_id = stratery.id
       WHERE trading_history.id = ?`,
      [insertId],
    );
    const trade = mapTradingHistoryRow(
      (rows as Record<string, unknown>[])[0],
    );

    return NextResponse.json({ ok: true, trade }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
