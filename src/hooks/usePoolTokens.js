/*
 * @Date: 2021-07-15 14:03:05
 * @LastEditTime: 2022-03-24 17:34:59
 */
import { reactive } from "vue";
import { toPercent } from "@/utils/format";

const poolToken = reactive({
  tokenList: [],
  type: 1, // 1:deposit 2:borrow
  fetchLoading: false,
});

export function usePoolTokens() {
  /**
   * @description: random color
   * @param {*}
   * @return {*}
   */
  function getRandomColor() {
    const colorList = ["#F35430", "#FFA2C0", "#7FBA7A", "#FFCE73", "#6C5DD3"];
    const index = Math.floor(Math.random() * colorList.length);
    return colorList[index];
  }

  async function fetchUserTokens(tokenList, type) {
    poolToken.type = type;
    let myTokenList = tokenList;
    myTokenList.forEach(item => {
      item.color = getRandomColor();
    });

    let totalDepositAmount = _.sumBy(myTokenList, o => {
      return o.totalDeposit;
    });
    let totalBorrowAmount = _.sumBy(myTokenList, o => {
      return o.totalBorrow;
    });

    myTokenList.forEach(element => {
      element.depositPercent = toPercent((element.totalDeposit / totalDepositAmount) * 100) * 1;
      element.borrowPercent = toPercent((element.totalBorrow / totalBorrowAmount) * 100) * 1;
    });

    if (poolToken.type === 1) {
      poolToken.tokenList = _.orderBy(
        myTokenList.filter(item => item.totalDeposit * 1 > 0),
        ["totalDeposit"],
        ["desc"],
      );
    } else {
      poolToken.tokenList = _.orderBy(
        myTokenList.filter(item => item.totalBorrow * 1 > 0),
        ["totalBorrow"],
        ["desc"],
      );
    }
    poolToken.fetchLoading = false;

    return poolToken;
  }

  return {
    poolToken,
    fetchUserTokens,
  };
}
