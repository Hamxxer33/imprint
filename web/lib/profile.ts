import { concat, keccak256, type Address } from "viem";
import { renderSvg } from "./art";
import {
  openseaAttributes,
  packTraits,
  rarityName,
  rarityScore,
  sanitizeHandle,
  typeName,
  walletXId,
} from "./traits";
import { buildScores, scoreWallet } from "./score";

export async function buildProfile(address: Address) {
  const wallet = await scoreWallet(address);
  const scores = buildScores(wallet);
  const handle = sanitizeHandle(wallet.basename || address.slice(2, 8));
  const xId = walletXId(address);
  const entropy = keccak256(concat([address, xId]));
  const traits = packTraits(scores, entropy);
  const score = rarityScore(scores);
  const svg = renderSvg(1, traits, scores, handle);
  return {
    address,
    handle,
    xId,
    traits,
    scores,
    typeName: typeName(scores),
    rarity: rarityName(score),
    rarityScore: score,
    stats: {
      txCount: wallet.txCount,
      nonce: wallet.nonce,
      eth: wallet.eth,
      usdc: wallet.usdc,
      nfts: wallet.nftCount,
      contracts: wallet.uniqueContracts,
      basename: wallet.basename ?? null,
    },
    svg,
    attributes: openseaAttributes(scores, handle),
  };
}
