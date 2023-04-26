import { reactive } from "vue";
import NP from "number-precision";

import * as Erc20Action from "@/contract/erc20";
import * as PriceAction from "@/contract/priceOracle";
import * as TradingHub from "@/contract/tradingHub";

import * as Transfer from "@/utils/transfer";
import { useWallet } from "./useWallet";
import { useInterval } from "./useInterval";

const trader = reactive({
  coinName: "",
  coinBalance: 0,
  priceImpact: 0,
  tokenPrice: "",
  expectedPrice: "",
  noSlippagePrice: "",
  margin: 0,
  leverage: 0,
  openSize: 0,
  tokenBalance: 0,
  tokenAddress: "",
  tokenDecimals: 18,
  approveUsd: false,
  tokenLoading: false,
});

export function useTrader() {
  const { account } = useWallet();
  const { addNormalPriorityInterval } = useInterval();

  function setTraderFactor(openSize, leverage, tokenName) {
    trader.openSize = openSize;
    trader.leverage = leverage;
    trader.coinName = tokenName;
  }

  function setPriceImpact(priceImpact) {
    trader.priceImpact = priceImpact;
  }

  async function resetMargin(
    _initOrderSize,
    _slippage,
    tokenAddress,
    stableToken,
    stakedDecimals,
    stableDecimals,
    leverage,
  ) {
    const slippage = _slippage * 100;
    const margin = await TradingHub.getEstimatedMargin(
      _initOrderSize,
      slippage,
      tokenAddress,
      stableToken,
      stakedDecimals,
      stableDecimals,
      leverage,
    );

    trader.margin = margin;
  }

  /**
   * @description: 从dex上获取每个token的价格
   * @param {*} openSize
   * @param {*} tokenAddress
   * @param stableTokenAddress
   * @return {*}
   */
  async function fetchAmountsOut(
    openSize,
    tokenAddress,
    stableTokenAddress,
    slippage,
    _stakedDecimals = null,
    _stableDecimals = null,
    swapRouter = "",
  ) {
    if (!openSize) {
      return;
    }
    let path = [tokenAddress, stableTokenAddress];
    let stakedDecimals = _stakedDecimals;
    let stableDecimals = _stableDecimals;

    if (!stakedDecimals) stakedDecimals = await Erc20Action.decimals(tokenAddress);
    if (!stableDecimals) stableDecimals = await Erc20Action.decimals(stableTokenAddress);

    let amount = Transfer.toAmount(openSize, stakedDecimals);
    const expectedPrice = await TradingHub.getExpectedPrice(amount, path, slippage, stableDecimals, swapRouter);
    const noSlippagePrice = await TradingHub.getExpectedPrice(amount, path, 0, stableDecimals, swapRouter);
    trader.noSlippagePrice = NP.divide(noSlippagePrice, openSize);
    trader.expectedPrice = NP.divide(expectedPrice, openSize);
  }

  /**
   * @description: 拉取合约价格影响因子
   * @param {*}
   * @return {*}
   */
  async function fetchPriceImpact(openSize, tokenAddress, stableToken, decimals = 18) {
    if (!openSize) {
      return;
    }
    try {
      let path = [tokenAddress, stableToken];
      console.log(fetchPriceImpact, path, openSize);
      let impact = await TradingHub.getPriceImpactNew(path, openSize, decimals);
      setPriceImpact(impact / 100);
    } catch (error) {
      console.log(error, "fetchPriceImpact");
      setPriceImpact(0.01);
    }
  }

  /**
   * @description: 获取用户token的数量
   * @param stableToken: 稳定币token
   * @return {*}
   */
  async function fetchTraderStableBalance(stableToken, decimals) {
    try {
      const result = await Erc20Action.balanceOf(stableToken, account.value);
      trader.coinBalance = Transfer.receiveAmount(result, decimals);
    } catch (error) {
      console.log(error, "fetch USD Balance");
    }
  }

  function clearTraderBalance() {
    trader.tokenBalance = 0;
    trader.coinBalance = 0;
  }

  /**
   * @description: 获取token的数量和价格(后台刷新)
   * @param {*} tokenAddress
   * @param {*} decimals
   * @return {*}
   */
  async function fetchTokenPriceAndBalance(tokenAddress, decimals) {
    trader.tokenAddress = tokenAddress;
    trader.tokenDecimals = decimals;

    const fetchAction = () => {
      fetchTokenBalance(trader.tokenAddress);
      fetchTokenPrice(trader.tokenAddress, trader.tokenDecimals);
    };

    fetchAction();
    addNormalPriorityInterval(fetchAction);
  }

  async function fetchTokenBalance(tokenAddress) {
    trader.tokenLoading = true;
    if (!tokenAddress) {
      trader.tokenBalance = 0;
      return;
    }

    if (!account.value) {
      clearTraderBalance();
      console.log("account is not found");
      return;
    }
    try {
      const result = await Erc20Action.getBalanceOf(tokenAddress, account.value);
      trader.tokenBalance = result;
    } catch (error) {
      console.error(error, "fetch Token Balance");
    } finally {
      trader.tokenLoading = false;
    }
  }

  async function fetchTokenPrice(tokenAddress, decimals) {
    if (!tokenAddress) return;
    if (!decimals) return;
    try {
      let feedPrice = await PriceAction.getFeedPrice(tokenAddress);
      trader.tokenPrice = feedPrice.price;
      // resetMargin();
    } catch (error) {
      console.log(error, "getFeedPrice");
    }
  }

  return {
    trader,
    clearTraderBalance,
    resetMargin,
    fetchAmountsOut,
    fetchPriceImpact,
    setTraderFactor,
    setPriceImpact,
    fetchTokenPriceAndBalance,
    fetchTraderStableBalance,
  };
}
