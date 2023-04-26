<template>
  <div v-if="!loading" class="votes-result">
    <div class="panel-container">
      <div class="panel">
        <div class="progress-container">
          <div class="status">
            <span>For</span>
            <span>
              <SmartNumber type="quantity" :value="proposalDetail.total_for_votes" />
            </span>
          </div>
          <shorterProgress color="#02D396" :stroke-width="8" :percentage="proposalDetail.forPercent" />
        </div>
        <ul class="vote-list">
          <header>
            {{ state.forAmount }}
            {{ state.forAmount > 1 ? "Addresses" : "Address" }}
            <span>Votes</span>
          </header>
          <li v-for="(item, index) in filterVotes(forList, 3, 'for')" :key="index">
            <div>
              {{ item.account ? ellipsisStr(item.account) : "" }}
            </div>
            <div>
              <SmartNumber type="quantity" :value="item.share || ''" />
            </div>
          </li>

          <footer>
            <div>
              <span :class="{ disable: state.forAmount <= 3 }" @click="showVoteList(1)">View all</span>
            </div>
            <div>
              <span v-if="wallet.isConnected" :class="{ disable: proposalDetail.status > 1 }" @click="showVote(1)">
                Vote
              </span>
              <span v-else @click="wallet.visible = true">Unlock wallet</span>
            </div>
          </footer>
        </ul>
      </div>
    </div>
    <div class="panel-container">
      <div class="panel">
        <div class="progress-container">
          <div class="status">
            <span>Against</span>
            <span>
              <SmartNumber type="quantity" :value="proposalDetail.total_against_votes" />
            </span>
          </div>
          <ShorterProgress color="#EF5A4F" :stroke-width="8" :percentage="proposalDetail.againstPercent" />
        </div>
        <ul class="vote-list">
          <header>
            {{ state.againstAmount }}
            {{ state.againstAmount > 1 ? "Addresses" : "Address" }}
            <span>Votes</span>
          </header>
          <li v-for="(item, index) in filterVotes(againstList, 3, 'against')" :key="index">
            <div>
              {{ item.account ? ellipsisStr(item.account) : "" }}
            </div>
            <div>
              <SmartNumber type="quantity" :value="item.share || ''" />
            </div>
          </li>
        </ul>

        <footer>
          <div>
            <span :class="{ disable: state.againstAmount <= 3 }" @click="showVoteList(0)">View all</span>
          </div>
          <div>
            <span v-if="wallet.isConnected" :class="{ disable: proposalDetail.status > 1 }" @click="showVote(0)">
              Vote
            </span>
            <span v-else @click="wallet.visible = true">Unlock wallet</span>
          </div>
        </footer>
      </div>
    </div>
  </div>
  <div v-else class="votes-result">
    <div v-for="i in 2" :key="i" class="panel-container">
      <div class="panel">
        <shorterSkeleton animated>
          <template #template>
            <div class="skeleton-container">
              <div style="display: flex; justify-content: space-between">
                <shorterSkeletonItem style="height: 28px; width: 24%" />
                <shorterSkeletonItem style="height: 28px; width: 24%" />
              </div>
              <br />
              <div>
                <shorterSkeletonItem style="height: 20px; width: 100%" />
              </div>
              <br />
              <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
                <shorterSkeletonItem style="height: 20px; width: 12%" />
                <shorterSkeletonItem style="height: 20px; width: 12%" />
              </div>
              <ul>
                <li v-for="r in 3" :key="r" style="display: flex; justify-content: space-between; padding: 14px 0">
                  <shorterSkeletonItem style="height: 20px; width: 32%" />
                  <shorterSkeletonItem style="height: 20px; width: 32%" />
                </li>
              </ul>
              <div style="display: flex; justify-content: space-between; margin-top: 24px">
                <shorterSkeletonItem style="height: 40px; width: 26%" />
                <shorterSkeletonItem style="height: 40px; width: 26%" />
              </div>
            </div>
          </template>
        </shorterSkeleton>
      </div>
    </div>
  </div>
  <Dialog v-model="dialogsVisible.voteList" width="560px">
    <div class="dialog-vote-list votes-result">
      <h4 class="title">{{ state.title }} Votes--{{ transPercent(state.percent) }}%</h4>
      <div class="progress-container">
        <div class="status">
          <span>{{ state.title }}</span>
          <span>{{ formatNum(state.total) }}</span>
        </div>
        <ShorterProgress
          :color="state.title === 'For' ? '#02D396' : '#EF5A4F'"
          :stroke-width="8"
          :percentage="state.percent"
        />
      </div>
      <ul class="vote-list">
        <header>
          <span>
            {{ state.title == "For" ? state.forAmount : state.againstAmount }}
            <span v-if="state.title == 'For'">{{ state.forAmount > 0 ? "Addresses" : "Address" }}</span>
            <span v-else>{{ state.againstAmount > 0 ? "Addresses" : "Address" }}</span>
          </span>
          <span>Votes</span>
        </header>
        <li v-for="voter in filterVotes(state.list)" :key="voter">
          <td>{{ ellipsisStr(voter.account) }}</td>
          <td>{{ toQuantity(voter.share, balance.price) }}</td>
        </li>
      </ul>
    </div>
  </Dialog>

  <Dialog v-model="dialogsVisible.vote" width="464px">
    <div class="dialog-vote">
      <h4 class="title">Vote on this Proposal</h4>
      <form @submit.prevent>
        <div class="form-group">
          <label>Amount</label>
          <div class="form-control">
            <input v-model="state.form.amount" v-number-only type="text" placeholder="0" />
            <span
              class="suffix max"
              @click="
                () => {
                  state.form.amount = availableVoteAmount;
                }
              "
            >
              MAX
            </span>
          </div>
          <div class="addition">
            <small>Available</small>
            <span>
              {{ formatNum(availableVoteAmount, 2, true) }}
              {{ "Vote" }}{{ availableVoteAmount > 1 ? "s" : "" }}
            </span>
          </div>
        </div>
        <shorterButton
          type="primary"
          style="width: 100%; height: 56px"
          :loading="state.loading.vote"
          :disabled="state.form.voteBtnAllow"
          @click="onVote({ ...state.form })"
        >
          Submit
        </shorterButton>
      </form>
    </div>
  </Dialog>
