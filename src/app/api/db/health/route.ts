import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db";

export async function GET() {
  try {
    await pingDb();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
