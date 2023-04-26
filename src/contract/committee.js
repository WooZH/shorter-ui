import { ethers, utils } from "ethers";
import { Contract } from "ethers-multicall";

import { outContract, getContractAddress, commonGetLogs } from "@/contract";
import CommitteeABI from "../abis/Committee.json";
import ERC20ABI from "../abis/ERC20.json";

import { getMulticallProvider } from "@/wallet/provider";
import { Transaction } from "@/hooks/useTransaction";

import * as Transfer from "@/utils/transfer";
import { encodeFilterTopics } from "@/utils/format";
import { getGasParams } from "@/utils/gas";

/**
 * @description:获取合约对象
 * @param {*}
 * @return {object}
 */
export async function getContract(flag = false) {
  let contractAddress = getContractAddress();
  if (!contractAddress?.Committee) return;
  try {
    const contract = await outContract(CommitteeABI, contractAddress.Committee, flag);
    return contract;
  } catch (error) {
    console.log(error, "getContract");
  }
}

/**
 * @description: 获取统计清算相关
 * @param {*} index
 * @return {*}
 */
export async function liqItems(index) {
  const contract = await getContract();
  if (!contract) return;
  const result = await contract.LiqItems(index);
  return {
    positionAddr: result.positionAddr,
    poolId: Transfer.transBigNumber(result.poolId),
    amount: Transfer.receiveAmount(result.amount, 18),
    blockNum: Transfer.transBigNumber(result.blockNum),
  };
}

/**
 * @description: getRulerLiqPosition
 * @param {*} rulers
 * @return {*}
 */
export async function getRulerLiqPosition(rulers) {
  const contract = await getContract();
  if (!contract) return;
  const result = await contract.getRulerLiqPosition(rulers);
  return result;
}

/**
 * @description: 获取提案状态
 * @param {*} filter{fromBlock, toBlock}
 * @return {*}
 */
export async function fetchHistoryLogs(filter) {
  let contractAddress = getContractAddress(); // 获取当前合约配置
  filter.address = contractAddress.Committee; // 加入查询合约
  const callPromise = await commonGetLogs(filter);
  let list = callPromise.map(log => transHistoryLog(log)); //处理返回的日志信息
  return list.filter(item => item && (item.event === "ProposalStatusChanged" || item.event === "PoolProposalCreated")); //过滤无用数据
}

function transHistoryLog(log) {
  try {
    let iface = new ethers.utils.Interface(CommitteeABI);
    let item = iface.parseLog(log);
    return {
      hash: log.transactionHash,
      blockNumber: log.blockNumber,
      args: item.args,
      event: item.name,
    };
  } catch (error) {
    return null;
  }
}

/**
 * @description: 获取提案详情
 * @param {*} id
 * @return {*}
 */
export async function queryProposalInfo(id) {
  const contract = await getContract();
  let proposalGallery = await contract.proposalGallery(id);
  return {
    id: id * 1,
    status: proposalGallery.status * 1,
    proposer: proposalGallery.proposer,
    tag: proposalGallery.catagory,
    total_for_votes: Transfer.receiveAmount(proposalGallery.forShares, 18),
    total_against_votes: Transfer.receiveAmount(proposalGallery.againstShares, 18),
    endBlock: Transfer.transBigNumber(proposalGallery.endBlock) * 1,
    startBlock: Transfer.transBigNumber(proposalGallery.startBlock) * 1,
  };
}

/**
 * @description: fetch ProposalVoted records
 * @param {*} filter -{fromBlock, toBlock, address}
 * @param  {*} fromBlock 开始区块
 * @param  {*} toBlock 结束区块
 * @param  {*} address 合约地址
 * @return {*}
 */
export async function getVoteRecords(startBlock, id) {
  try {
    const contractAddress = getContractAddress();
    const topics = await encodeFilterTopics(CommitteeABI, "ProposalVoted");
    const coderAbi = new utils.AbiCoder();
    topics.push(coderAbi.encode(["uint256"], [id]));
    const filter = {
      fromBlock: startBlock,
      toBlock: "latest",
      topics,
      address: contractAddress.Committee,
    };
    const list = await commonGetLogs(filter);

    const iface = new ethers.utils.Interface(CommitteeABI);
    const res = list.map(log => {
      let item = iface.parseLog(log);
      return {
        hash: log.transactionHash,
        blockNumber: log.blockNumber,
        args: item.args,
        event: item.name,
      };
    });
    return res;
  } catch (error) {
    console.error("get Vote Records =>", error);
  }
}

