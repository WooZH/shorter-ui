<template>
  <Layout :back="{ name: 'Proposals', breadcrumb: ['Governance', 'Proposals'] }">
    <template #title>
      <div class="title">
        <div v-if="!state.loading.fetchDetail && state.currentTitle" class="content">
          {{ state.currentTitle }}
          <ProposalStatus class="status" :status="getTitleStatus(state.proposalDetail.status).toLowerCase()">
            {{ getTitleStatus(state.proposalDetail.status) }}
          </ProposalStatus>
        </div>

        <shorterSkeleton v-else height="37px" animated>
          <template #template>
            <shorterSkeletonItem style="width: 80%; height: 37px" />
          </template>
        </shorterSkeleton>

        <div v-if="!state.loading.fetchHistory && !state.loading.fetchDetail" class="addition">
          <Tag v-if="state.proposalDetail" class="subtitle-tag" color="white">
            {{ getProposalTag(state.proposalDetail.tag) }}
          </Tag>
          <span v-html="generateSubtitle(state.proposalDetail.status, state.lastTime)" />
        </div>
        <shorterSkeleton v-else height="24px" animated>
          <template #template>
            <shorterSkeletonItem style="width: 40%; height: 24px; margin-top: 14px" />
          </template>
        </shorterSkeleton>
      </div>
    </template>

    <VotesResult
      :loading="state.loading.fetchDetail || state.loading.fetchVotes"
      :available-vote-amount="state.availableVoteAmount"
      :proposal-detail="state.proposalDetail"
      :for-list="state.votesResult.forList"
      :against-list="state.votesResult.againstList"
      @refreshData="refreshData"
    />
    <div class="panel-group">
      <ProposalDescription
        :loading="state.loading.fetchDetail"
        :token-contract="state.proposalDetail.tokenContract"
        class="type"
      />
      <ProposalHistory
        class="history"
        :creator="state.proposalDetail && state.proposalDetail.proposer"
        :loading="state.loading.fetchDetail || state.loading.fetchHistory"
        :history="state.history"
      />
    </div>
  </Layout>
</template>
<script setup>
import { computed, reactive, watchEffect, onBeforeMount } from "vue";
import { useRoute, useRouter } from "vue-router";
import NP from "number-precision";

import VotesResult from "./components/VotesResult.vue";
import ProposalDescription from "./components/ProposalDescription.vue";
import ProposalHistory from "./components/ProposalHistory.vue";
import ProposalStatus from "./components/ProposalStatus.vue";

import { useProposal } from "@/hooks/useProposal";
import { useWallet } from "@/hooks/useWallet";

import * as Committee from "@/contract/committee";
import { getTokenBaseInfo } from "@/contract/shortBone";
import CommitteeJson from "@/abis/Committee.json";

import { blockToTime, encodeFilterTopics } from "@/utils/format";
import * as Transfer from "@/utils/transfer";

import { utils } from "ethers";

const router = useRouter();
const route = useRoute();
const { generateTitle, getTitleStatus, generateSubtitle, getProposalTag } = useProposal();
const { account } = useWallet();

const state = reactive({
  availableVoteAmount: 0,
  proposalDetail: {},
  tokenName: "",
  loading: {
    fetchDetail: true,
    fetchHistory: true,
  },
  history: [],
  lastTime: "",
  votesResult: {
    forList: [],
    againstList: [],
  },
  currentTitle: computed(() => {
    if (state.proposalDetail && state.tokenName) {
      return generateTitle(state.tokenName, state.proposalDetail.leverage, state.proposalDetail.durationDays);
    } else {
      return "";
    }
  }),
});

onBeforeMount(() => {
  getProposalDetail();
});

watchEffect(() => {
  if (account.value) {
    getUserShares(account.value);
  }
});

function refreshData() {
  getProposalDetail();
  getUserShares(account.value);
}

async function getProposalDetail() {
  try {
    state.loading.fetchDetail = true;
    const id = route.params.id;
    const proposalDetail = (await queryProposalInfo(id)) || {};
    const { startBlock, tokenContract, status } = proposalDetail || {};
    getVotesResult(startBlock, id);
    getProposalHistory(startBlock, id, status);
    console.log(tokenContract);
    const { symbol } = await getTokenBaseInfo(tokenContract);
    state.tokenName = symbol;

    return true;
  } catch (error) {
    if (error === "invalid id") {
      router.replace({ name: "404", query: route.query });
    }
  } finally {
    state.loading.fetchDetail = false;
  }
}

