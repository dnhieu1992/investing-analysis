import { NextRequest, NextResponse } from "next/server";
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isFinite(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      updates.push("name = ?");
      values.push(String(body.name));
    }
    if (body.openDate !== undefined) {
      updates.push("open_date = ?");
      values.push(String(body.openDate));
    }
    if (body.closeDate !== undefined) {
      updates.push("close_date = ?");
      values.push(body.closeDate ? String(body.closeDate) : null);
    }
    if (body.openPrice !== undefined) {
      updates.push("open_price = ?");
      values.push(Number(body.openPrice));
    }
    if (body.closePrice !== undefined) {
      updates.push("close_price = ?");
      values.push(body.closePrice === null ? null : Number(body.closePrice));
    }
    if (body.notes !== undefined) {
      updates.push("notes = ?");
      values.push(body.notes ? String(body.notes) : null);
    }
    if (body.source !== undefined) {
      updates.push("source = ?");
      values.push(body.source ? String(body.source) : null);
    }
    if (body.orderType !== undefined) {
      updates.push("order_type = ?");
      values.push(
        body.orderType === "scaping" || body.orderType === "swing"
          ? body.orderType
          : null,
      );
    }
    if (body.type !== undefined) {
      updates.push("type = ?");
      values.push(body.type === "short" ? "short" : "long");
    }
    if (body.level !== undefined) {
      updates.push("level = ?");
      values.push(Number(body.level));
    }
    if (body.volume !== undefined) {
      updates.push("volume = ?");
      values.push(Number(body.volume));
    }
    if (body.strateryId !== undefined) {
      updates.push("stratery_id = ?");
      values.push(body.strateryId === null ? null : Number(body.strateryId));
    }
    if (body.referenceImages !== undefined) {
      updates.push("reference_images = ?");
      const referenceImages = normalizeReferenceImages(body.referenceImages);
      values.push(
        referenceImages === null ? null : JSON.stringify(referenceImages),
      );
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No fields to update" },
        { status: 400 },
      );
    }

    values.push(id);
    await pool.execute(
      `UPDATE trading_history SET ${updates.join(", ")} WHERE id = ?`,
      [...values],
    );

    const [rows] = await pool.query(
      `SELECT trading_history.*, stratery.name AS stratery_name
       FROM trading_history
       LEFT JOIN stratery ON trading_history.stratery_id = stratery.id
       WHERE trading_history.id = ?`,
      [id],
    );
    const trade = (rows as Record<string, unknown>[])[0];
    if (!trade) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, trade: mapTradingHistoryRow(trade) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isFinite(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    await pool.execute("DELETE FROM trading_history WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
