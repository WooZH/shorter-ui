import { outContract, getContractAddress } from "@/contract";
import PancakeLPsJSON from "@/abis/PancakeLPs";

export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.PancakeLPs) return;
  try {
    const contract = await outContract(PancakeLPsJSON, contractAddress.PancakeLPs, flag);
    return contract;
  } catch (error) {
    console.log(error, "getContract");
  }
}

export async function getReserves() {
  const contract = await getContract(true);
  const res = await contract.getReserves();
  return res;
}

export async function totalSupply() {
  const contract = await getContract(true);
  const res = await contract.totalSupply();
  return res;
}

export async function token0() {
  const contract = await getContract(true);
  const res = await contract.token0();
  return res;
}

export async function token1() {
  const contract = await getContract(true);
  const res = await contract.token1();
  return res;
}