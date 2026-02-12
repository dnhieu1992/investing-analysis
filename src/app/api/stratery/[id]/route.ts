import { NextRequest, NextResponse } from "next/server";
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
    if (body.description !== undefined) {
      updates.push("description = ?");
      values.push(body.description ? String(body.description) : null);
    }
    if (body.imageReferences !== undefined) {
      updates.push("image_references = ?");
      const imageReferences = normalizeImageReferences(body.imageReferences);
      values.push(
        imageReferences === null ? null : JSON.stringify(imageReferences),
      );
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No fields to update" },
        { status: 400 },
      );
    }

    values.push(id);
    await pool.execute(`UPDATE stratery SET ${updates.join(", ")} WHERE id = ?`, [
      ...values,
    ]);

    const [rows] = await pool.query("SELECT * FROM stratery WHERE id = ?", [id]);
    const stratery = (rows as Record<string, unknown>[])[0];
    if (!stratery) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, stratery: mapStrateryRow(stratery) });
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

    await pool.execute("DELETE FROM stratery WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
