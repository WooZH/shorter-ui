import dayjs from "@/plugins/dayjs";

import { getTokenSymbol } from "@/contract/shortBone";

import { getLastBlockOfProposals } from "@/api/governance";

import { blockToTime, formatDate } from "../utils/format";
import * as Transfer from "@/utils/transfer";

import { useTimezone } from "./useTimezone";

export function useProposal() {
  async function getLastTimeMap(proposals = []) {
    if (proposals.length === 0) return;

    try {
      const historyLogs = await getLastBlockOfProposals();
      const map = {};
      await Promise.all(
        historyLogs.map(async item => {
          const proposalId = Transfer.transBigNumber(item.proposalId) * 1;
          const time = await blockToTime(item.blockNumber, "MMM DD, YYYY HH:mm");
          const blockNumber = item.blockNumber;
          if (!map[proposalId] || (map[proposalId] && map[proposalId].blockNumber < blockNumber)) {
            map[proposalId] = time;
          }
        }),
      );

      return map;
    } catch (error) {
      console.error("fetchAllHistoryLog", error);
      return Promise.reject(error);
    }
  }

  async function getTokenNameMap(proposals = []) {
    const map = {};
    let resList = [];
    proposals.forEach(({ tokenContract }) => {
      const tokenInfo = getTokenSymbol(tokenContract);
      resList.push(tokenInfo);
    });
    proposals.forEach(({ id }, index) => {
      map[id] = resList[index];
    });
    return map;
  }

  function getProposalStatusText(status) {
    const index = status * 1;
    const maps = ["Active", "Passed", "Failed", "Queued", "Executed"];
    return maps[index] || "";
  }

  function getTitleStatus(status) {
    const index = status * 1;
    const maps = ["Active", "Passed", "Failed", "Passed", "Passed"];
    return maps[index] || "";
  }

  /**
   * @description: type of proposal
   * @param {*} type
   * @return {*}
   */
  function getProposalTag(type) {
    const maps = ["Community", "Pool"];
    if (type) {
      const index = type * 1;
      return maps[index];
    }
    return "Pool";
  }

  /**
   * @description: out put a proposal title
   * @param {*} tokenName
   * @param {*} maxLeverage
   * @param {*} durationDays
   * @return {*}
   */
  function generateTitle(tokenName, maxLeverage, durationDays) {
    let leftTime = ``;
    if (durationDays == 0) {
      leftTime = `Perputual`;
    } else {
      leftTime = `ends in ${durationDays} ${durationDays > 1 ? "days" : "day"}`;
    }
    const title = `New token loaning pool with ${tokenName || "---"}, leverage ${maxLeverage}×, ${leftTime}`;
    return title;
  }

  function generateSubtitle(status, latestTime) {
    const { tz } = useTimezone();
    if (!latestTime || latestTime === "-") return "";
    const countdown = getCountdown(latestTime);
    let leftTime = "";
    if (status == 0) {
      status = "Created";
      if (countdown) {
        leftTime = `<svg style="transform: translateY(2.4px); margin-left: 30px; margin-right: 4px;" width="16px" height="16px" viewBox="0 0 16 16" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g id="page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g id="Governance-s" transform="translate(-628.000000, -187.000000)">
                <g id="group" transform="translate(628.000000, 187.000000)">
                    <rect id="s" fill-opacity="0.01" fill="#FFFFFF" fill-rule="nonzero" x="0" y="0" width="16" height="16"></rect>
                    <path d="M8,14.6666667 C11.1296,14.6666667 13.6666667,12.1296 13.6666667,9 C13.6666667,5.8704 11.1296,3.33333333 8,3.33333333 C4.8704,3.33333333 2.33333333,5.8704 2.33333333,9 C2.33333333,12.1296 4.8704,14.6666667 8,14.6666667 Z" id="path" stroke="#909399" stroke-width="1.5" stroke-linejoin="round"></path>
                    <line x1="10.3333333" y1="1.33333333" x2="5.66666667" y2="1.33333333" id="path" stroke="#909399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></line>
                    <line x1="12.6666667" y1="3.33333333" x2="11.6666667" y2="4.33333333" id="path" stroke="#909399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></line>
                    <line x1="8" y1="6" x2="8" y2="9" id="path" stroke="#909399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></line>
                </g>
            </g>
        </g>
    </svg>${countdown} left`;
      }
    } else {
      status = getProposalStatusText(status);
    }
    let subTitle = `${status} on ${formatDate(latestTime)} (${tz.text}) ${leftTime}`;
    return subTitle;
  }

  function getCountdown(start) {
    let result = ``;
    const end = new Date(start).getTime() + 48 * 60 * 60 * 1000;
    const interval = end - new Date().getTime();
    if (interval < 0) return result;
    const duration = dayjs.duration(interval);
    const days = duration.days();
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();
    if (days > 0) {
      result += getPlural(days, "day");
      if (hours > 0) result += ", " + getPlural(hours, "hour");
    } else if (hours > 1) {
      result += getPlural(hours, "hour");
      if (minutes > 0) result += ", " + getPlural(minutes, "minute");
    } else if (minutes > 1) {
      result += getPlural(minutes, "minute");
      if (seconds > 0) result += ", " + getPlural(seconds, "second");
    } else {
      result += getPlural(seconds, "second");
    }

    function getPlural(num, unit) {
      if (num > 1) {
        unit += "s";
      }
      return `${num} ${unit}`;
    }
    return result;
  }

  return {
    getLastTimeMap,
    getTokenNameMap,
    getTitleStatus,
    getProposalStatusText,
    getProposalTag,
    generateTitle,
    generateSubtitle,
  };
}
