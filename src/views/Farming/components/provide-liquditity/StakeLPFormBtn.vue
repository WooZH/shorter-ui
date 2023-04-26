<template>
  <shorterButton v-if="!walletConnect" class="btn-submit big" type="primary" plain @click="handleConnectWallet">
    Unlock wallet
  </shorterButton>

  <shorterButton
    v-else-if="firstTokenApprove"
    class="btn-submit big"
    type="primary"
    :loading="approveLoading"
    @click="handleApprove(firstToken)"
  >
    Approve {{ firstToken }}
  </shorterButton>

  <shorterButton
    v-else-if="secondTokenApprove && !firstTokenApprove"
    class="btn-submit big"
    type="primary"
    :loading="approveLoading"
    @click="handleApprove(secondToken)"
  >
    Approve {{ secondToken }}
  </shorterButton>
  <shorterButton
    v-else
    class="btn-submit big"
    type="primary"
    :loading="stakeLoading"
    :disabled="btnDisabled"
    @click="handleStake"
  >
    {{ btnText }}
  </shorterButton>
</template>

<script setup>
defineProps({
  walletConnect: Boolean,
  approveLoading: Boolean,
  stakeLoading: Boolean,
  firstTokenApprove: Boolean,
  secondTokenApprove: Boolean,
  btnDisabled: Boolean,

  firstToken: {
    type: String,
    default: "IPISTR",
  },
  secondToken: {
    type: String,
    default: "USDT",
  },
  btnText: {
    type: String,
    default: "Stake",
  },
});

const emit = defineEmits(['connectWallet', 'approve', 'stake'])

const handleConnectWallet = () => {
  emit('connectWallet')
}

const handleApprove = (token) => {
  emit('approve', token);
}

const handleStake = () => {
  emit('stake');
}
</script>

<style lang="scss" scoped></style>
