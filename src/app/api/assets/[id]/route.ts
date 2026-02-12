import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { mapAssetRow } from "@/lib/models/asset";

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
    if (body.quantity !== undefined) {
      const quantity = Number(body.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json(
          { ok: false, error: "Invalid quantity" },
          { status: 400 },
        );
      }
    }
    if (body.pricePerCoin !== undefined) {
      const pricePerCoin = Number(body.pricePerCoin);
      if (!Number.isFinite(pricePerCoin) || pricePerCoin <= 0) {
        return NextResponse.json(
          { ok: false, error: "Invalid pricePerCoin" },
          { status: 400 },
        );
      }
    }
    if (body.type !== undefined && body.type !== "buy" && body.type !== "sell") {
      return NextResponse.json(
        { ok: false, error: "Invalid type" },
        { status: 400 },
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      updates.push("name = ?");
      values.push(String(body.name));
    }
    if (body.quantity !== undefined) {
      updates.push("quantity = ?");
      values.push(Number(body.quantity));
    }
    if (body.pricePerCoin !== undefined) {
      updates.push("price_per_coin = ?");
      values.push(Number(body.pricePerCoin));
    }
    if (body.type !== undefined) {
      updates.push("transaction_type = ?");
      values.push(body.type === "sell" ? "sell" : "buy");
    }
    if (body.date !== undefined) {
      updates.push("transaction_date = ?");
      values.push(body.date ? String(body.date) : null);
    }
    if (body.notes !== undefined) {
      updates.push("notes = ?");
      values.push(body.notes ? String(body.notes) : null);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No fields to update" },
        { status: 400 },
      );
    }

    values.push(id);
    await pool.execute(`UPDATE asset SET ${updates.join(", ")} WHERE id = ?`, [
      ...values,
    ]);

    const [rows] = await pool.query("SELECT * FROM asset WHERE id = ?", [id]);
    const asset = (rows as Record<string, unknown>[])[0];
    if (!asset) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, asset: mapAssetRow(asset) });
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

    await pool.execute("DELETE FROM asset WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
