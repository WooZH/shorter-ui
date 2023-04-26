import NP from "number-precision";
import { Contract } from "ethers-multicall";

import { getContractAddress } from "@/contract";
import { getAllPools } from "@/contract/poolGuardian";

import poolABI from "../abis/PoolGuardian.json";
import TradingHubABI from "@/abis/TradingHub.json";
import strPoolABI from "../abis/StrPool.json";
import ERC20ABI from "../abis/ERC20.json";
import POABI from "../abis/PriceOracle.json";
import WPABI from "../abis/WrapRouter.json";

import { getMulticallProvider  } from "@/wallet/provider";
import * as Transfer from "@/utils/transfer";
import { Local } from "@/utils/localStorage";

const myOverview = {
  totalCount: 0,
  compare: 0,
  PL: 0,
  margin: 0,
  originAsset: 0,
  available: 0,
  borrow: 0,
  deposit: 0,
  positions: 0,
  firstLoad: true,
  fetching: false,
  myPools: [],
  owner: "",
};

const INI_DEFAULT = {
  totalCount: 0,
  compare: 0,
  PL: 0,
  margin: 0,
  originAsset: 0,
  available: 0,
  borrow: 0,
  deposit: 0,
  positions: 0,
  firstLoad: true,
  fetching: false,
  myPools: [],
  owner: "",
};

