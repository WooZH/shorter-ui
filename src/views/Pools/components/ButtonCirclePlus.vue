<template>
  <div class="btn-container">
    <div class="btn-circle-plus">
      <div class="text-content">
        <span>Create pool</span>
      </div>
    </div>
    <svg class="circle-plus" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="#fff">
      <path
        d="M7.5 3a.5.5 0 00-.5.5V7H3.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5H7v3.5a.5.5 0 00.5.5h1a.5.5 0 00.5-.5V9h3.5a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5H9V3.5a.5.5 0 00-.5-.5h-1z"
      />
    </svg>
  </div>
</template>

<script>
export default {};
</script>

<style lang="scss" scoped>
.btn-container {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translate(100%, -50%);
  margin-top: 1px;
  cursor: pointer;
  color: #fff;
  .circle-plus {
    position: absolute;
    left: 2px;
    top: 50%;
    transform: translateY(-50%);
  }
  &:hover {
    .circle-plus {
      transition: 0.2s all;
      left: 15px;
    }
    .btn-circle-plus {
      animation: expand 0.2s forwards;
    }
    .text-content {
      animation: expand-text 0.15s 0.15s forwards;
    }
  }
}
.btn-circle-plus {
  position: relative;
  width: 20px;
  height: 20px;
  background: $primary;
  border-radius: 50%;
  transition: 0.3s;
  .text-content {
    @include flex-center-v;
    overflow: hidden;
    position: absolute;
    width: 0;
    height: 100%;
    left: 50%;
    top: 50%;
    transform: translateY(-50%);
    background: $primary;
    border-top-right-radius: 20px;
    border-bottom-right-radius: 20px;
    white-space: nowrap;
    font-size: 14px;
    font-family: Haas Grot Text;
    font-weight: 500;
    text-align: center;
    span {
      margin-left: 15px;
    }
  }
}
@keyframes expand {
  to {
    width: 40px;
    height: 40px;
  }
}
@keyframes expand-text {
  from {
    visibility: unset;
    width: 40px;
    height: 40px;
  }
  to {
    visibility: unset;
    width: 120px;
    height: 40px;
  }
}
</style>
