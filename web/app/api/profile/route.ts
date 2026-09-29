import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { buildProfile } from "@/lib/profile";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") ?? "";
  if (!isAddress(address)) {
    return NextResponse.json({ error: "bad address" }, { status: 400 });
  }
  try {
    const profile = await buildProfile(address);
    return NextResponse.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : "profile failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
