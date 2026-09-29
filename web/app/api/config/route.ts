import { NextResponse } from "next/server";
import { chainId, contractAddress } from "@/lib/chain";

export async function GET() {
  return NextResponse.json({
    chainId,
    contract: contractAddress || null,
    mintUsd: "4",
    refreshUsd: "1",
  });
}
