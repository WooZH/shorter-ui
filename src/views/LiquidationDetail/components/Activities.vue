<template>
  <div class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">Activities</h4>
    </header>

    <div class="panel">
      <shorterSkeleton v-if="liquidationDetail.loading" style="height: 224px" animated>
        <template #template>
          <div v-for="i in 6" :key="i" class="flex-center-v" style="height: 56px">
            <shorterSkeletonItem variant="circle" style="width: 24px; height: 24px" />
            <div style="margin-left: 8px; width: 220px">
              <shorterSkeletonItem style="width: 100%; height: 16px" />
              <shorterSkeletonItem style="width: 40%; height: 16px; margin-top: 3px" />
            </div>
          </div>
        </template>
      </shorterSkeleton>

      <transition-group
        v-if="!liquidationDetail.loading && sortedActivitiesList.length > 0"
        tag="ul"
        name="list"
        class="activity-list"
      >
        <li v-for="activity in sortedActivitiesList" :key="activity.status + activity.address" class="activity-item">
          <div v-if="activity.isBot" class="icon bot">
            <svg class="shorter-icon" aria-hidden="true">
              <use xlink:href="#icon-bot" />
            </svg>
          </div>
          <div v-else class="icon man">
            <svg class="shorter-icon" aria-hidden="true">
              <use xlink:href="#icon-man" />
            </svg>
            <div v-if="activity.address === account.value" class="me">me</div>
          </div>

          <div class="rt">
            <h4>{{ ellipsisStr(activity.address) }}</h4>
            <p>
              <span>{{ statusFilter(activity.status) }}</span>
            </p>
          </div>
          <div class="right">
            <div
              v-tooltip.top="activity.status == 1 ? `Est. earning amount` : `Earned amount`"
              :disabled="activity.status * 1 === 0"
            >
              <div v-show="activity.profit && activity.status" class="estimated-profit">
                <span v-if="activity.profit > 0.01">
                  <SmartNumber type="amount" :value="activity.profit" />
                </span>
                <span v-else>&lt; $0.01</span>
              </div>
            </div>
            <div class="time">
              {{ formatDate(activity.time, "HH:mm:ss") }}
            </div>
          </div>
        </li>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, computed, ref, reactive, watch } from "vue";
import { useRoute } from "vue-router";

import { getContractAddress } from "@/contract";

import * as activityAction from "@/api/activities";
import { useWallet } from "@/hooks/useWallet";

import { ellipsisStr, formatDate } from "@/utils/format";

let socket = null;

const props = defineProps({
  state: {
    type: Number,
    default: 2,
  },
  phase: {
    type: Number,
    default: 1,
  },
});

const route = useRoute();
const { account } = useWallet();
const socketHeart = ref(null);

const liquidationDetail = reactive({
  activityList: [],
  myself: {},
  me: false,
  loading: true,
});

const currentState = computed(() => {
  switch (props.state) {
    case 1:
    case 2:
      if (props.phase == 1) {
        return "tanto";
      } else {
        return "katana";
      }
    case 4:
      return "naginata";

    default:
      return "";
  }
});

// sort activities list

