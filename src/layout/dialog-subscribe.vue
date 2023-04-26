<template>
  <div class="screen-mask" @click.self="$emit('close')">
    <div class="subscribe-wrap">
      <div class="subscribe">
        <p class="title">Stay up-to-date with us</p>
        <p class="subscribe-title describe-lg">Receive updates to catch up on the latest stories</p>
        <subscribeMail :type="true" @success="subscribeSuccess" />
      </div>
      <div class="close-btn">
        <img src="@/assets/images/close.svg" @click="$emit('close')" />
      </div>
    </div>
  </div>
</template>
<script setup>
import subscribeMail from "./subscribe-mail.vue";

const emit = defineEmits(["success", "close"]);

function subscribeSuccess(address) {
  emit("success", address);
}
</script>
<style lang="scss" scoped>
.screen-mask {
  transition: all 0.3s;
  justify-content: center;
  align-items: center;
  position: fixed;
  width: 100vw;
  height: 100%;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  z-index: 999;
}
.subscribe-wrap {
  position: relative;
  width: 560px;
  border-radius: 24px;
  background: #fff;
  z-index: 1000;
  padding: 24px 32px;
}
.subscribe {
  font-size: 20px;
  line-height: 30px;
  .title {
    font-weight: 600;
    font-family: "Haas Grot Disp";
  }
}
.subscribe-title {
  margin-top: 40px;
  font-size: 16px;
  line-height: 24px;
  color: #a4a5b2;
}
.close-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  transition: all 0.3s;
  cursor: pointer;
  position: absolute;
  right: 32px;
  top: 20px;
  &:hover {
    box-shadow: 0 10px 12px rgba(#e3e6ec, 0.5);
    img {
      transform: rotate(180deg);
      transition: 0.3s;
    }
  }
}
</style>
