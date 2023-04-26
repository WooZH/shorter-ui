import NP from 'number-precision';
import { toAmount, formatDate, formatNum, dealDecimals, addThousandsSep, getFormatUnit } from "@/utils/format";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
  Filler,
} from "chart.js";

Chart.register(LineElement, PointElement, LineController, CategoryScale, LinearScale, Legend, Tooltip, Filler);

export function useStatsLineChart() {
  let lineChart = null;

  const ChartCanvasID = "LineChart";
  const colorTemp = ["#ea7642", "#ed9268", "#f6ceb7", "#eb6931", "#ba4a13"];

  const chartConfig = {
    type: "line",
    data: {
      labels: [],
      datasets: [],
    },
    options: {
      layout: {
        padding: {
          top: 10,
          left: 50,
          right: 50,
        },
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
      scales: {
        x: {
          ticks: {
            callback: function (val) {
              return formatDate(this.getLabelForValue(val), "M/D");
            },
            color: "#A4A5B2",
            borderColor: "#A4A5B2",
            font: {
              family: "Haas Grot Text",
              size: 13,
            },
          },
          grid: {
            display: false,
          },
        },
        y: {
          stacked: true,
          grid: {
            drawTicks: false,
          },
          ticks: {
            callback: function (val, index) {
              if (!index) return "";

              return `$${formatNum(val, 0, true)}`;
            },
            padding: 10,
            color: "#A4A5B2",
            borderColor: "#A4A5B2",
            font: {
              family: "Haas Grot Text",
              size: 13,
            },
          },
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 8,
            boxHeight: 8,
            pointStyle: "circle",
            usePointStyle: true,
          },
        },
        tooltip: {
          enabled: false,
          position: "nearest",

          external: externalTooltipHandler,
        },
      },
    },
  };

  function initChart(poolData) {
    chartConfig.data.labels = poolData.dates;

    const datasets = poolData.data.map(getDataSetItemConfig);
    chartConfig.data.datasets = datasets;

    const { yMax, stepSize } = getMaxAndStepSizeByDataset(datasets);
    chartConfig.options.scales.y.max = parseFloat(yMax);

    const yTickLabelUnit = getFormatUnit(yMax);
    chartConfig.options.scales.y.ticks.callback = function (val, index) {
      if (!index) return "";

      return `$${formatLabel(val, yTickLabelUnit.unit, yTickLabelUnit.pow)}`;
    };
    chartConfig.options.scales.y.min = 0;
    chartConfig.options.scales.y.ticks.stepSize = stepSize;

    const ctx = document.getElementById(ChartCanvasID);
    if (lineChart) lineChart.destroy();
    lineChart = new Chart(ctx, chartConfig);
  }

  function getDataSetItemConfig(item, index) {
    const dataItem = {
      label: item.name,
      data: item.data,
      fill: "start",
      pointRadius: 0,
      pointBorderWidth: 0,
      borderWidth: 0,
      backgroundColor: colorTemp[index],
      pointBorderColor: colorTemp[index],
      pointHoverBackgroundColor: "#fff",
      pointHoverBorderColor: colorTemp[index],
      pointHoverBorderWidth: 2,
    };

    return dataItem;
  }

  function getMaxAndStepSizeByDataset(datasets) {
    const maxArray = datasets.reduce((initArr, dataArrItem) => {
      const newDataItemSum = dataArrItem.data.map((item, index) => {
        return (initArr[index] || 0) + parseFloat(item);
      });
      return newDataItemSum;
    }, []);

    const yMax = (Math.max.apply(null, maxArray) * 1.1).toFixed(0);
    const maxDivide = (yMax / 3).toFixed(0);
    const stepSize = maxDivide * 1 + (3 - (maxDivide % 3));

    return {
      yMax,
      stepSize,
    };
  }

  function getOrCreateTooltip(chart) {
    let tooltipEl = chart.canvas.parentNode.querySelector("div.chart-tooltip");

    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.classList.add("chart-tooltip");
      tooltipEl.style.borderRadius = "3px";
      (tooltipEl.style.borderColor = "#333333"), (tooltipEl.style.opacity = 1);
      tooltipEl.style.pointerEvents = "none";
      tooltipEl.style.position = "absolute";
      tooltipEl.style.transform = "translate(-50%, 0)";
      tooltipEl.style.transition = "all .1s ease";

      chart.canvas.parentNode.appendChild(tooltipEl);
    }

    return tooltipEl;
  }

  function externalTooltipHandler(context) {
    const { chart, tooltip } = context;
    const tooltipEl = getOrCreateTooltip(chart);

    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = 0;
      return;
    }

    const pointX = tooltip.caretX;
    const pointY = tooltip.caretY;
    const bgLine = document.getElementById("hover-line");
    bgLine.style.left = `${pointX}px`;

    let template = "";
    const bodyLines = tooltip.body.map(b => b.lines);
    bodyLines.forEach((item, index) => {
      const line = item[0];
      const label = line.split(":")[0];
      const value = tooltip.dataPoints[index].raw;
      const itemBgColor = tooltip.labelColors[index].backgroundColor;

      const itemTemplate = `
            <div style="min-width: 170px; margin-bottom:14px; font-size: 14px;font-weight: 600;color: #717273">
              <div style="background: ${itemBgColor}; display:inline-block;border-radius:50%;width:8px;height:8px;margin: 0 8px 1px 0" ></div>
              <span style="font-family: Haas Grot Text;">${label}</span>
              <span style="float: right;font-family: Haas Grot Text;">$${transAmount(value)}</span>
            </div>
          `;
      template += itemTemplate;
    });

    const date = formatDate(tooltip.title[0], "MMM D, YYYY");
    template += `<div style="font-family: Haas Grot Text;color:#717273;font-size:12px;line-height:14px">${date}</div>`;

    template = `
          <div
              style="
                position:relative;
                background-color: rgba(34, 36, 38, 1);
                border-radius: 3px;
                color: #fff;
                border-radius:3px;
                padding:12px 10px;
                box-sizing:border-box;
                font-family: Haas Grot Text;"
        >
          ${template}
        </div>
    `;

    tooltipEl.innerHTML = template;

    tooltipEl.style.opacity = 1;

    tooltipEl.style.left = pointX + "px";
    tooltipEl.style.top = pointY + 10 + "px";
  }

  const resizeHandle = () => {
    if (lineChart) {
      lineChart.canvas.parentNode.style.width = "100%";
      lineChart.resize();
    }
  };

  function transAmount(amount) {
    if (amount * 1 === 0) return 0;
    return toAmount(amount, false).replace(" ", "");
  }

  function formatLabel(num, unit, pow) {
    let result = NP.divide(num, pow);
    result = dealDecimals(result, 2);
    result = addThousandsSep(result);
    return result + unit;
  }

  return {
    initChart,
    resizeHandle,
    transAmount,
  };
}
