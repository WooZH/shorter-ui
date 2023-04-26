<template>
  <div class="dialog-RPC-notice">
    <h4 class="title">
      RPC Congested!
    </h4>
    <div class="notice-content">
      <p>The RPC using on page is jammed by too much traffic.</p>
      <shorterButton class="btn" type="primary" @click="openDocs">Solve it!</shorterButton>
    </div>
  </div>
</template>

<script>
import { openUrl } from "@/utils/url";
export default {
  setup() {
    function openDocs() {
      openUrl("https://docs.shorter.finance/faqs/rpc-issues.html");
    }
    return {
      openDocs,
    };
  },
};
</script>

<style lang="scss" scoped>
.dialog-RPC-notice {
  padding: 32px;
  font-family: Haas Grot Text;
}
h4.title {
  font-family: Haas Grot Disp;
  font-weight: 600;
  color: #11142d;
  font-size: 18px;
}
.notice-content {
  p {
    font-size: 16px;
    color: #606266;
    line-height: 24px;
    margin-top: 44px;
  }
  .btn {
    width: 100%;
    height: 56px;
    border-radius: 16px;
    margin-top: 40px;
  }
}
</style>
