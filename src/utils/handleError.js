import { Message } from "@/hooks/useMessage";
import { useDialog } from "@/hooks/useDialog";

/**
 * @description: 全局统一RPC合约返回错误信息处理
 * @param {*} error
 * @return {*}
 */
export function handleRpcError(error) {
  if (!error) {
    console.error("other RpcError", "local handleRpcError");
    return;
  }
  if (error.code == "TOO_MANY_REQUEST") {
    const { showRPCNotice } = useDialog();
    showRPCNotice();
    return;
  }

  if (error.data && error.data.message) {
    Message.error(error.data.message);
    return;
  }

  if (error.code === -32603) {
    Message.error("JSON-RPC error");
    return;
  }

  if (error.code === 4001) {
    Message.error("Transaction rejected!");
    return;
  }

  console.log(error.message);
  if (error.message) {
    const userReject = "rejected transaction";
    if (error.message.indexOf(userReject) !== -1) {
      Message.error(userReject);
    }
    console.error(error.message, "handleRpcError");
    return;
  }
  Message.error("Unexpected interruption of transaction");
}
