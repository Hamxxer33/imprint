"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { imprintAbi } from "@/lib/abi";
import { contractAddress, explorerTx, openseaUrl, shareMintUrl } from "@/lib/chain";
import { label, type Scores } from "@/lib/traits";
import { ConnectWallet } from "@/components/ConnectWallet";

type Profile = {
  handle: string;
  xId: `0x${string}`;
  traits: `0x${string}`;
  scores: Scores;
  typeName: string;
  rarity: string;
  rarityScore: number;
  svg: string;
  stats?: {
    txCount: number;
    nonce: number;
    eth: number;
    usdc: number;
    nfts: number;
    contracts: number;
    basename: string | null;
  };
};

export function MintApp() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending: writing, error: writeError } = useWriteContract();
  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<"mint" | "refresh">("mint");

  const minted = useReadContract({
    address: contractAddress || undefined,
    abi: imprintAbi,
    functionName: "mintedToken",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(contractAddress && address) },
  });
  const alreadyMinted = Boolean(minted.data && minted.data > 0n);
  const quoteMint = useReadContract({
    address: contractAddress || undefined,
    abi: imprintAbi,
    functionName: "quoteMint",
    query: { enabled: Boolean(contractAddress) },
  });
  const quoteRefresh = useReadContract({
    address: contractAddress || undefined,
    abi: imprintAbi,
    functionName: "quoteRefresh",
    query: { enabled: Boolean(contractAddress) },
  });

  useEffect(() => {
    if (isSuccess) void minted.refetch();
  }, [isSuccess]);

  useEffect(() => {
    if (!address) {
      setProfile(null);
      return;
    }
    setBusy(true);
    setErr(null);
    fetch(`/api/profile?address=${address}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "profile failed");
        setProfile(data);
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setBusy(false));
  }, [address]);

  const svgUrl = useMemo(() => {
    if (!profile) return "";
    return `data:image/svg+xml;utf8,${encodeURIComponent(profile.svg)}`;
  }, [profile]);

  async function mint(mode: "mint" | "refresh") {
    if (!address || !contractAddress) return;
    setErr(null);
    setBusy(true);
    setLastMode(mode);
    try {
      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          mode,
          tokenId: minted.data ? minted.data.toString() : "0",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "sign failed");
      if (mode === "refresh") {
        if (!quoteRefresh.data) throw new Error("price quote missing");
        writeContract({
          address: contractAddress,
          abi: imprintAbi,
          functionName: "refresh",
          args: [data.traits, data.handle, BigInt(data.deadline), data.signature],
          value: quoteRefresh.data,
        });
      } else {
        if (!quoteMint.data) throw new Error("price quote missing");
        writeContract({
          address: contractAddress,
          abi: imprintAbi,
          functionName: "mint",
          args: [data.xId, data.traits, data.handle, BigInt(data.deadline), data.signature],
          value: quoteMint.data,
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "mint failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-faint uppercase">Base · $4</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Imprint</h1>
        </div>
        <ConnectWallet />
      </header>

      <section className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div>
          <div className="overflow-hidden rounded-2xl border border-line bg-well">
            {svgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Your Imprint" className="w-full bg-white" src={svgUrl} />
            ) : (
              <div className="flex aspect-square items-center justify-center text-sm text-faint">
                {busy ? (
                  "Reading wallet…"
                ) : (
                  <div className="flex flex-col items-center gap-4 px-6 text-center">
                    <p>Connect Wallet to see your imprint from your Base transactions</p>
                    <ConnectWallet />
                  </div>
                )}
              </div>
            )}
          </div>
          {profile ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold">{profile.typeName}</span>
              <span className="text-faint">{profile.rarity}</span>
              <span className="font-mono text-faint">score {profile.rarityScore}</span>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-line p-5">
            <h2 className="text-sm font-semibold">Mint on this site</h2>
            <p className="mt-2 text-sm leading-6 text-mute">
              Pay <span className="tnum font-medium text-ink">$4</span> in ETH on Base. We read your transactions,
              age, tokens, NFTs, and Basename, then mint a 1/1 type. OpenSea reads the traits for rarity.
            </p>
            {profile?.stats ? (
              <p className="mt-3 font-mono text-[11px] leading-5 text-faint">
                {profile.stats.txCount} txs · {profile.stats.contracts} contracts · {profile.stats.nfts} nfts ·{" "}
                {profile.stats.eth.toFixed(4)} ETH
              </p>
            ) : null}
            <div className="mt-4 flex flex-col gap-2">
              {alreadyMinted ? (
                <button
                  className="btn w-full"
                  disabled={busy || writing || waiting || !contractAddress}
                  onClick={() => mint("refresh")}
                  type="button"
                >
                  {waiting || writing ? "Refreshing…" : "Refresh imprint · $1"}
                </button>
              ) : (
                <button
                  className="btn w-full"
                  disabled={!isConnected || busy || writing || waiting || !contractAddress}
                  onClick={() => mint("mint")}
                  type="button"
                >
                  {waiting || writing ? "Minting…" : "Mint · $4"}
                </button>
              )}
            </div>
            {!contractAddress ? (
              <p className="mt-3 text-xs text-faint">Deploy the contract, then set NEXT_PUBLIC_CONTRACT to enable mint.</p>
            ) : null}
            {err || writeError ? (
              <p className="mt-3 text-xs text-magenta">{err || (writeError instanceof Error ? writeError.message : writeError ? String(writeError) : "")}</p>
            ) : null}
            {isSuccess && hash ? (
              <div className="mt-4 space-y-3">
                <a
                  className="btn w-full"
                  href={shareMintUrl({
                    typeName: profile?.typeName ?? "Imprint",
                    rarity: profile?.rarity ?? "Unique",
                    tokenId: minted.data && minted.data > 0n ? Number(minted.data) : undefined,
                    mode: lastMode,
                  })}
                  rel="noreferrer"
                  target="_blank"
                >
                  Share on X
                </a>
                <p className="text-xs">
                  <a className="underline" href={explorerTx(hash)} rel="noreferrer" target="_blank">
                    View transaction
                  </a>
                  {minted.data && minted.data > 0n ? (
                    <>
                      {" · "}
                      <a
                        className="underline"
                        href={openseaUrl(Number(minted.data))}
                        rel="noreferrer"
                        target="_blank"
                      >
                        OpenSea
                      </a>
                    </>
                  ) : null}
                </p>
              </div>
            ) : null}
          </div>

          {profile ? (
            <ul className="grid grid-cols-2 gap-2 text-xs">
              {(
                [
                  ["Network", "reach"],
                  ["Activity", "voice"],
                  ["Heat", "heat"],
                  ["Native", "native"],
                  ["Bags", "bags"],
                  ["Vintage", "vintage"],
                ] as const
              ).map(([name, key]) => (
                <li className="rounded-xl border border-line px-3 py-2" key={key}>
                  <div className="text-faint">{name}</div>
                  <div className="mt-0.5 font-medium">{label(key, profile.scores[key])}</div>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        <Utility
          title="Passport"
          body="Other contracts call passport(address) and read your type, rarity score, and whether you still hold the token. That is the gate."
        />
        <Utility
          title="OpenSea rarity"
          body="Type, rarity tier, and wallet scores land in tokenURI attributes. OpenSea ranks the collection from those traits. Each wallet is 1/1."
        />
        <Utility
          title="Refresh"
          body="If your Base activity grows, holders can refresh the same token for $1 in ETH. The art fills in. The type can upgrade."
        />
      </section>
    </main>
  );
}

function Utility({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-mute">{body}</p>
    </div>
  );
}