const sortedActivitiesList = computed(() => {
  // let me = {};
  // let sortedList = [];
  // let sendingList = [];
  // let watchingList = [];
  // let isMeExist = 0;

  // liquidationDetail.activityList.forEach(item => {
  //   if (item.isMe) {
  //     me = item;
  //   }

  //   // split array by status
  //   // status: 1 sending order
  //   // status: 0 watching
  //   if (item.status) {
  //     sendingList.push(item);
  //   } else if (!item.status && !item.isMe) {
  //     watchingList.push(item);
  //   }
  // });

  // if (!isMeExist) me = liquidationDetail.myself;

  // function compareProfit(x, y) {
  //   return y.profit - x.profit;
  // }

  function compareEnterTime(x, y) {
    const diff = y.time - x.time;
    if (diff > 0) {
      return 1;
    } else if (diff < 0) {
      return -1;
    } else {
      return 0;
    }
  }
  // sendingList = sendingList.sort(compareProfit);
  /*
   *! start modify orderBy time
   */
  let sortedList = liquidationDetail.activityList.concat();
  sortedList = sortedList.sort(compareEnterTime);

  // sending人数超过或等于10人
  // if (sendingList.length >= 10) {
  //   // me参与投标
  //   // 且收益低于列表第十人 ，永远将第十人替换为me
  //   if (me.status) {
  //     if (me.profit <= sendingList[9].profit) {
  //       sendingList.splice(9, 1, me);
  //       // 超过十条则不考虑watching列表 直接返回 sending列表作为结果
  //       return sendingList;
  //     }
  //   } else {
  //     // me
  //     sendingList.splice(9, 1, me);
  //   }
  // } else {
  //   // 如果sending.length < 10，考虑watching
  //   // 如果 me 没有参与竞拍，则放在watching第一个
  //   watchingList = watchingList.sort(compareEnterTime);
  //   let watchMe = false;
  //   watchingList.forEach(item => {
  //     if (item.isMe) {
  //       watchMe = true;
  //     }
  //   });
  //   sendingList.forEach(item => {
  //     if (item.isMe) {
  //       isMeExist = 1;
  //     }
  //   });

  //   if (!isMeExist && !watchMe) {
  //     watchingList.unshift(getCurrentUser());
  //   }
  // }

  // sortedList = sendingList.concat(watchingList);

  // more than 10 counts cut the others

  if (sortedList.length > 10) {
    sortedList = sortedList.slice(0, 10);
    liquidationDetail.activityList = sortedList;
  }

  return sortedList;
});

function statusFilter(status) {
  switch (status) {
    case 0:
      return "Watching";
    case 1:
      return "Ordering";
    case 2:
      return "Ordered";

    default:
      return "Watching";
  }
}

watch(
  () => [props.state, props.phase],
  () => {
    liquidationDetail.activityList = [];
    fetchHistoryActivities();
  },
  { deep: true },
);
watch(
  () => [account.value],
  () => {
    userWatch(route.params.id, account.value);
  },
  { deep: true },
);

onMounted(() => {
  fetchHistoryActivities();
});

async function fetchHistoryActivities() {
  const res = await activityAction.getUserHistory(route.params.id, currentState.value);

  if (res.status) {
    const result = res.data;
    result.forEach(item => {
      if (item.account === account.value) liquidationDetail.me = true;
      newUserEnter(handleUser(item));
    });

    liquidationDetail.loading = false;
    fetchActivityList(route.params.id);
  }

  userWatch(route.params.id, account.value);
}

function wsAnswer(val) {
  const params = { pong: val };
  if (route.params.id) {
    socket.send(JSON.stringify(params));
  }
}

function fetchActivityList() {
  const contractAddress = getContractAddress();
  socket = window.io(contractAddress.apiUrl, {
    path: "/wss",
    reconnectionAttempts: 20,
  });

  socket.on("connect", () => {
    socket.send(
      JSON.stringify({
        ping: new Date().getTime(),
      }),
    );

    socketHeart.value = setInterval(() => {
      socket.send(
        JSON.stringify({
          ping: new Date().getTime(),
        }),
      );
    }, 5 * 1000);

    socket.emit("subscribe", route.params.id);
  });

  socket.on("message", data => {
    const res = JSON.parse(data);
    if (res.status) {
      return;
    }

    if (res.ping) {
      wsAnswer(res.ping);
      return;
    }

    dealWsMessage(res);
  });

  socket.on("disconnect", event => {
    console.log("disconnect", event);
  });

  socket.on("reconnect_attempt", event => {
    console.log("reconnect", event);
  });
}

onBeforeUnmount(() => {
  if (socketHeart.value) clearInterval(socketHeart.value);
  if (socket) socket.close();
});

function getCurrentUser() {
  if (account.value) {
    liquidationDetail.myself = {
      address: account.value,
      time: new Date(),
      avatar: "../assets/images/swap.svg",
      status: 0,
      isMe: 1,
    };

    return liquidationDetail.myself;
  }
  return null;
}

