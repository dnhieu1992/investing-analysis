import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { mapStrateryRow } from "@/lib/models/stratery";

function normalizeImageReferences(value: unknown): string[] | null {
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
    const [rows] = await pool.query("SELECT * FROM stratery ORDER BY id DESC");
    const strateries = (rows as Record<string, unknown>[]).map(mapStrateryRow);
    return NextResponse.json({ ok: true, strateries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const description = body.description ? String(body.description) : null;
    const imageReferences = normalizeImageReferences(body.imageReferences);

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    const imageReferencesValue =
      imageReferences === null ? null : JSON.stringify(imageReferences);

    const [result] = await pool.execute(
      `INSERT INTO stratery
        (name, description, image_references)
       VALUES (?, ?, ?)`,
      [name, description, imageReferencesValue],
    );

    const insertId = (result as { insertId: number }).insertId;
    const [rows] = await pool.query("SELECT * FROM stratery WHERE id = ?", [
      insertId,
    ]);
    const stratery = mapStrateryRow((rows as Record<string, unknown>[])[0]);

    return NextResponse.json({ ok: true, stratery }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
