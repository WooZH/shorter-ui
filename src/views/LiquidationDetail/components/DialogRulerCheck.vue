<template>
  <div class="ruler-check">
    <div v-show="type">
      <p>
        You can’t engage liquidations and get privileged rewards till you join the
        <b>Committee</b>
        .
        <a href="https://docs.shorter.finance/roles/key-actors.html#ruler" target="blank" class="shorter-link">
          Learn more
        </a>
      </p>
    </div>
    <div v-show="!type">
      <slot />
    </div>
    <router-link :to="{ name: 'Governance', query: route.query }">
      <shorterButton type="primary" class="full big">Be a Ruler right now</shorterButton>
    </router-link>
    <div class="close">
      <span @click="$emit('close')">Thanks, maybe later</span>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from "vue-router";
const emit = defineEmits(["close"]);
defineProps({
  type: {
    type: Boolean,
    default: () => true,
  },
});
const route = useRoute();
</script>

<style lang="scss" scoped>
.ruler-check {
  padding: 32px;
  padding-bottom: 17px;
  width: 440px;
  p {
    font-size: 16px;
    line-height: 24px;
    margin-bottom: 30px;
    word-break: keep-all;
    span {
      color: $primary;
    }
    b {
      color: #333;
      font-weight: 600;
    }
  }
  .close {
    color: #bbb;
    font-size: 14px;
    text-align: center;
    margin-top: 10px;
    span {
      display: inline-block;
      cursor: pointer;
      padding: 5px;
      transition: all 0.3s;

      &:hover {
        color: rgb(146, 146, 146);
      }
    }
  }
}
</style>
