import { http, createConfig } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { base, baseSepolia } from "wagmi/chains";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "b56e18d47c72ab683b10814fe9495694";

const metadata = {
  name: "Imprint",
  description: "Mint your Base passport",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  icons: ["http://localhost:3000/icon.svg"],
};

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    walletConnect({
      projectId,
      showQrModal: true,
      metadata,
    }),
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
  ssr: true,
});
