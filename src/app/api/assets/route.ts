import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { mapAssetRow } from "@/lib/models/asset";

export async function GET() {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM asset ORDER BY transaction_date DESC, id DESC",
    );
    const assets = (rows as Record<string, unknown>[]).map(mapAssetRow);
    return NextResponse.json({ ok: true, assets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const quantity = Number(body.quantity);
    const pricePerCoin = Number(body.pricePerCoin);
    const type = body.type === "sell" ? "sell" : "buy";
    const date = body.date ? String(body.date) : null;
    const notes = body.notes ? String(body.notes) : null;

    if (
      !name ||
      Number.isNaN(quantity) ||
      Number.isNaN(pricePerCoin) ||
      quantity <= 0 ||
      pricePerCoin <= 0 ||
      !date
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    const [result] = await pool.execute(
      `INSERT INTO asset
        (name, quantity, price_per_coin, transaction_type, transaction_date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, quantity, pricePerCoin, type, date, notes],
    );

    const insertId = (result as { insertId: number }).insertId;
    const [rows] = await pool.query("SELECT * FROM asset WHERE id = ?", [
      insertId,
    ]);
    const asset = mapAssetRow((rows as Record<string, unknown>[])[0]);

    return NextResponse.json({ ok: true, asset }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