export function useOverview() {
  /**
   * @description: init
   * @param {*}
   * @return {*}
   */

  function setDefault() {
    Object.assign(myOverview, INI_DEFAULT);
  }

  /**
   * @description: account assets
   * @param {*} account
   * @return {*}
   */

  function setOwner(account = "") {
    setDefault();
    myOverview.owner = account;
  }

  /**
   * @description: Yesterday's net asset value
   * @param {*} number
   * @return {*}
   */

  function setCompare(number) {
    myOverview.originAsset = number;
  }

  /**
   * @description: my assets
   * @param {*}
   * @return {*}
   */

  function refreshUserPools() {
    if (!myOverview.owner) {
      myOverview.available = 0;
      myOverview.deposit = 0;
      myOverview.totalCount = 0;
      myOverview.compare = 0;
      return;
    }

    myOverview.totalCount = myOverview.deposit + myOverview.PL + myOverview.margin;
    myOverview.compare = NP.minus(myOverview.totalCount, myOverview.originAsset);
  }

  /**
   * @description: set my position length
   * @param {*} arr
   * @return {*}
   */
  function setPosition(arr = []) {
    //  CLOSED_STATE = 8;
    const amount = arr.filter(element => element.state * 1 !== 8).length;
    myOverview.positions = amount;
  }

  /**
   * @description: set PL
   * @param {*} number
   * @return {*}
   */

  function setPl(number) {
    myOverview.PL = number;
  }
  /**
   * @description: set PL
   * @param {*} number
   * @return {*}
   */

  function setAvailable(number) {
    myOverview.available = number;
  }

  /**
   * @description: current my borrow
   * @param {*} number
   * @return {*}
   */

  function setBorrow(number) {
    myOverview.borrow = number;
  }
  /**
   * @description: current my deposit
   * @param {*} number
   * @return {*}
   */

  function setDeposit(number) {
    myOverview.deposit = number;
  }

  /**
   * @description:  set my total margin
   * @param {*} number
   * @return {*}
   */

  function setMargin(number) {
    myOverview.margin = number;
  }

  function refreshUserPositions(positionList) {
    if (!positionList || positionList.length === 0) {
      setPosition([]);
      setBorrow(0);
      setMargin(0);
      setPl(0);
      setDeposit(0);
      setAvailable(0);
      refreshUserPools();

      return myOverview;
    }

    let myPositions = positionList;
    let totalPl = _.sumBy(myPositions, o => {
      if (o.earnAmount < 0 && Math.abs(o.earnAmount) > o.totalMarginAmount) {
        return o.totalMarginAmount * -1;
      }
      return o.earnAmount * 1;
    });
    let totalMargin = _.sumBy(myPositions, o => {
      return o.totalMarginAmount * 1;
    });
    // open
    let totalBorrow = _.sumBy(myPositions, o => {
      return o.totalSize * 1 * o.stakedTokenPrice;
    });
    let totalAvailable = _.sumBy(myPositions, o => {
      return o.withdrawableAsset * 1 || 0;
    });
    let totalDeposit = _.sumBy(myPositions, o => {
      return o.userAmount * o.stakedTokenPrice;
    });

    setPosition(myPositions);
    setBorrow(totalBorrow);
    setMargin(totalMargin);
    setPl(totalPl);
    setDeposit(totalDeposit);
    setAvailable(totalAvailable);
    refreshUserPools();
    return myOverview;
  }

  /**
   * @description: get pools about me
   * @param {*} account
   * @return {*}
   */
  async function fetchMyPools(account) {
    if (myOverview.fetching) return;
    if (!account) return;
    try {
      myOverview.fetching = true;
      refreshUserPools();
    } catch (error) {
    } finally {
      myOverview.fetching = false;
      myOverview.firstLoad = false;
    }
  }

  async function getMyDepositValue(account) {
    let ids = [];
    ids = await getAllPools();
    if (!ids.length) {
      return 0;
    }
    let contractAddress = getContractAddress();
    let ethcallProvider = await getMulticallProvider();
    const poolContract = new Contract(contractAddress.PoolGuardian, poolABI);
    const POContract = new Contract(contractAddress.PriceOracle, POABI);

    const listCalls = [];
    ids.forEach(poolId => {
      listCalls.push(poolContract.getPoolInfo(poolId));
    });
    const poolBaseInfoList = await ethcallProvider.all(listCalls);

    const listDepositCalls = [];

    poolBaseInfoList.forEach(item => {
      let ERC20ContractStr = new Contract(item.strToken, ERC20ABI);
      listDepositCalls.push(ERC20ContractStr.balanceOf(account));
    });
    const depositCall = await ethcallProvider.all(listDepositCalls);
    let depositCallResult = [];
    depositCall.forEach((item, index) => {
      if (Transfer.transBigNumber(item) !== "0") {
        depositCallResult.push(poolBaseInfoList[index]);
      } else {
        return null;
      }
    });

    const listStrCalls = [];

    depositCallResult.forEach(item => {
      let ERC20ContractStr = new Contract(item.strToken, ERC20ABI);
      listStrCalls.push(POContract.getLatestMixinPrice(item.stakedToken));
      listStrCalls.push(ERC20ContractStr.balanceOf(account));
    });

    const myDeposit = await ethcallProvider.all(listStrCalls);
    const depositList = [];

    const decimalsList = depositCallResult.map(item => {
      return getTokenDecimals(item.stakedToken);
    });
    for (let index = 0; index < myDeposit.length / 2; index++) {
      const zIndex = index * 2;
      depositList.push({
        stakedTokenPrice: Transfer.receiveAmount(myDeposit[zIndex], 18),
        // stakedTokenPrice: myDeposit[zIndex],
        count: Transfer.receiveAmount(myDeposit[zIndex + 1], decimalsList[index]),
      });
    }

    let sum_deposit = 0;
    depositList.forEach(item => {
      sum_deposit = sum_deposit + NP.times(item.stakedTokenPrice, item.count);
    });

    return sum_deposit;
  }
  async function getMyWithdrawValue(account) {
    let ids = [];
    ids = await getAllPools();
    if (!ids.length) {
      return 0;
    }
    let contractAddress = getContractAddress();
    let ethcallProvider = await getMulticallProvider();
    const poolContract = new Contract(contractAddress.PoolGuardian, poolABI);
    const THContract = new Contract(contractAddress.TradingHub, TradingHubABI);
    const POContract = new Contract(contractAddress.PriceOracle, POABI);
    const WRContract = new Contract(contractAddress.WrapRouter, WPABI);

    const listCalls = [];
    ids.forEach(poolId => {
      listCalls.push(poolContract.getPoolInfo(poolId));
    });

    const poolBaseInfoList = await ethcallProvider.all(listCalls);
    let poolList = poolBaseInfoList.map((item, index) => {
      return {
        ...item,
        id: ids[index],
      };
    });

    let listDepositCalls = [];
    poolList.forEach(item => {
      let ERC20ContractStr = new Contract(item.strToken, ERC20ABI);
      listDepositCalls.push(ERC20ContractStr.balanceOf(account));
    });
    const depositCall = await ethcallProvider.all(listDepositCalls);
    let depositCallResult = [];
    depositCall.forEach((item, index) => {
      if (Transfer.transBigNumber(item) !== "0") {
        depositCallResult.push(poolList[index]);
      } else {
        return null;
      }
    });
    const poolListCalls = [];
    depositCallResult.forEach(item => {
      let strPoolContract = new Contract(item.strToken, strPoolABI);
      poolListCalls.push(strPoolContract.getMetaInfo());
    });

    const poolInfoList = await ethcallProvider.all(poolListCalls);

    const listStrCalls = [];
    depositCallResult.forEach((item, index) => {
      let strPoolContract = new Contract(item.strToken, strPoolABI);
      let ERC20ContractStr = new Contract(item.strToken, ERC20ABI);
      let ERC20ContractStable = new Contract(poolInfoList[index].stableToken_, ERC20ABI);

      listStrCalls.push(strPoolContract.isLegacyLeftover());
      listStrCalls.push(POContract.getLatestMixinPrice(item.stakedToken));
      listStrCalls.push(ERC20ContractStr.balanceOf(account));
      listStrCalls.push(ERC20ContractStable.balanceOf(item.strToken));
      listStrCalls.push(WRContract.controvertibleAmounts(item.strToken));

      listStrCalls.push(THContract.isPoolWithdrawable(item.id));
    });

    const poolAll = await ethcallProvider.all(listStrCalls);

    const stakedTokenDecimalsList = depositCallResult.map(item => {
      return getTokenDecimals(item.stakedToken);
    });
    const stableTokenDecimalsList = poolInfoList.map(item => {
      return getTokenDecimals(item.stableToken_);
    });
    let poolWithdrawList = [];
    for (let index = 0; index < poolAll.length / 6; index++) {
      const zIndex = index * 6;
      poolWithdrawList.push({
        canWithdraw: poolAll[zIndex + 5],
        isLegacyLeftover: poolAll[zIndex],
        stakePrice: Transfer.receiveAmount(poolAll[zIndex + 1], 18),
        myDeposit: Transfer.receiveAmount(poolAll[zIndex + 2], stakedTokenDecimalsList[zIndex]),
        stableAmount: Transfer.receiveAmount(poolAll[zIndex + 3], stableTokenDecimalsList[zIndex]),
        totalStaked: Transfer.receiveAmount(poolAll[zIndex + 4], stakedTokenDecimalsList[zIndex]),
      });
    }

    let sum = 0;
    poolWithdrawList.forEach(item => {
      sum = sum + sumByWithdraw(item);
    });

    return sum;
  }

  function sumByWithdraw(pool) {
    if (pool.canWithdraw) {
      if (pool.isLegacyLeftover) {
        let percent = 0;
        if (pool.totalStaked == 0) {
          percent = 0;
        } else {
          percent = NP.divide(pool.myDeposit, pool.totalStaked);
        }
        const totalStakedPrice = NP.times(pool.totalStaked, pool.stakePrice);
        let totalPrice = NP.plus(pool.stableAmount, totalStakedPrice);
        const isLegacyLeftoverPrice = NP.times(percent, totalPrice);
        return isLegacyLeftoverPrice;
      } else {
        let amount = Math.min(pool.myDeposit, pool.totalStaked);
        return NP.times(amount, pool.stakePrice);
      }
    } else {
      return 0;
    }
  }

  function getTokenDecimals(address) {
    let shorterStorage = Local.get("shorterStorage");
    const tokenList = shorterStorage[getContractAddress().networkName].common.token.list;
    let decimals = "";
    tokenList.forEach(item => {
      if (item.address === address) {
        decimals = item.decimals;
      }
    });
    return decimals;
  }

  return {
    myOverview,
    setOwner,
    setMargin,
    fetchMyPools,
    setPl,
    refreshUserPositions,
    setDefault,
    setBorrow,
    setCompare,
    getMyDepositValue,
    getMyWithdrawValue,
  };
}
