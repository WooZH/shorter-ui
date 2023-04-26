<template>
  <div class="progress-bar">
    <div class="progress" />
  </div>
</template>

<script>
export default {
  name: "CountdownProgress",
};
</script>


<style lang="scss" scoped>
.progress-bar {
  background: #f8f8f8;
  height: 4px;
  border-radius: 2px;
  .progress {
    width: 0%;
    height: 100%;
    background: #a5bac4;
    border-radius: 2px;
    animation: extend 5s infinite linear;
  }
  @keyframes extend {
    0% {
      width: 0%;
      opacity: 1;
    }

    95% {
      width: 95%;
      opacity: 1;
    }
    100% {
      width: 100%;
      opacity: 0;
    }
  }
}
</style>
