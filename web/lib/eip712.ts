import { type Address, type Hex } from "viem";
import { chain } from "./chain";

export const mintTypes = {
  Mint: [
    { name: "account", type: "address" },
    { name: "xId", type: "bytes32" },
    { name: "traits", type: "bytes32" },
    { name: "handle", type: "string" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export const refreshTypes = {
  Refresh: [
    { name: "account", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "traits", type: "bytes32" },
    { name: "handle", type: "string" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export function domain(verifyingContract: Address) {
  return {
    name: "Imprint",
    version: "1",
    chainId: chain.id,
    verifyingContract,
  };
}

export type MintMessage = {
  account: Address;
  xId: Hex;
  traits: Hex;
  handle: string;
  deadline: bigint;
};