/**
 * @description: 根据id列表返回提案列表
 * @param {*}
 * @return {array}
 */
export async function getProposals(idList = []) {
  let proposals = [];
  let contractAddress = getContractAddress();
  let ethcallProvider = await getMulticallProvider();
  const CommitteeContract = new Contract(contractAddress.Committee, CommitteeABI);

  let callList = [];
  idList.map(({ id }) => {
    callList.push(CommitteeContract.proposalGallery(id));
    callList.push(CommitteeContract.poolMetersMap(id));
  });

  let res = await ethcallProvider.all(callList);
  for (let i = 0; i < res.length / 2; i++) {
    const zIndex = i * 2;
    const gallery = res[zIndex];
    const metersMap = res[zIndex + 1];
    const proposalItem = {
      id: gallery.id,
      status: gallery.status,
      proposer: gallery.proposer,
      tag: gallery.catagory,
      total_for_votes: Transfer.receiveAmount(gallery.forShares, 18) * 1,
      total_against_votes: Transfer.receiveAmount(gallery.againstShares, 18) * 1,
      endBlock: Transfer.transBigNumber(gallery.endBlock),
      startBlock: Transfer.transBigNumber(gallery.startBlock) * 1,
      durationDays: metersMap.durationDays,
      leverage: metersMap.leverage,
      tokenContract: metersMap.tokenContract,
    };
    proposals.push(proposalItem);
  }
  callList = [];

  proposals.forEach(({ tokenContract }) => {
    const ERC20Contract = new Contract(tokenContract, ERC20ABI);
    callList.push(ERC20Contract.symbol());
  });
  let tokenNameMap = await ethcallProvider.all(callList);

  tokenNameMap.forEach((name, index) => {
    proposals[index].tokenName = name;
  });
  return proposals;
}

export async function getProposalsCounter(idList = []) {
  let contractAddress = getContractAddress();
  let ethcallProvider = await getMulticallProvider();
  const CommitteeContract = new Contract(contractAddress.Committee, CommitteeABI);
  let callList = [];
  idList.map(({ id }) => {
    callList.push(CommitteeContract.proposalGallery(id));
  });
  const res = await ethcallProvider.all(callList);
  return res;
}

/**
 * @description: 提现 /收割奖励时  amount为0
 * @param {number} amount
 * @param {string} account
 * @return {obj}
 */
export async function withdraw(amount, account) {
  const contract = await getContract(true);
  let value = Transfer.toAmount(amount, 18);

  const gasParams = await getGasParams(contract, "withdraw", value);
  const tx = await contract.withdraw(value, { from: account, ...gasParams });
  let receipt = await tx.wait();
  Transaction(receipt.transactionHash);
  return receipt;
}

/**
 * @description:该函数用于往平台币中存入IPISTR
 * @param {String *} amount
 * @param {String *} account
 * @return {Object} 交易结果log相关输出日志
 */
export async function deposit(amount, account) {
  const contract = await getContract(true);
  let value = Transfer.toAmount(amount, 18);

  const gasParams = await getGasParams(contract, "deposit", value);
  const tx = await contract.deposit(value, { from: account, ...gasParams });
  let receipt = await tx.wait();
  Transaction(receipt.transactionHash);
  return receipt;
}

/**
 * @description:判断该账户是否是ruler
 * @param {*} account
 * @return {*}
 */
export async function isRuler(account) {
  const contract = await getContract();
  const result = await contract.isRuler(account);
  return result;
}

/**
 * @description: Provider create Pool
 * @param {String} tokenAddress
 * @param {Number} maxLeverage
 * @param {Number} durationDays
 * @return {*}
 */
