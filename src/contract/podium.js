import { getContractAddress, outContract } from "@/contract";
import tokenJson from "../abis/Podium.json";

import * as Transfer from "@/utils/transfer";
import { Transaction } from "@/hooks/useTransaction";
import { getGasParams } from "@/utils/gas";

export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.Podium) {
    console.log("Podium's address is not found in config");
    return;
  }
  const contract = await outContract(tokenJson, contractAddress.Podium, flag);
  return contract;
}

export async function getUserInfo(account, index) {
  const contract = await getContract();
  let userInfo = await contract.userInfo(account, index);
  return {
    isClaimed: userInfo.isClaimed,
    unlockBlock: userInfo.unlockBlock.toString(),
    balance: Transfer.receiveAmount(userInfo.balance.toString(), 18),
  };
}

export async function getClaimableBalance(account) {
  const contract = await getContract();
  let balance = await contract.getClaimableBalance(account);
  return balance;
}

export async function claim() {
  const contract = await getContract(true);

  const gasParams = await getGasParams(contract, "claim");
  const tx = await contract.claim(gasParams);
  const result = await tx.wait();
  Transaction(result.transactionHash);
  return result;
}
