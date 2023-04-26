import { getRPCProvider } from "@/wallet/provider";
import * as Transfer from "@/utils/transfer";

export async function getLog(filter) {
  try {
    const provider = getRPCProvider();
    const callPromise = await provider.getLogs(filter);
    console.log("contract statistic", callPromise);
    let list = callPromise.map(log => transLog(log));
    console.log("contract statistic transLog", list);
    return list;
  } catch (error) {
    console.log(error, "getLog failed");
  }
}

function transLog(log) {
  try {
    return Transfer.receiveAmount(log.data);
  } catch (error) {
    return null;
  }
}
