import { NextRequest, NextResponse } from "next/server";
import { isAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { contractAddress } from "@/lib/chain";
import { domain, mintTypes, refreshTypes } from "@/lib/eip712";
import { buildProfile } from "@/lib/profile";

function signer() {
  const key = process.env.SIGNER_PRIVATE_KEY as Hex | undefined;
  if (!key) return null;
  return privateKeyToAccount(key);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { address?: string; mode?: "mint" | "refresh"; tokenId?: string };
  if (!body.address || !isAddress(body.address)) {
    return NextResponse.json({ error: "bad address" }, { status: 400 });
  }
  const account = signer();
  if (!account || !contractAddress) {
    return NextResponse.json({ error: "signer or contract not configured" }, { status: 503 });
  }
  const profile = await buildProfile(body.address as Address);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  if (body.mode === "refresh") {
    const tokenId = BigInt(body.tokenId || "0");
    const signature = await account.signTypedData({
      domain: domain(contractAddress),
      types: refreshTypes,
      primaryType: "Refresh",
      message: {
        account: body.address as Address,
        tokenId,
        traits: profile.traits,
        handle: profile.handle,
        deadline,
      },
    });
    return NextResponse.json({
      ...profile,
      deadline: deadline.toString(),
      signature,
    });
  }
  const signature = await account.signTypedData({
    domain: domain(contractAddress),
    types: mintTypes,
    primaryType: "Mint",
    message: {
      account: body.address as Address,
      xId: profile.xId,
      traits: profile.traits,
      handle: profile.handle,
      deadline,
    },
  });
  return NextResponse.json({
    ...profile,
    deadline: deadline.toString(),
    signature,
  });
}
