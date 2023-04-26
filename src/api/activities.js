import axios from "@/utils/axios";
import { getContractAddress } from "@/contract";

export function userCommit(params) {
  return axios.post(getContractAddress().apiUrl + "/activity", params, { timeout: 0 });
}

export function getUserHistory(address, type) {
  return axios.get(`${getContractAddress().apiUrl}/activity?position_address=${address}&user_type=${type}`);
}

export function getParticipateNumber(id) {
  const params = {
    query: `{
      providers(poolId: "${id}")
      traders(poolId: "${id}")
    }`,
  };
  return axios.post(getContractAddress().graphqlUrl, params);
}