</template>

<script setup>
import { reactive } from "vue";
import { useRoute } from "vue-router";

import * as Committee from "@/contract/committee";
import { ellipsisStr, toQuantity, addThousandsSep, dealDecimals, formatNum } from "@/utils/format";

import { Message } from "@/hooks/useMessage";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";

import { handleRpcError } from "@/utils/handleError";
import * as Transfer from "@/utils/transfer";

const props = defineProps({
  loading: {
    type: Boolean,
    default: () => true,
  },
  availableVoteAmount: {
    type: [String, Number],
    default: () => "",
  },
  proposalDetail: {
    type: Object,
    default: () => {},
  },
  forList: {
    type: Array,
    default: () => [],
  },
  againstList: {
    type: Array,
    default: () => [],
  },
});
const emit = defineEmits(["refreshData"]);

const { account, wallet } = useWallet();
const { balance } = useBalance();
const route = useRoute();
const state = reactive({
  forAmount: 0,
  againstAmount: 0,
  list: [],
  title: "For",
  total: 0,
  percent: 0,
  form: {
    voteBtnAllow: false,
    amount: "",
    type: 0,
    btnStatus: {
      voteWaiting: false,
      vote: false,
    },
  },
  loading: {
    vote: false,
  },
});

const dialogsVisible = reactive({
  voteList: false,
  vote: false,
});

/**
 * @description:预览投票列表
 * @param {*} type
 * @return {*}
 */
function showVoteList(type) {
  const proposalDetail = props.proposalDetail;
  if (type === 1) {
    state.title = "For";
    state.percent = proposalDetail.forPercent;
    state.list = props.forList;
    state.total = proposalDetail.total_for_votes;
  }
  if (type === 0) {
    state.title = "Against";
    state.percent = proposalDetail.againstPercent;
    state.list = props.againstList;
    state.total = proposalDetail.total_against_votes;
  }
  dialogsVisible.voteList = true;
}

/**
 * @description: 打开投票弹窗
 * @param {*} type
 * @return {*}
 */
async function showVote(type) {
  if (account.isRuler) {
    dialogsVisible.vote = true;
    state.form.type = type;
    state.form.amount = "";
  } else {
    Message.error("Voting is exclusive to Rulers.");
  }
}

function transPercent(number) {
  if (number) {
    return (number * 1).toFixed(2);
  }
  return 0;
}

