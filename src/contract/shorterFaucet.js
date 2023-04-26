import { getGasParams } from "@/utils/gas";
import { outContract, getContractAddress } from "@/contract";
import tokenJson from "@/abis/ShorterFaucet.json";
import { useWallet } from "@/hooks/useWallet";

/**
 * @description: 获取合约对象方法
 * @param {*}
 * @return {*}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.ShorterFaucet) {
    console.log("ipi_contract_address ShorterFaucet not found");
    return;
  }
  const contract = await outContract(tokenJson, contractAddress.ShorterFaucet, flag);
  return contract;
}

/**
 * @description: 向当前用户转账/领取测试币
 * @param {*}
 * @return {*}
 */
export async function getTestToken(tokenAddress) {
  const { account } = useWallet();
  const contract = await getContract(true);

  const gasParams = await getGasParams(contract, "transfer", account.value, tokenAddress);
  const tx = await contract.transfer(account.value, tokenAddress, gasParams);
  const res = await tx.wait();
  return res;
}

/**
 * @description: 获取上一次领取指定币种的时间
 * @param {*} tokenAddress
 * @return {*}
 */
export async function getUserTokenBlocks(tokenAddress) {
  const { account } = useWallet();
  const contract = await getContract();
  let res = await contract.userTokenBlocks(account.value, tokenAddress);
  return res;
}
