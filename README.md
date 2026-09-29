# Imprint

1/1 NFT passport on **Base**. Mint on the website for **$4**, paid in ETH.

Each token is a unique **type** from that wallet’s Base activity — transactions, age, tokens, NFTs, and Basename. More activity fills more cells. OpenSea rarity comes from on-chain attributes.

## Utility

| What | How |
|---|---|
| **Passport** | Any contract calls `passport(address)` and gets token id, packed traits, type name, rarity score, and whether they still hold it. Use that to gate launches, fees, or allowlists. |
| **OpenSea rarity** | `tokenURI` is on-chain JSON + SVG with Type, Rarity, Handle, Reach, Voice, Heat, Native, Bags, Vintage, Named, Rarity Score. Handle is 1/1. |
| **Refresh** | If their X or Base activity grew, the holder updates the same token for **$1** in ETH. Art fills in; type can upgrade. |
| **Royalty** | 5% EIP-2981 to the owner. |

One mint per wallet.

## Website

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000

Connect a Base wallet to preview. We read the chain. Mint is live after the contract is deployed and `NEXT_PUBLIC_CONTRACT` + `SIGNER_PRIVATE_KEY` are set.

## Contract

```bash
cd contracts
# .env: PRIVATE_KEY, RPC_URL, optional SIGNER / OWNER
forge test
forge script script/Deploy.s.sol --rpc-url $env:RPC_URL --broadcast --private-key $env:PRIVATE_KEY
```

Writes `contracts/deployed.json`. Put that address in `web/.env.local` as `NEXT_PUBLIC_CONTRACT`. The signer key in the website **must** be the contract `signer`.

Live on Base (`8453`):

| | |
|---|---|
| Imprint | [`0xbc162E16E3BB4f8dd25B47a908E211BD413B3a62`](https://basescan.org/address/0xbc162E16E3BB4f8dd25B47a908E211BD413B3a62#code) |
| Deploy tx | [`0xfa9cdc8b…e7a9bd`](https://basescan.org/tx/0xfa9cdc8b0074de81d3e4347822d6ffd081dae6b34294988c1767d1af26e7a9bd) |

Price: **$4** mint, **$1** refresh, paid in ETH via Chainlink ETH/USD.

After a successful mint the site opens a **Share on X** composer with the type, rarity, and OpenSea link.

## OpenSea collection art

Upload these in the OpenSea collection settings:

| OpenSea field | File | Size |
|---|---|---|
| Logo / profile | `brand/opensea-logo.png` (or `brand/opensea-logo-350.png`) | 1400×1400 / 350×350 |
| Banner | `brand/opensea-banner.png` | 1400×400 |

Copies also live in `web/public/` as `opensea-logo.png`, `opensea-banner.png`, and `og.png`.

Do not commit `.env`, `.env.local`, private keys, or `ETHERSCAN_API_KEY`. Use the `.env.example` files.
