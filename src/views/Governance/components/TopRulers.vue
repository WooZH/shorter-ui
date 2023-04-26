<template>
  <div class="panel-container">
    <header class="panel-header">
      <h4 class="panel-title">Ruler Leaderboard</h4>
    </header>
    <div class="panel">
      <shorterSkeleton :loading="state.loading.fetchRulers">
        <template #template>
          <shorterSkeletonItem v-for="i in 4" :key="i" style="height: 20px; margin-top: 32px" />
        </template>
        <template #default>
          <table v-if="state.topRulers && state.topRulers.length > 0" class="shorter-table table">
            <thead class="table-header">
              <th>Rank</th>
              <th class="text-right">Votes (Weight)</th>
              <th class="text-right"># Proposals Voted</th>
            </thead>
            <tbody>
              <tr v-for="(item, index) in state.topRulers" :key="`rulers_${index}`">
                <td>
                  <div class="ruler">
                    <span class="rank">
                      {{ index + 1 }}
                    </span>
                    <img
                      class="avatar"
                      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAMAAAAOusbgAAAAilBMVEUAAADAxczBxc3Bxc3Bxc3Bx87Dx87Bx83Bxc3Bxc3Bxc3Bxs7Cxc7EyNLe3t7BxczAxM3AxMzBxczAxc3BxM3Bxc3BxM3Bxc3Bxs3Dx8/MzMzGxtX////Cxc7AxMz////IzNPh4+f6+vvT1tvw8fPFydH19vf8/P3P0tj3+Pne4OTp6u3t7vDX2t9vjLPmAAAAHnRSTlMA7MX64Ek2KrqkmWNUHAf17+fSy7Ksi3trQBQSBFgWr+bPAAADyUlEQVRo3sTY13LbMBAF0EWRWU31avkipNU9+f/fSzKjCSYRSS9AwDqvesBgG5YiZ1VSrrNUzrRQSuiZTLN1mVQUV7JZarTSy01CceyKbIpe06zYUWBVuVBgUIsyZNRf8gnYJvkLhbFN4Sjd0nAjCQ9yNDTIc3iaDwn4W44B8jfyVAgMIgry8SoxmHz1KCqBAIRrke1XCGS1Hx7m+OFONALSCbt5BYISL8yyGiOwMavE3hWCU++M+ypEoEZf5neMKMZf5DkRiEQkvf2rEY3u6ee9RESye4atENWqs6Dh4FIfTufz6VBfwDbqSLAA260xfzU3MIn2NEtwfVzNP64f4JHUogBXbR7U4Cla9isBpk/T4hMs4nEPy53u633n/GFUsvNrOjDz/P/onIPpajpcwTL3bOGb6XTzaWYJpsZ0ajxaagumi+lxAcuWrNS9pP0LO/UoaRxMjwNcCzsH18n0OMGxl6sJuM6mxxk8k+p+cIkwBzdgKu8HL/C9ocbi/j+SwvcWF9TOvofh2on/Omawog4QK6M/prCijkxrSr8lsCI/ElZCRBtYkZ9Fa0NES1iRFwFrSUQaVuTVx9JEFazoy55VcWqLv97yJZxBzV/o+Upag4H7CcO35swt/kcbX0YpniIliaeQNMNTzEjjKTQJOPl56midH0e4EKTAd6wbY5pj609NU7scrX6xZi0rCMNAUHyLRRAE9WLTpElaW///98RTwZCZ7aZz7WFK9jWzO4e4AQrnp4niDOqN/KldSPpj8k/WiZ9amlx+QBPQzR4WW2E5mTDRpmH2dvoWOlk5yRpIZ4GQ/RO9UcS8FrVMF8EYTMZkdKKWeRLULhY6qRj6CIYEHYsZLW39FGCN/rpzIWAs9ittncKaF0FFpY8PyLDktF9greRAxd5YAz2bV7vjC+PC5K0DlsUnARYn2JYJet9jW9qC32KC/oHnAkLTaE3rg5g2U+sRDcotYlMHFSWfF1dizH0sIY4e9C28injrGLlhPpPlS19GHMjyZXXDNaxHh9dNqwrUEoeioiqyUmxLiVuwUkRL1LoY7CCyxyHWo2P3kONyIeYFdUSnAX3b4s3ryY4hYznxSO+Lu6WSmqf1jh68Qjlxnz14ocS25cQRpHS+ls23ezs4ARgGYiCIA3mFVJD++0wBfghsLUhWD/e6WcPmGxZvXGrjE49rao941VO7BE6gNl7BMajdaQAFJzd5yIhlVZmQjKNzuViQ4ZHZINRPYPPRr5c5d8BuG2VvwvuGXKEv0NhJUnojnJXsqD+0WknLDojpzPngDyPZMe9GfORAAAAAAElFTkSuQmCC"
                      alt=""
                    />
                    <span class="hash">
                      {{ item.hash }}
                    </span>
                  </div>
                </td>
                <td class="text-right">
                  <span>{{ formatNum(item.totalShare) }}{{ ` (${toPercent(item.voteWeight * 100)}%)` }}</span>
                </td>
                <td class="text-right">
                  <shorterSkeleton animated :loading="!item.loading">
                    <template #template>
                      <shorterSkeletonItem style="height: 18px; width: 30%" />
                    </template>
                    <template #default>
                      {{ item.votedCount }}
                    </template>
                  </shorterSkeleton>
                </td>
              </tr>
            </tbody>
          </table>
          <Empty v-else content="No rulers yet" />
        </template>
      </shorterSkeleton>
    </div>
  </div>
