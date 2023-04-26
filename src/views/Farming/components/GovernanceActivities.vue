<template>
  <div v-if="wallet.isConnected" class="panel-container info-group">
    <header class="panel-header">
      <h4 class="panel-title">Governance Activities</h4>
    </header>
    <div class="panel">
      <div class="infos">
        <div class="infos-title">Voting Incentives</div>
        <ul>
          <li>
            <h3>
              <shorterSkeleton v-if="loading" animated style="width: 50%">
                <template #template>
                  <shorterSkeletonItem style="height: 26px" />
                </template>
              </shorterSkeleton>
              <span v-else>
                {{ state.votingRewards ? formatNum(state.votingRewards, 2, true) : 0 }}
              </span>
            </h3>
            <p>Rewards</p>
          </li>
          <li>
            <h3>
              <shorterSkeleton v-if="state.loading.fetchVotedProposalsAmount" animated style="width: 50%">
                <template #template>
                  <shorterSkeletonItem style="height: 26px" />
                </template>
              </shorterSkeleton>
              <span v-else>
                {{ state.votedProposalsAmount }}
              </span>
            </h3>
            <p>Voted Proposals</p>
          </li>
        </ul>
      </div>
      <div class="infos">
        <div class="infos-title">Committee Dividen</div>
        <ul>
          <li>
            <h3>
              <shorterSkeleton v-if="state.loading.fetchRewards" animated style="width: 50%">
                <template #template>
                  <shorterSkeletonItem style="height: 26px" />
                </template>
              </shorterSkeleton>
              <span v-else>
                {{ state.committeeRewards ? formatNum(state.committeeRewards, 2, true) : 0 }}
              </span>
            </h3>
            <p>Rewards</p>
          </li>
          <li>
            <h3>
              <shorterSkeleton v-if="state.loading.fetchCommitteeInfo" animated style="width: 50%">
                <template #template>
                  <shorterSkeletonItem style="height: 26px" />
                </template>
              </shorterSkeleton>
              <span v-else>{{ state.votedWeight }}%</span>
            </h3>
            <p>Your Weight</p>
          </li>
        </ul>
      </div>
    </div>
  </div>
  <div v-else class="panel-container info-group">
    <header class="panel-header">
      <h4 class="panel-title">Governance Activities</h4>
    </header>
    <div class="panel">
      <div class="infos">
        <div class="infos-title">Voting Incentives</div>
        <ul>
          <li>
            <h3>-</h3>
            <p>Rewards</p>
          </li>
          <li>
            <h3>-</h3>
            <p>Voted Proposals</p>
          </li>
        </ul>
      </div>
      <div class="infos">
        <div class="infos-title">Committee Dividen</div>
        <ul>
          <li>
            <h3>-</h3>
            <p>Rewards</p>
          </li>
          <li>
            <h3>-</h3>
            <p>Your Weight</p>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useWallet } from "@/hooks/useWallet";
import { computed, reactive, watch } from "vue";
import { toPercent, formatNum } from "@/utils/format";

import * as Committee from "@/contract/committee";
import * as GovRewardModel from "@/contract/govRewardModel";
import { getRulerVoteProposalCount } from '@/api/governance'

import NP from "number-precision";

const props = defineProps({
  data: {
    type: Object,
    default: () => {},
  },
  loading: {
    type: Boolean,
    default: () => false,
  },
});

let { wallet, account, chain } = useWallet();
const state = reactive({
  loading: {
    fetchRewards: false,
    fetchCommitteeInfo: false,
    fetchVotedProposalsAmount: false,
  },
  votedProposalsAmount: 0, //需要读取日志获取 待完成
  committeeRewards: 0,
  votedWeight: 0,
  votingRewards: computed(() => {
    return NP.plus(props.data.voteRewards, props.data.voteAgainstRewards);
  }),
});

if (wallet.isConnected && account.value) {
  getGovernanceActivitiesData(account.value);
}

watch(
  () => [wallet.isConnected, account.value, chain.id],
  ([isConnected, accountValue]) => {
    if (isConnected && accountValue) {
      getGovernanceActivitiesData(accountValue);
    } else {
      state.committeeRewards = 0;
      state.votedProposalsAmount = 0;
      state.votedWeight = 0;
    }
  },
);

function getGovernanceActivitiesData(account, withLoading = true) {
  getCommitteeRewards(account, withLoading);
  getVotedInfo(account, withLoading);
  getVotedProposalsCount(account, withLoading);
}

async function getCommitteeRewards(account, withLoading = true) {
  try {
    state.loading.fetchRewards = withLoading;
    const res = await GovRewardModel.getCommitteeReward(account);
    state.committeeRewards = res;
  } catch (err) {
    console.log(err, "committeeRewards");
  } finally {
    state.loading.fetchRewards = false;
  }
}

async function getVotedInfo(account, withLoading = true) {
  try {
    state.loading.fetchCommitteeInfo = withLoading;
    const [userShares, totalIpistrStakedShare] = await Promise.all([
      Committee.getUserShares(account),
      Committee.getTotalIpistrStakedShare(),
    ]);
    const { totalShare } = userShares || {};
    state.votedWeight = toPercent((NP.divide(totalShare, totalIpistrStakedShare * 1) || 0) * 100);
  } catch (err) {
    console.log(err, "getVoteInfo");
  } finally {
    state.loading.fetchCommitteeInfo = false;
  }
}

async function getVotedProposalsCount(account, withLoading = true) {
  try {
    state.loading.fetchVotedProposalsAmount = withLoading;
    const res = await getRulerVoteProposalCount(account);
    state.votedProposalsAmount = res;
  } catch (err) {
    console.error("get voted proposals count =>", err);
  } finally {
    state.loading.fetchVotedProposalsAmount = false;
  }
}
</script>

<style lang="scss" scoped src="./info-group.scss"></style>
