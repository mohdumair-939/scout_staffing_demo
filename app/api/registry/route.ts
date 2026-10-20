import { NextResponse } from "next/server";
import { REGISTRY } from "@/lib/data/server";
import type { Credential } from "@/lib/data/types";
import { credentialFromRegistry, findRegistryRecord } from "@/lib/matching/pipeline";

/** Mock registry lookup. Simulates a short network round-trip. */
export async function POST(req: Request) {
  let body: { name: string; credential: Credential };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.name || !body.credential?.code) return NextResponse.json({ error: "name and credential are required" }, { status: 400 });
  await new Promise((r) => setTimeout(r, 900));
  const record = findRegistryRecord(REGISTRY, body.name, body.credential);
  const checked = new Date().toISOString().slice(0, 10);
  return NextResponse.json({ found: Boolean(record), record: record ?? null, credential: credentialFromRegistry(body.credential, record, checked) });
}
