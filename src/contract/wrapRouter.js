import { getContractAddress, outContract } from "@/contract";
import tokenJson from "../abis/WrapRouter.json";

export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.Podium) {
    console.log("WrapRouter's address is not found in config");
    return;
  }

  const contract = await outContract(tokenJson, contractAddress.WrapRouter, flag);
  return contract;
}

export async function controvertibleAmounts(strToken) {
  const contract = await getContract();
  const balance = await contract.controvertibleAmounts(strToken);
  return balance;
}
