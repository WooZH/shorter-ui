import { outContract, getContractAddress } from "@/contract";
import FarmingImplV2Abi from "@/abis/FarmingImplV2";

import { Transaction } from "@/hooks/useTransaction";

import { getGasParams } from "@/utils/gas";

import { useWallet } from "@/hooks/useWallet";

export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.Farming) return;
  try {
    const contract = await outContract(FarmingImplV2Abi, contractAddress.Farming, flag);
    return contract;
  } catch (error) {
    console.log(error, "getContract");
  }
}

export async function stake(amountA, amountB, LP) {
  const contract = await getContract(true);

  const { account } = useWallet();

  // const gasParams = await getGasParams(contract, "stake", amountA, amountB, LP);

  let tx = await contract.stake(amountA, amountB, LP, {
    // ...gasParams,
    from: account.value,
  });
  console.log("tx wait");
  let results = await tx.wait();
  Transaction(results.transactionHash);
  return results;
}

export async function unStakeV3(LP, amountA, amountB) {
  const contract = await getContract(true);

  const gasParams = await getGasParams(contract, "unStake", LP, amountA, amountB);
  let tx = await contract.unStake(LP, amountA, amountB, gasParams);
  let results = await tx.wait();
  Transaction(results.transactionHash);
  return results;
}

export async function getUserStakedAmount(address) {
  const contract = await getContract(true);
  const res = await contract.getUserStakedAmount(address);
  return res;
}
