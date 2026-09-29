import { base, baseSepolia } from "wagmi/chains";
import type { Address, Hex } from "viem";

export const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "8453");
export const chain = chainId === 84532 ? baseSepolia : base;
export const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ??
  (chainId === 84532 ? "https://sepolia.base.org" : "https://mainnet.base.org");
export const contractAddress = (process.env.NEXT_PUBLIC_CONTRACT ?? "") as Address | "";

export function explorerTx(hash: Hex): string {
  const host = chainId === 84532 ? "sepolia.basescan.org" : "basescan.org";
  return `https://${host}/tx/${hash}`;
}

export function openseaUrl(id: number): string {
  const slug = chainId === 84532 ? "base_sepolia" : "base";
  if (!contractAddress) return "https://opensea.io";
  return `https://opensea.io/item/${slug}/${contractAddress}/${id}`;
}

export function collectionUrl(): string {
  const slug = chainId === 84532 ? "base_sepolia" : "base";
  if (!contractAddress) return "https://opensea.io";
  return `https://opensea.io/assets/${slug}/${contractAddress}`;
}

export function shareMintUrl(opts: {
  typeName: string;
  rarity: string;
  tokenId?: number;
  mode?: "mint" | "refresh";
}): string {
  const link = opts.tokenId && opts.tokenId > 0 ? openseaUrl(opts.tokenId) : collectionUrl();
  const lead =
    opts.mode === "refresh" ? "Updated my Imprint on Base." : "I just minted my Imprint on Base.";
  const text = `${lead}\n\n${opts.typeName} · ${opts.rarity}\n1/1 from my wallet.\n\n${link}`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}
