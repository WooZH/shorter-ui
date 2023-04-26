import axios from "@/utils/axios";
import { getContractAddress } from "@/contract";

function fetchByGraphql(params) {
  return axios.post(getContractAddress().graphqlUrl, params);
}

export async function getRulerCount() {
  const params = {
    query: `{
      rulers
    }`,
  };

  const res = await fetchByGraphql(params);
  const count = res.data.rulers;

  return count;
}

export async function getProposalIdList() {
  const params = {
    query: `{
      getProposalIdInfo {
        proposalId
        proposer
        blockNumber
      }
    }`,
  };

  const res = await fetchByGraphql(params);
  const result = (res.data?.getProposalIdInfo || []).map(item => ({
    id: item.proposalId,
    ...item,
  }));

  return result;
}

export async function getAllRulers() {
  const params = {
    query: `{
      getRuler
    }`,
  };

  const res = await fetchByGraphql(params);
  const rulers = res.data.getRuler;
  return rulers;
}

export async function getLastBlockOfProposals() {
  const params = {
    query: `{
      getProposalChangedInfo {
        proposalId
        lastChangedBlockNumber
      }
    }`,
  };

  const res = await fetchByGraphql(params);
  const proposals = (res.data?.getProposalChangedInfo || []).map(item => ({
    blockNumber: item.lastChangedBlockNumber,
    ...item,
  }));

  return proposals;
}

export async function getRulerVoteInfoByAccount(account) {
  const params = {
    query: `{
      getVoteInfoByAccount(account: "${account}") {
        proposalId
        user
        direction
        voteShare
      }
    }`,
  };

  const res = await fetchByGraphql(params);
  const voteResult = (res.data?.getVoteInfoByAccount || []).map(item => ({
    ...item,
  }));

  return voteResult;
}

export async function getRulerVoteProposalCount(account) {
  const voteResult = await getRulerVoteInfoByAccount(account);
  const proposalIdMap = {};

  for (const vote of voteResult) {
    const id = vote.proposalId;
    proposalIdMap[id] = proposalIdMap[id] ? proposalIdMap[id] + 1 : 1;
  }
  const voteValues = Object.values(proposalIdMap);
  const count = voteValues.reduce((a, b) => a + b, 0);
  return count;
}
