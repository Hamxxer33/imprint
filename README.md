# Imprint

1/1 NFT passport on **Base**. Mint on the website for **$4**, paid in ETH.

Each token is a unique **type** from that wallet’s Base activity — transactions, age, tokens, NFTs, and Basename. One grid, no username, no labels. Quiet wallets get big blocks; active wallets get small ones. OpenSea rarity comes from on-chain attributes.

## Utility

| What | How |
|---|---|
| **Passport** | Any contract calls `passport(address)` and gets token id, packed traits, type name, rarity score, and whether they still hold it. Use that to gate launches, fees, or allowlists. |
| **OpenSea rarity** | `tokenURI` is on-chain JSON + SVG with Type, Rarity, Network, Activity, Heat, Native, Bags, Vintage, Named, Rarity Score. The SVG has no text. |
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
| Imprint | [`0x9F9801C4ab9feB470116bc881aeC935E51eA34c6`](https://basescan.org/address/0x9F9801C4ab9feB470116bc881aeC935E51eA34c6#code) |
| Deploy tx | [`0xe77c9231…c48f9f`](https://basescan.org/tx/0xe77c9231cad0e75511a290b4bc1abfce16693dbac25bc790a5e0f6a7d1c48f9f) |

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