export async function createPoolProposal({ tokenAddress, maxLeverage, durationDays, from }) {
  const contract = await getContract(true);
  let address = tokenAddress;
  if (tokenAddress === getContractAddress().chainTokenAddress) {
    address = getContractAddress().chainReplaceAddress;
  }

  const gasParams = await getGasParams(contract, "createPoolProposal", address, maxLeverage, durationDays);
  const tx = await contract.createPoolProposal(address, maxLeverage, durationDays, { from: from, ...gasParams });
  let receipt = await tx.wait();
  return receipt;
}

/**
 * @description: 获取用户的社区投票份额信息
 * @param {*} account
 * @return {*}
 */
export async function getUserShares(account) {
  const contract = await getContract();
  const res = (await contract.getUserShares(account)) || {};

  return {
    lockedShare: Transfer.receiveAmount(res.lockedShare) * 1,
    totalShare: Transfer.receiveAmount(res.totalShare) * 1,
    availableShare: Transfer.receiveAmount(res.totalShare.sub(res.lockedShare)),
  };
}

/**
 * @description: 获取ipistr所有的投票份额信息
 * @param {*}
 * @return {*}
 */
export async function getTotalIpistrStakedShare() {
  const contract = await getContract();
  const res = (await contract.totalIpistrStakedShare()) || {};
  return Transfer.receiveAmount(res) * 1;
}

/**
 * @description: 返回新建的池信息内容
 * @param {*}
 * @return {*}
 */
export async function poolMetersMap(id) {
  const contract = await getContract();
  if (!contract?.poolMetersMap) return;
  let poolMetersMap = await contract.poolMetersMap(id);
  return {
    durationDays: poolMetersMap.durationDays,
    leverage: poolMetersMap.leverage,
    tokenContract: poolMetersMap.tokenContract,
  };
}

/**
 * @description: 社区ruler个人提案投票
 * @param {*} proposalId 个人地址
 * @param {Number} type 1赞成 0 返回
 * @param {*} voteShare 个人投票份额
 * @param {*} from 个人账号-address
 * @return {*}
 */
export async function voteProposal({ proposalId, type, voteShare }) {
  const contract = await getContract(true);
  voteShare = Transfer.toAmount(voteShare);
  const direction = type == 1;

  const gasParams = await getGasParams(contract, "vote", proposalId, direction, voteShare);
  const tx = await contract.vote(proposalId, direction, voteShare, gasParams);
  let voteResult = await tx.wait();
  return voteResult;
}

/**
 * @description: 获取committee的日志
 * @param {*} filter{fromBlock, toBlock,topics,address}
 * @return {*}
 */
export async function getLogs(filter = {}) {
  let contractAddress = getContractAddress(); // 获取当前合约配置
  filter.address = contractAddress.Committee;
  const callPromise = await commonGetLogs(filter);

  const list = [];
  callPromise.forEach(log => {
    const res = transHistoryLog(log);
    if (res) {
      list.push(res);
    }
  });
  return list;
}

export async function getVotedProposalsCount(account) {
  const logs = await getProposalVotedLogs(account);
  let votedCount = 0;
  const uniqProposalsIdList = new Set();
  if (_.isArray(logs)) {
    logs.forEach(({ proposalId }) => {
      uniqProposalsIdList.add(proposalId);
    });
    votedCount = uniqProposalsIdList.size;
  }
  return votedCount;
}

/**
 * @description: 通过日志读取用户投票过的提案列表信息
 * @param {*} account
 * @return {*}
 */
export async function getProposalVotedLogs(account) {
  const [topics] = await Promise.all([encodeFilterTopics(CommitteeABI, "ProposalVoted")]);
  const toBlock = "latest";

  const fromBlock = getContractAddress().committeeStartBlock;
  const coderAbi = new utils.AbiCoder();
  topics.push(null);
  topics.push(coderAbi.encode(["address"], [account]));
  const filter = { fromBlock, toBlock, topics };

  const logs = await getLogs(filter);
  const result = [];
  logs.forEach(item => {
    const args = item.args;
    const info = {
      hash: item.hash,
      user: args.user,
      proposalId: Transfer.transBigNumber(args.proposalId) * 1,
      direction: args.direction,
      voteShare: Transfer.receiveAmount(args.voteShare) * 1,
      blockNumber: item.blockNumber,
    };
    result.push(info);
  });
  return result;
}
