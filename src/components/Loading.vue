<!-- shorter-ui button -->
<template>
  <div class="circle" />
</template>

<script>
export default {
  name: "Loading",
};
</script>

<style lang="scss" scoped>
.circle {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 1px solid #666;
  border-color: rgba($primary, 0.8);
  border-right-color: transparent;
  border-width: 2px;
  animation: round 1s infinite;
  border-radius: 50%;
}

@keyframes round {
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
