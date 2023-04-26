import axios from "@/utils/axios";

export function getLogBlocks(params) {
  return axios.post("/activity", params, { timeout: 0 });
}
