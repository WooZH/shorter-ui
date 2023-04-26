import NP from "number-precision";
import { formatDate, formatNum, dealDecimals, addThousandsSep, getFormatUnit } from "@/utils/format";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
} from "chart.js";

Chart.register(
  LineElement,
  PointElement,
  LineController,

  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
);

export function useTotalLineChart() {
  let lineChart = null;
  let lineDataObjList = [];

  const ChartCanvasId = "myEquity";

  const chartConfig = {
    type: "line",
    data: {
      labels: [],
      datasets: [],
    },
    options: {
      animation: false,
      layout: {
        padding: {
          top: 10,
          left: 5,
          right: 10,
        },
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
      scales: {
        x: {
          ticks: {
            color: "#A4A5B2",
            borderColor: "#A4A5B2",
            font: {
              family: "Haas Grot Text",
              size: 13,
            },
            autoSkip: false,
          },
          grid: {
            display: false,
          },
        },
        y: {
          grid: {
            drawTicks: false,
          },
          ticks: {
            padding: 10,
            color: "#A4A5B2",
            borderColor: "#A4A5B2",
            borderWidth: 0,
            font: {
              family: "Haas Grot Text",
              size: 13,
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
          position: "nearest",

          external: externalTooltipHandler,
        },
      },
      onHover: function () {},
    },
  };

  function initChart(cData) {
    chartConfig.data.labels = cData.dates;

    lineDataObjList = cData.data;
    const datasets = getDataSetItemConfig(cData.data);
    chartConfig.data.datasets = datasets;

    const { yMax } = getMaxAndStepSizeByDataset(datasets);
    chartConfig.options.scales.y.max = parseFloat(yMax);

    const yTickLabelUnit = getFormatUnit(yMax);
    chartConfig.options.scales.y.ticks.callback = function (val, index) {
      if (!index) return "";

      return `$${formatLabel(val, yTickLabelUnit.unit, yTickLabelUnit.pow)}`;
    };
    chartConfig.options.scales.y.min = 0;

    chartConfig.options.scales.y.ticks.count = 5;
    chartConfig.options.scales.x.ticks.count = 6;

    chartConfig.options.scales.x.ticks.callback = function (val, index, ticks) {
      if (ticks.length === 30 && index % 4 !== 0) {
        return "";
      }

      return formatDate(this.getLabelForValue(val), "M/D");
    };
    chartConfig.options.scales.x.ticks.maxRotation = 0;

    if (lineChart) lineChart.destroy();
    const ctx = document.getElementById(ChartCanvasId);
    lineChart = new Chart(ctx, chartConfig);
  }

  function getDataSetItemConfig(item) {
    const color = "#f15430";

    const dataItem = {
      label: "test",
      data: item.map(i => i.value * 1),
      fill: "start",
      pointRadius: 0,
      pointBorderWidth: 0,
      borderColor: color,
      borderWidth: 2,
      backgroundColor: function (context) {
        const chart = context.chart;
        const { ctx, chartArea } = chart;

        if (!chartArea) {
          return;
        }
        return getGradient(ctx, chartArea);
      },
      pointBorderColor: color,
      pointHoverBackgroundColor: "#fff",
      pointHoverBorderColor: color,
      pointHoverBorderWidth: 2,
    };

    return [dataItem];
  }

  let width, height, gradient;
  function getGradient(ctx, chartArea) {
    const chartWidth = chartArea.right - chartArea.left;
    const chartHeight = chartArea.bottom - chartArea.top;
    if (!gradient || width !== chartWidth || height !== chartHeight) {
      // Create the gradient because this is either the first render
      // or the size of the chart has changed
      width = chartWidth;
      height = chartHeight;
      gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
      gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.1)");
      gradient.addColorStop(0.8, "rgba(241, 84, 48, 0.4)");
    }

    return gradient;
  }

  function getMaxAndStepSizeByDataset(datasets) {
    let yMax = 24000;
    const dataArray = (datasets[0].data || []).concat();
    if (dataArray && dataArray.length) {
      let max = 0;
      let min = 0;
      dataArray.forEach(v => {
        max = Math.max(max, v);
        min = Math.min(min, v);
      });

      yMax = max !== 0 ? (max * 1.1).toFixed(0) : yMax;
    }

    return {
      yMax,
    };
  }

  function getOrCreateTooltip(chart) {
    let tooltipEl = chart.canvas.parentNode.querySelector("div.chart-tooltip");

    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.classList.add("chart-tooltip");
      tooltipEl.style.opacity = 1;
      tooltipEl.style.pointerEvents = "none";
      tooltipEl.style.position = "absolute";
      tooltipEl.style.transform = "translate(-50%, 0)";
      tooltipEl.style.transition = "all .1s ease";
      tooltipEl.style.zIndex = 2;

      chart.canvas.parentNode.appendChild(tooltipEl);
    }

    return tooltipEl;
  }

  function externalTooltipHandler(context) {
    const { chart, tooltip } = context;

    const range = lineDataObjList.length;

    const tooltipEl = getOrCreateTooltip(chart);

    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = 0;
      return;
    }

    const axisValue = tooltip.dataPoints[0].label;
    const date = formatDate(axisValue, "MMM DD, YYYY");

    const dataIndex = tooltip.dataPoints[0].dataIndex;
    const bgPoint = document.getElementById("hover-point");
    const bgBox = document.getElementById("hover-background");
    const bgLine = document.getElementById("hover-line");

    const pointX = tooltip.caretX;
    const pointY = tooltip.caretY;
    bgPoint.style.left = `${pointX - 6}px`;
    bgPoint.style.top = `${pointY - 6}px`;
    bgBox.style.left = `${pointX - 20}px`;
    bgLine.style.left = `${pointX}px`;
    bgLine.style.height = `${270 - pointY}px`;

    if (!parseFloat(lineDataObjList[dataIndex].value)) {
      bgLine.style.height = "0px";
    }

    let triangle = "";
    let positionParams = "";
    if (dataIndex === 0) {
      triangle = "left:15px";
      positionParams = "left:31px;";
    } else if (dataIndex === lineDataObjList.length - 1) {
      triangle = "right:15px;";
      positionParams = "left: -31px;";
    } else {
      positionParams = "";
      triangle = "left: 50%;transform: translateX(-50%);";
    }

    let overParam = "";
    let overTri = "";
    if (pointY > 168 || pointY < 132) {
      if (pointY < 150) {
        overParam = `top: 10px;`;
        overTri = `top:-5px;bottom:0;transform:rotate(180deg) translateX(${
          dataIndex === lineDataObjList.length - 1 ? "0" : "5px"
        })`;
      }
    } else {
      const mid = range === 7 ? 3 : 15;
      if (dataIndex <= mid) {
        positionParams = "transform:translate(70%, 5%)";
        overTri = "";
        triangle = "bottom: 63px;left: -8px;transform:rotate(90deg)";
      } else {
        positionParams = "transform:translate(0%, 55%)";
        overTri = "";
        triangle = "bottom: 63px;right: -8px;transform:rotate(270deg)";
      }
    }

    const template = `<div
              style="
                ${overParam}
                ${positionParams}
                position:relative;
                width:102px;
                background-color:#222426;
                border-radius:8px;
                padding:12px 10px;
                box-sizing:border-box;
                font-family: Haas Grot Text;"
              >
                <div style="font-size:12px;font-family:'Haas Grot Text';color:#6e7071">
                  Deposited
                </div>
                <div style="font-size: 14px;font-family:'Haas Grot Text';color: #fff;line-height: 17px;">
                  $${set2Decimal(lineDataObjList[dataIndex].deposit)}
                </div>
                <div style="font-size:12px;font-family:'Haas Grot Text';color:#6e7071;margin-top:12px">
                  Margin+P/L
                </div>
                <div style="font-size: 14px;font-family:'Haas Grot Text';color: #fff;line-height: 17px;">
                  $${set2Decimal(lineDataObjList[dataIndex].margin)}
                </div>
                <div style="height:1px;background:#fff;opacity:0.09;margin-top:16px;margin-bottom:9px"></div>
                <div style="font-size: 12px;font-family:'Haas Grot Text';color: #6e7071;line-height: 14px;margin-top: 6px;">
                  ${date}
                </div>
                <div
                  style="
                    width:0;
                    height:0;
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-top: 6px solid #222426;
                    position:absolute;
                    bottom: -5px;font-family:'Haas Grot Text';
                    ${triangle}
                    ${overTri}"
                >
                </div>
              </div>`;

    tooltipEl.innerHTML = template;
    tooltipEl.style.opacity = 1;

    tooltipEl.style.left = pointX + "px";
    const y = pointY > 180 ? pointY - 150 : pointY;
    tooltipEl.style.top = y + "px";
  }

  const resizeHandle = () => {
    if (lineChart) {
      lineChart.canvas.parentNode.style.width = "100%";
      lineChart.resize();
    }
  };

  function set2Decimal(val) {
    return formatNum(Math.floor(val * 100) / 100, true);
  }

  function formatLabel(num, unit, pow) {
    let result = NP.divide(num, pow);
    result = addThousandsSep(dealDecimals(result, 2));
    return result + unit;
  }

  return {
    initChart,
    resizeHandle,
  };
}
