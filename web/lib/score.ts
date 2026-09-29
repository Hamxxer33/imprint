import { createPublicClient, formatEther, http, parseAbi, type Address } from "viem";
import { chain, chainId, rpcUrl } from "./chain";
import { clampByte, logScale, type Scores } from "./traits";

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;
const BLOCKSCOUT =
  chainId === 84532 ? "https://base-sepolia.blockscout.com/api/v2" : "https://base.blockscout.com/api/v2";

const client = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

export type WalletStats = {
  nonce: number;
  eth: number;
  usdc: number;
  named: boolean;
  basename?: string;
  txCount: number;
  tokenTransfers: number;
  uniqueContracts: number;
  recentTxs: number;
  nftCount: number;
  firstTxAt?: number;
};

type AddressInfo = {
  ens_domain_name?: string | null;
  name?: string | null;
  transactions_count?: string | number | null;
  token_transfers_count?: string | number | null;
};

type TxItem = {
  timestamp?: string;
  to?: { hash?: string } | string | null;
};

type TxPage = { items?: TxItem[] };
type TokenPage = { items?: unknown[] };

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function asCount(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function scoreWallet(address: Address): Promise<WalletStats> {
  const [nonce, balance, usdcRaw, info, txs, nfts, tokens] = await Promise.all([
    client.getTransactionCount({ address }),
    client.getBalance({ address }),
    chainId === 8453
      ? client
          .readContract({
            address: USDC_BASE,
            abi: parseAbi(["function balanceOf(address) view returns (uint256)"]),
            functionName: "balanceOf",
            args: [address],
          })
          .catch(() => 0n)
      : Promise.resolve(0n),
    getJson<AddressInfo>(`${BLOCKSCOUT}/addresses/${address}`),
    getJson<TxPage>(`${BLOCKSCOUT}/addresses/${address}/transactions?items_count=50`),
    getJson<TokenPage>(`${BLOCKSCOUT}/addresses/${address}/nft?type=ERC-721%2CERC-1155`),
    getJson<TokenPage>(`${BLOCKSCOUT}/addresses/${address}/tokens?type=ERC-20`),
  ]);

  let basename: string | undefined;
  let named = false;
  try {
    const ens = await client.getEnsName({ address });
    if (ens) {
      basename = ens.replace(/\.base\.eth$/i, "").replace(/\./g, "-");
      named = true;
    }
  } catch {
    named = false;
  }
  if (!basename && info?.ens_domain_name) {
    basename = info.ens_domain_name.replace(/\.base\.eth$/i, "").replace(/\./g, "-");
    named = true;
  }

  const items = txs?.items ?? [];
  const unique = new Set<string>();
  let recentTxs = 0;
  let firstTxAt: number | undefined;
  const cutoff = Date.now() - 30 * 86400000;
  for (const tx of items) {
    const to = typeof tx.to === "string" ? tx.to : tx.to?.hash;
    if (to) unique.add(to.toLowerCase());
    const ts = tx.timestamp ? Date.parse(tx.timestamp) : NaN;
    if (Number.isFinite(ts)) {
      if (ts >= cutoff) recentTxs++;
      if (!firstTxAt || ts < firstTxAt) firstTxAt = ts;
    }
  }

  const txCount = Math.max(nonce, asCount(info?.transactions_count), items.length);
  const tokenTransfers = Math.max(asCount(info?.token_transfers_count), tokens?.items?.length ?? 0);

  return {
    nonce,
    eth: Number(formatEther(balance)),
    usdc: Number(usdcRaw) / 1e6,
    named,
    basename,
    txCount,
    tokenTransfers,
    uniqueContracts: unique.size,
    recentTxs,
    nftCount: nfts?.items?.length ?? 0,
    firstTxAt,
  };
}

export function buildScores(wallet: WalletStats): Scores {
  const ageDays = wallet.firstTxAt ? (Date.now() - wallet.firstTxAt) / 86400000 : 0;
  const usd = wallet.eth * 2700 + wallet.usdc;
  return {
    vintage: ageDays > 0 ? clampByte(ageDays / 14) : logScale(wallet.nonce, 200),
    reach: logScale(wallet.uniqueContracts + wallet.tokenTransfers, 400),
    voice: logScale(wallet.txCount, 5_000),
    heat: logScale(wallet.recentTxs, 80),
    native: logScale(wallet.nonce, 5_000),
    bags: logScale(usd, 30_000),
    named: wallet.named ? 255 : wallet.nftCount > 0 ? 120 : 0,
  };
}