function newUserEnter(newUser) {
  let tmpArr = liquidationDetail.activityList.concat();
  if (newUser.tx_hash) {
    const existIndex = tmpArr.findIndex(item => {
      console.log("item.address === newUser.address", item, newUser);
      return (
        (!item.status && item.address === newUser.address) || (item.status === 1 && item.tx_hash === newUser.tx_hash)
      );
    });

    const existItem = tmpArr.find(item => {
      return item.tx_hash === newUser.tx_hash;
    });
    console.log("existItem", existItem);
    let replaceUser = newUser;
    if (newUser.status === 2 && existItem) {
      replaceUser = Object.assign(existItem, { status: newUser.status, time: newUser.time });
    }
    if (existIndex > -1) tmpArr.splice(existIndex, 1);
    tmpArr.push(replaceUser);
  } else {
    tmpArr.push(newUser);
  }
  liquidationDetail.activityList = tmpArr;
}

function dealWsMessage(res) {
  const newUser = handleUser(res);

  newUserEnter(newUser);
}

function handleUser(data) {
  console.log("data", data);
  let opType = "";
  const opTypeFromData = data.op_type;
  switch (opTypeFromData) {
    case "Watching":
      opType = 0;
      break;
    case "Ordering":
      opType = 1;
      break;
    case "Ordered":
      opType = 2;
      break;

    default:
      break;
  }

  const address = data.account ? data.account : data.account_address;
  const isMe = account.value === address ? 1 : 0;

  return {
    address: address,
    time: data.timestamp * 1000,
    profit: data.estimate_rewards || "",
    avatar: "../assets/images/swap.svg",
    status: opType,
    tx_hash: data.tx_hash,
    isMe: isMe,
  };
}

async function userWatch(position, account) {
  const params = {
    tx_hash: "",
    position_address: position,
    account_address: account,
    user_type: currentState.value,
    op_type: "Watching",
  };

  const res = await activityAction.userCommit(params);
  console.log("currentState.value", currentState.value, res);
}
</script>

<style lang="scss" scoped>
.panel {
  position: relative;
  height: 390px;
  padding-top: 16px;
}

.activity-list {
  height: 100%;
  cursor: pointer;
  overflow-y: auto;
  padding-right: 6px;
  &::-webkit-scrollbar {
    width: 5px;
    height: 8px;
    background-color: rgba(#e4e4e4, 0.2);
  }
  &::-webkit-scrollbar-thumb {
    background: #e4e4e4;
    border-radius: 2px;
  }
}

.activity-item {
  @include flex-center-v;
  height: 56px;
  position: relative;
  &:not(&:last-child) {
    border-bottom: 1px solid #e4e4e4;
  }

  .icon {
    @include flex-center-h;
    align-items: flex-end;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    flex-shrink: 0;
    &.bot {
      background: #4f9bef;
    }
    &.man {
      background: #ef814f;
    }
    svg {
      width: 93%;
      height: 93%;
    }
  }

  .rt {
    margin-left: 8px;
    flex: 1;
    h4 {
      font-size: 14px;

      margin-bottom: 3px;
    }
    p {
      @include flex-center-v;
      i {
        width: 6px;
        height: 6px;
        margin-right: 4px;
        border-radius: 50%;
        background: #02d396;
      }
      span {
        font-size: 12px;
        color: #a4a5b2;
      }
    }
  }

  .me {
    width: 24px;
    height: 12px;
    background: #ef814f;
    border-radius: 6px;
    border: 1px solid #ffffff;
    font-size: 10px;
    text-align: center;
    color: #ffffff;
    line-height: 12px;
    position: absolute;
    transform: translateY(5px);
  }
  .right {
    @include flex-column;
    align-items: flex-end;
    .estimated-profit {
      color: #02d396;
      font-size: 14px;
      position: relative;
      margin-bottom: 3px;
      &::before {
        content: "";
        display: block;
        position: absolute;
        left: -9px;
        top: 4px;
        height: 0;
        width: 0;
        border-left: 3px solid transparent;
        border-right: 3px solid transparent;
        border-bottom: 6px solid #02d396;
      }
    }
    .time {
      color: #a4a5b2;
      font-size: 12px;
    }
  }
}

.list-move, /* apply transition to moving elements */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* ensure leaving items are taken out of layout flow so that moving
   animations can be calculated correctly. */
.list-leave-active {
  position: absolute;
}
</style>
