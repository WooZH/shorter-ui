<template>
  <div>
    <div class="select-token">
      <div class="title strong">
        <div class="icon shorter-icon back-btn" @click.self="$emit('back')">
          <svg class="icon shorter-icon" aria-hidden="true">
            <use xlink:href="#icon-back" />
          </svg>
        </div>
        Select a Token
      </div>

      <form class="form-search" @submit.prevent>
        <div class="form-control">
          <div class="prefix">
            <svg class="shorter-icon" aria-hidden="true" style="width: 24px; height: 24px">
              <use xlink:href="#icon-search" />
            </svg>
          </div>
          <input v-model.trim="state.searchKeywords" placeholder="Search token symbol/address" @input="inputLimit" />
        </div>
      </form>

      <ul class="token-list">
        <template v-if="filterTokenList.length > 0">
          <li
            v-for="(item, index) in filterTokenList"
            :key="index + item.symbol"
            class="token-item"
            @click="confirmToken(item)"
          >
            <div class="lt">
              <Image class="coin-icon" :src="item.logoURI ? item.logoURI : ''" />
              <div class="token-info">
                <p>{{ item.symbol }}</p>
                <small>{{ item.name }}</small>
              </div>
            </div>
            <div class="rt" />
          </li>
        </template>

        <div v-if="tokens.waiting" class="empty">Gathering token list...</div>

        <div v-else-if="!tokens.waiting && filterTokenList.length === 0" class="empty">No results found</div>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from "vue";
import { ethers } from "ethers";

import { useTokens } from "@/hooks/useTokens";

const emit = defineEmits(["back", "select"]);

const state = reactive({
  tab: 0,
  searchKeywords: "",
});

const { tokens, getTokenList } = useTokens();

getTokenList();

const filterTokenList = computed(() => {
  let resultList = [];
  if (tokens.waiting) return resultList;

  if (tokens.list && tokens.list.length) {
    resultList = tokens.list.filter(item => {
      const reg = new RegExp(state.searchKeywords, "gi");
      if (reg.test(item.symbol) || reg.test(item.name)) return item;
    });

    if (resultList.length > 0) return resultList;
  }

  if (ethers.utils.isAddress(state.searchKeywords)) {
    resultList = tokens.list.filter(item => {
      const reg = new RegExp(state.searchKeywords, "gi");
      if (reg.test(item.address)) return item;
    });

    return resultList;
  }

  return resultList;
});

function confirmToken(item) {
  emit("select", item);
}

function inputLimit() {
  state.searchKeywords = state.searchKeywords.replace(/[^0-9a-zA-Z]/g, "");
}
</script>

<style lang="scss" scoped>
.back-btn {
  cursor: pointer;
}

.title {
  @include flex-center;
  position: relative;
  font-size: 18px;
  color: #11142d;
  text-align: center;

  .icon {
    position: absolute;
    left: 0;
    top: 50%;
    width: 24px;
    height: 24px;
    cursor: pointer;
    transform: translateY(-50%);
  }
}

.select-token {
  .form-search {
    margin-top: 42px;

    .icon {
      margin-left: 19px;
      font-size: 18px;
    }

    input {
      padding-left: 16px;
      font-family: "Haas Grot Text";
    }
  }

  .token-list {
    @include scroller;
    height: 440px;
    overflow: auto;

    .empty {
      margin-top: 16px;
      color: #a4a5b2;
    }
  }

  .token-item {
    @include flex-center-v;
    justify-content: space-between;
    height: 68px;
    border-top: 1px solid #e4e4e4;
    cursor: pointer;

    &:first-child {
      border-top: none;
    }

    .rt {
      color: #a4a5b2;
      text-align: right;
    }

    .lt {
      display: flex;
      align-items: center;

      .coin-icon {
        width: 32px;
        height: 32px;
        margin-right: 15px;
        border-radius: 50%;
      }

      .token-info {
        transform: translateY(1px);
      }

      p {
        font-weight: 600;
      }

      small {
        color: #a4a5b2;
      }
    }
  }

  .add-token {
    display: block;

    .token-item {
      border: none;
    }

    .token-tips {
      @include flex-center-v;
      margin: 10px 0;
      justify-content: space-between;
      height: 44px;
      background: #fff3ee;
      border-radius: 8px;
      padding: 0 14px;

      div {
        @include flex-center-v;

        span {
          color: #eb6528;
          font-size: 14px;
          font-family: "Haas Grot Text";
          margin-left: 14px;
        }
      }

      .coin-icon {
        width: 24px;
        height: 24px;
      }

      svg {
        width: 24px;
        height: 24px;
        color: $primary;
      }
    }
  }

  .list-bottom {
    @include flex-center;
    margin-bottom: -32px;
    padding: 21px 0;
    font-weight: 600;
    border-top: 1px solid #e4e4e4;

    span {
      color: $primary;
      @include flex-center-v;
      cursor: pointer;
      font-family: Haas Grot Disp;
      font-weight: 600;

      svg {
        width: 20px;
        height: 20px;
        margin-right: 8px;
      }
    }
  }
}
</style>
