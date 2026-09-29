"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { base } from "wagmi/chains";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button className="btn btn-ghost" onClick={() => disconnect()} type="button">
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  const walletConnect = connectors.find((c) => c.id === "walletConnect") ?? connectors[0];

  return (
    <button
      className="btn"
      disabled={isPending || !walletConnect}
      onClick={() => {
        if (!walletConnect) return;
        connect({ connector: walletConnect, chainId: base.id });
      }}
      type="button"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
