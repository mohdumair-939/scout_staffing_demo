import { NextResponse } from "next/server";
import { CANDIDATES } from "@/lib/data/server";

/** All synthetic candidates (static, prerendered at build). Filtering and scoring run in the browser with the pure matching functions. */
export function GET() {
  return NextResponse.json(CANDIDATES);
}
