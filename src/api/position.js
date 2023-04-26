import axios from "@/utils/axios";

/**
 * @description: 获取代币的的后台配置信息
 * @param {*}   
 * postion_address: postion的合约地址
   account_address: 正在浏览的账户
   user_type: 浏览状态 0: 查看 1: 发送交易
 */
export function sendAddress(params) {
  return axios.post("/position_address", params);
}
