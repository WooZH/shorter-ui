import { ellipsisStr } from "@/utils/format";

export function useNotice() {
  /**
   * @description: chrome, firfox, edge通知
   * @param {*} hash
   * @return {*}
   */
  function noticeLiquidation(hash) {
    if (!("Notification" in window)) {
      return;
    }
    if (!hash) {
      return;
    }
    if (typeof hash !== "string") {
      return;
    }

    const head = window.location.origin + "/liquidations/";
    const strUrl = head + ellipsisStr(hash);
    const body = `Navigate to the detail via the following url. ${strUrl}`;
    const title = "New Liquidation ";
    const iconURL = "https://cdn.shorter.finance/tokens/img/IPISTR.png";

    if (Notification.permission === "granted") {
      createNotification(title, body, head, hash, iconURL);
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          createNotification(title, body, head, hash, iconURL);
        }
      });
    }
  }

  /**
   * @description: 创建chrome通知
   * @param {*} title
   * @param {*} body
   * @param {*} theLink 跳转链接
   * @param {*} iconURL
   * @return {*}
   */
  function createNotification(title, body, head, hash, iconURL) {
    const notification = new Notification(title, {
      body: body,
      tag: hash,
      icon: iconURL,
    });
    notification.onclick = function(event) {
      event.preventDefault(); // prevent the browser from focusing the Notification's tab
      window.open(head + hash, "_blank");
    };
    setTimeout(notification.close.bind(notification), 7000);
  }

  return {
    noticeLiquidation,
  };
}
