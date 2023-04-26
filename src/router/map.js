import { usePool } from "@/hooks/usePool";

const { curTab } = usePool();
export default [
  {
    path: "/",
    redirect: "/dashboard",
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: () => import(/* webpackChunkName: "dashboard" */ "@/views/Dashboard"),
  },
  {
    path: "/dashboard/positions",
    name: "Positions",
    meta: {
      root: "Dashboard",
      title: "My Positions",
    },
    component: () => import(/* webpackChunkName: "positions" */ "@/views/Positions"),
  },
  {
    path: "/farming",
    name: "Farming",
    component: () => import(/* webpackChunkName: "farming" */ "@/views/Farming"),
  },
  {
    path: "/pools",
    name: "Pools",
    component: () => import(/* webpackChunkName: "pools" */ "@/views/Pools"),
    redirect: () => {
      if (curTab.name) {
        return { name: curTab.name };
      } else {
        return "/pools/provider";
      }
    },
    children: [
      {
        path: "provider",
        name: "Provider",
        meta: {
          title: "Pools(Provider)",
        },
        component: () => import(/* webpackChunkName: "pools-provider" */ "@/views/Pools/Provider.vue"),
      },
      {
        path: "trader",
        name: "Trader",
        meta: {
          title: "Pools(Trader)",
        },
        component: () => import(/* webpackChunkName: "pools-trader" */ "@/views/Pools/Trader.vue"),
      },
    ],
  },
  {
    path: "/pools/:id(\\d+)",
    name: "PoolDetail",
    component: () => import(/* webpackChunkName: "pools" */ "@/views/PoolDetail"),
    meta: {
      root: "Pools",
      customTitle: true,
    },
  },
  {
    path: "/governance",
    name: "Governance",
    meta: {
      keepAlive: false,
    },
    component: () => import(/* webpackChunkName: "governance" */ "@/views/Governance"),
  },
  {
    path: "/governance/proposals",
    name: "Proposals",
    meta: {
      root: "Governance",
      keepAlive: false,
    },
    component: () => import(/* webpackChunkName: "proposals" */ "@/views/Governance/Proposals.vue"),
  },
  {
    path: "/governance/proposals/:id",
    name: "ProposalDetail",
    meta: {
      root: "Governance",
    },
    component: () => import(/* webpackChunkName: "proposal" */ "@/views/Governance/ProposalDetail.vue"),
  },
  {
    path: "/liquidations",
    name: "Liquidations",
    meta: {
      keepAlive: false,
    },
    component: () => import(/* webpackChunkName: "liquidations" */ "@/views/Liquidations"),
  },
  {
    path: "/liquidations/:id",
    name: "LiquidationDetail",
    component: () => import(/* webpackChunkName: "liquidation-detail" */ "@/views/LiquidationDetail"),
    meta: {
      root: "Liquidations",
    },
  },
  {
    path: "/podium",
    name: "Podium",
    component: () => import(/* webpackChunkName: "podium" */ "@/views/Podium"),
  },
  {
    path: "/testnet",
    name: "Testnet Playground",
    component: () => import(/* webpackChunkName: "betaProgram" */ "@/views/BetaProgram"),
  },
  {
    name: "404",
    path: "/404",
    meta: {
      title: "404",
    },
    component: () => import(/* webpackChunkName: "error" */ "@/views/Error/404"),
  },
  {
    name: "500",
    path: "/500",
    meta: {
      title: "500",
    },
    component: () => import(/* webpackChunkName: "error" */ "@/views/Error/500"),
  },
];
