<template>
  <div class="transaction">
    <div class="icon-container">
      <CircleCheck class="icon success" />
    </div>
    <div class="hash-content">
      <div class="title">
        Transaction Confirmed
      </div>
      <div
        class="link"
        @click="onBrower(transaction.hash)"
      >
        <span>{{ ellipsisStr(transaction.hash) }}</span>
        <svg
          class="shorter-icon"
          aria-hidden="true"
        >
          <use xlink:href="#icon-share" />
        </svg>
      </div>
    </div>
  </div>
</template>
<script>
import { transaction } from "@/hooks/useTransaction";
import { ellipsisStr } from "@/utils/format";
import { getContractAddress } from "@/contract";
import { openUrl } from "@/utils/url";
import {Message} from "@/hooks/useMessage";


export default {
  setup() {
    function onBrower(hash) {
      if (hash) {
        const contractAddress = getContractAddress();
        openUrl(`${contractAddress.scanURL}/tx/${hash}`, "onBrower");
      } else {
        Message.warning("Unavailable transaction data.");
      }
    }
    return {
      onBrower,
      ellipsisStr,
      transaction
    };
  }
};
</script>
<style lang="scss" scoped>
.transaction {
  @include flex;
  position: fixed;
  width: 250px;
  right: 64px;
  top: 96px;
  margin-left: -325px;
  background: #fff;
  box-shadow: 0px 10px 40px -4px rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  z-index: 10000;
  transition: 0.3s;
  .hash-content {
    padding: 10px 5px;
    .title {
      font-family: 'Haas Grot Disp';
      font-weight: 400;
      letter-spacing: 0.1px;
      color: #11142d;
      margin-bottom: 8px;
      font-size: 16px;
    }
    .link {
      color: #4a73f6;
      cursor: pointer;
      span {
        margin-right: 4px;
      }
    }
  }
  .icon-container {
    @include flex-center;
    width: 56px;
    border-radius: 16px 0px 0px 16px;
    color: #fff;
    font-size: 24px;
    .icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      &.success {
        background: #02d396;
      }
    }
  }
}
</style>
