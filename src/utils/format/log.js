import { ethers } from "ethers";

/**
 *
 * @param {*} abi
 * @param {*} topic
 * @param {*} values 过滤条件
 * [
    "0x8ba1f109551bD432803012645Ac136ddd64DBA72", sender
    "0x8ba1f109551bD432803012645Ac136ddd64DBA72"  receiver
    ]
 * @returns
 */
export async function encodeFilterTopics(abi, topic, values = []) {
  const iface = new ethers.utils.Interface(abi);
  const result = iface.encodeFilterTopics(topic, values);
  //['0x...','0x...',...]
  return result;
}