async function onVote(form) {
  if (!(form.amount > 0)) {
    Message.warning("Please enter a valid value");
    return false;
  }
  if (form.amount * 1 > props.availableVoteAmount * 1) {
    Message.warning("Too large amount. Try a smaller value.");
    return;
  }
  if (props.availableVoteAmount * 1 === 0) {
    form.voteBtnAllow = true;
    Message.warning("Failed to vote");
    return;
  }
  if (props.proposalDetail.status * 1 !== 0) {
    form.voteBtnAllow = true;
    Message.warning(`Proposal #${props.proposalDetail.id} is finished`);
    return;
  }
  const params = {
    proposalId: route.params.id,
    type: form.type,
    from: account.value,
    voteShare: dealDecimals(form.amount, balance.decimals),
  };
  try {
    state.loading.vote = true;
    await Committee.voteProposal(params);
    state.form.amount = "";
    setTimeout(() => {
      dialogsVisible.vote = false;
    }, 1000);
    emit("refreshData");
    Message.success("Voted successfully");
  } catch (error) {
    if (error.message.indexOf("Not an active proposal") !== -1) {
      Message.error("This is not an active proposal");
      dialogsVisible.vote = false;
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      handleRpcError(error);
    }
  } finally {
    state.loading.vote = false;
  }
}

function filterVotes(arr, length, type) {
  const map = {},
    result = [];
  const tempArr = arr.concat();
  tempArr.forEach(item => {
    const { account, share_big } = item;
    if (!map[account]) {
      map[account] = share_big;
    } else {
      map[account] = map[account].add(share_big);
    }
  });
  Object.keys(map).forEach(item => {
    result.push({
      account: item,
      share: Transfer.receiveAmount(map[item]),
    });
  });
  if (type) {
    const amount = Object.keys(map).length;
    if (type == "for") {
      state.forAmount = amount;
    } else if (type == "against") {
      state.againstAmount = amount;
    }
  }

  if (length) {
    while (result.length < length) {
      result.push({});
    }
    return result.sort((a, b) => b.share - a.share).slice(0, 3);
  }
  return result.sort((a, b) => b.share - a.share);
}
</script>

<style lang="scss" scoped>
.votes-result {
  @include flex;
  margin: -16px;
  .panel-container {
    flex: 1;
    align-self: flex-start;
    .panel {
      height: 412px;
    }
  }
  .progress-container {
    .status {
      @include flex;
      justify-content: space-between;
      margin-bottom: 16px;
      font-size: 18px;
      color: #11142d;
      font-family: Haas Grot Disp;
      font-weight: 600;
    }
  }
  footer {
    @include flex;
    padding: 21px 0;
    margin-bottom: -32px;
    div {
      @include flex-center;
      flex: 1;
      height: 36px;
      &:nth-child(2) {
        border-left: 1px solid #e4e4e4;
      }
      span {
        font-weight: 600;
        color: #a4a5b2;
        cursor: pointer;
        &:hover {
          color: $primary;
        }
        &.disable {
          opacity: 0.3;
          pointer-events: none;
        }
      }
    }
  }
}
.vote-list {
  header {
    @include flex-center-v;
    justify-content: space-between;
    height: 64px;
    color: #a4a5b2;
    font-size: 13px;
    border-bottom: 1px solid #e4e4e4;
  }
  li {
    @include flex-center-v;
    justify-content: space-between;
    height: 64px;
    border-bottom: 1px solid #e4e4e4;
  }
}

.dialog-vote-list {
  display: block;
  padding: 32px;
  font-family: Haas Grot Text;
  &.votes-result {
    margin: 0;
  }
  .title {
    margin-bottom: 48px;
    font-size: 18px;
    font-family: Haas Grot Disp;
    font-weight: 600;
    color: #11142d;
  }
  .vote-list {
    @include scroller;
    height: 384px;
    padding-right: 8px;
    overflow-y: auto;
  }
}
.dialog-vote {
  padding: 32px;
  font-family: Haas Grot Text;
  .title {
    font-size: 18px;
    font-family: Haas Grot Disp;
    font-weight: 600;
    color: #11142d;
    margin-bottom: 48px;
  }
  .addition {
    @include flex;
    justify-content: space-between;
    margin-top: 17px;
    margin-bottom: 30px;
    small {
      color: #a4a5b2;
    }
  }
}
</style>