</template>

<script setup>
import { inject, reactive, watch } from "vue";
import { Contract } from "ethers-multicall";
import NP from "number-precision";

import { getContractAddress } from "@/contract";
import * as Committee from "@/contract/committee";
import CommitteeABI from "@/abis/Committee.json";

import { getMulticallProvider } from "@/wallet/provider";
import { useWallet } from "@/hooks/useWallet";
import { getAllRulers, getRulerVoteInfoByAccount } from "@/api/governance";

import { toPercent, formatNum } from "@/utils/format";
import * as Transfer from "@/utils/transfer";

const { chain } = useWallet();

const state = reactive({
  topRulers: [],
  loading: {
    fetchRulers: false,
    listenLogs: false,
  },
});

const loading = inject("loading");
const events = inject("events");

watch(
  () => state.loading.fetchRulers,
  val => {
    loading["fetchRulers"] = val;
  },
);

watch(
  () => chain.id,
  () => {
    getTopRulers(true);
  },
);

events["getTopRulers"] = () => {
  getTopRulers(true);
};

getTopRulers(true);

async function getTopRulers(withLoading = false) {
  try {
    state.loading.fetchRulers = withLoading;

    const rulers = await getRulersList();
    state.topRulers = _.orderBy(rulers, ["totalShare"], ["desc"]).slice(0, 10);
    getTopRulersVotedProposalsCount([...state.topRulers]);

    state.loading.fetchRulers = false;
  } catch (error) {
    console.error("get top rulers", error);
  } finally {
  }
}

async function getRulersList() {
  const [accounts, totalIpistrStakedShare] = await Promise.all([
    getAllRulers() || [],
    Committee.getTotalIpistrStakedShare(),
  ]);

  if (!accounts.length) {
    return [];
  }

  const rulers = [];
  const contractAddress = getContractAddress();
  const ethcallProvider = await getMulticallProvider();

  const callList = [];
  const CommitteeContract = new Contract(contractAddress.Committee, CommitteeABI);
  accounts.map(accountHash => {
    callList.push(CommitteeContract.getUserShares(accountHash));
  });
  const userSharesList = (await ethcallProvider.all(callList)) || [];

  userSharesList.forEach((item, index) => {
    const totalShare = Transfer.receiveAmount(item.totalShare) * 1;
    const voteWeight = NP.divide(totalShare, totalIpistrStakedShare) || 0;
    const isRuler = voteWeight > 0.001;

    if (isRuler) {
      rulers.push({
        hash: accounts[index],
        voteWeight,
        totalShare,
        votedCount: "-",
      });
    }
  });

  return rulers;
}

function getTopRulersVotedProposalsCount(topRulers) {
  topRulers.map(async (ruler, index) => {
    try {
      const voteList = (await getRulerVoteInfoByAccount(ruler.hash)) || [];
      const count = voteList.length;
      state.topRulers[index].votedCount = count;
      state.topRulers[index].loading = true;
    } catch (error) {
      console.log(error);
      state.topRulers[index].votedCount = 0;
    }
  });
}
</script>

<style lang="scss" scoped>
.panel-container {
  margin-top: 16px;

  .panel {
    padding-top: 16px;
  }
}

.ruler {
  @include flex-center-v;

  .avatar {
    width: 40px;
    height: 40px;
    margin: 0 24px;
  }
}
.rank {
  width: 16px;
}
</style>
