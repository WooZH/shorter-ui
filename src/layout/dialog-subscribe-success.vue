<template>
  <div class="screen-mask" @click.self="$emit('close')">
    <div class="subscribe-wrap">
      <div class="subscribe">
        <img src="@/assets/images/icon-mail.svg" class="subscribe-icon" alt="" />
        <p class="title title-h2 subscribe-title">Thanks for signing up</p>
        <p class="subscribe-intro">Check your inbox {{ address }} for a welcome note.</p>
        <p class="subscribe-intro">
          Add
          <span class="strong">shorter@getrevue.co</span>
          to the address book to keep you in the loop.
        </p>
      </div>
      <div class="close-btn">
        <img src="../assets/images/close.svg" alt="" @click="$emit('close')" />
      </div>
    </div>
  </div>
</template>
<script setup>
defineProps({
  address: {
    default: "",
    type: String,
  },
});
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
  text-align: center;

  width: 560px;
  border-radius: 24px;
  background: #fcfbfa;
  z-index: 1000;
  padding: 24px 32px;
}
.subscribe-title {
  text-align: left;
  font-size: 20px;
  font-weight: 600;
  line-height: 30px;
  margin-bottom: 12px;
}
.subscribe-intro {
  text-align: left;
  font-size: 16px;
  font-weight: normal;
  line-height: 24px;
  color: #a4a5b2;
}
.close-btn {
  border-radius: 50%;
  transition: all 0.3s;
  cursor: pointer;
  position: absolute;
  right: 32px;
  top: 24px;
  &:hover {
    box-shadow: 0 10px 12px rgba(#e3e6ec, 0.5);
    img {
      transform: rotate(180deg);
      transition: 0.3s;
    }
  }
}
.strong {
  color: #ef814e;
}
</style>
