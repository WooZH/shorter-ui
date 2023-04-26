const ethers = require("ethers");

// const provider = new ethers.providers.JsonRpcProvider("https://binance.ankr.com");
const provider = new ethers.providers.JsonRpcProvider("https://bsc-rpc.shorter.finance");

async function getGasPrice() {
  const price = await provider.getGasPrice();
  console.log(price);
}

getGasPrice();