async function queryProposalInfo(id) {
  if (!id) return;
  try {
    const [proposalInfo, poolMeters] = await Promise.all([
      Committee.queryProposalInfo(id),
      Committee.poolMetersMap(id),
    ]);

    if (
      (proposalInfo && proposalInfo.proposer == "0x0000000000000000000000000000000000000000") ||
      (poolMeters && poolMeters.tokenContract == "0x0000000000000000000000000000000000000000")
    ) {
      return Promise.reject("invalid id");
    }

    const proposalDetail = { ...proposalInfo, ...poolMeters };
    proposalDetail.totalVotes = NP.plus(proposalDetail.total_for_votes * 1, proposalDetail.total_against_votes * 1);
    proposalDetail.forPercent = NP.divide(proposalDetail.total_for_votes * 1, proposalDetail.totalVotes * 1) * 100 || 0;
    proposalDetail.againstPercent =
      NP.divide(proposalDetail.total_against_votes * 1, proposalDetail.totalVotes * 1) * 100 || 0;

    state.proposalDetail = proposalDetail;
    return proposalDetail;
  } catch (error) {
    console.log("queryProposalInfo", error);
  } finally {
    state.loading.fetchDetail = false;
  }
}

async function getVotesResult(startBlock, id) {
  if (!id) return;
  try {
    state.loading.fetchVotes = true;

    const voteRecords = (await Committee.getVoteRecords(startBlock, id)) || [];
    console.log(voteRecords);
    if (!_.isArray(voteRecords)) return;

    const forList = [];
    const againstList = [];
    voteRecords.forEach(item => {
      const temp = {
        proposalId: Transfer.transBigNumber(item.args.proposalId) * 1,
        direction: Transfer.transBigNumber(item.args.direction),
        account: Transfer.transBigNumber(item.args.user),
        share: Transfer.receiveAmount(item.args.voteShare),
        share_big: item.args.voteShare,
      };
      if (temp.direction * 1 === 1) {
        forList.push(temp);
      } else {
        againstList.push(temp);
      }
    });

    state.votesResult.forList = forList;
    state.votesResult.againstList = againstList;
  } finally {
    state.loading.fetchVotes = false;
  }
}

async function getProposalHistory(startBlock, id, status) {
  if (!id) return;
  try {
    state.loading.fetchHistory = true;

    let history = [];
    const createdTime = await blockToTime(startBlock, "MMM DD, YYYY HH:mm");
    history.push({ status: 0, time: createdTime });

    const [topics_0, topics_1] = await Promise.all([
      encodeFilterTopics(CommitteeJson, "PoolProposalCreated") || [],
      encodeFilterTopics(CommitteeJson, "ProposalStatusChanged") || [],
    ]);
    const coderAbi = new utils.AbiCoder();
    topics_0.push(coderAbi.encode(["uint256"], [id]));
    topics_1.push(coderAbi.encode(["uint256"], [id]));
    const filter_0 = {
      fromBlock: startBlock,
      toBlock: "latest",
      topics: topics_0,
    };
    const filter_1 = {
      fromBlock: startBlock,
      toBlock: "latest",
      topics: topics_1,
    };

    if (status === 0) {
      state.lastTime = createdTime;

      const logs_0 = (await Committee.fetchHistoryLogs(filter_0)) || [{}];
      history[0].hash = logs_0[0].hash;
    } else {
      const [logs_0, logs_1] = await Promise.all([
        Committee.fetchHistoryLogs(filter_0) || [{}],
        Committee.fetchHistoryLogs(filter_1) || [{}],
      ]);
      history[0].hash = logs_0[0].hash;

      const res = await Promise.all(
        logs_1.map(async item => {
          item.status = Transfer.transBigNumber(item.args.ps);
          item.time = await blockToTime(item.blockNumber, "MMM DD, YYYY HH:mm");
          return item;
        }),
      );
      history = [...history, ...res];

      state.lastTime = history[history.length - 1].time;
    }

    state.history = history;
  } catch (error) {
    console.log({ ...error });
  } finally {
    state.loading.fetchHistory = false;
  }
}

async function getUserShares(account) {
  const userShares = await Committee.getUserShares(account);
  const { availableShare } = userShares || {};
  state.availableVoteAmount = availableShare;
}
</script>
<style lang="scss" scoped>
.panel-group {
  @include flex;
  margin: 32px -16px 0;
  .type,
  .history {
    flex: 1;
  }
}
.subtitle-tag {
  margin-right: 12px;
}
.title {
  .content {
    font-size: 32px;
    font-family: $caption;
    font-weight: 600;
    line-height: 36px;
    span {
      display: inline-block;
      min-width: 64px;
    }
  }
  .addition {
    margin-top: 14px;
    color: #a4a5b2;
    font-weight: 400;
    line-height: 28px;
  }
  .status {
    margin-left: 8px;
    display: inline-block;
    height: 24px;
    padding: 0 8px;
    line-height: 24px;
    transform: translateY(-4px);
  }
}
</style>
