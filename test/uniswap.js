
const uniABI = require("./ABI/UniswapV2.json");
let uniPoolABI = require('@uniswap/v2-core/build/UniswapV2Pair.json');
uniPoolABI = uniPoolABI.abi;
const uni = require("@uniswap/v2-sdk");
var BigNumber = require('big-number');
const wall = require("./wallet.js");
const maps = require("./maps.js");
const web3 = require("./web3.js");
const erc = require("./erc20.js");

const amount = "6495617159712476288705";

const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const mslv = "0x9d1555d8cB3C846Bb4f7D5B1B1080872c3166676";
const mmsft = "0x41BbEDd7286dAab5910a1f15d12CBda839852BD7";
const maapl = "0xd36932143F6eBDEDD872D5Fb0651f4B72Fd15a84";
const muso = "0x31c63146a635EB7465e5853020b39713AC356991";
const mqqq = "0x13B02c8dE71680e71F0820c996E4bE43c2F57d15";
const mbaba = "0x56aA298a19C93c6801FDde870fA63EF75Cc0aF72";
const mamzn = "0x0cae9e4d663793c2a2A0b211c1Cf4bBca2B9cAa7";
const mtsla = "0x21cA39943E91d704678F5D00b6616650F066fD63";
const mtwtr = "0xEdb0414627E6f1e3F082DE65cD4F9C693D78CCA9";
const mmsftPool = "0xeafad3065de347b910bb88f09a5abe580a09d655";
const maaplPool = "0xB022e08aDc8bA2dE6bA4fECb59C6D502f66e953B";
const mslvPool = "0x860425bE6ad1345DC7a3e287faCBF32B18bc4fAe";
const musoPool = "0x6Bd8Ca9D141aa95842b41e1431A244C309c9008C";
const mqqqPool = "0x9E3B47B861B451879d43BBA404c35bdFb99F0a6c";
const mbabaPool = "0x676Ce85f66aDB8D7b8323AeEfe17087A3b8CB363";
const mamznPool = "0x0Ae8cB1f57e3b1b7f4f5048743710084AA69E796";
const mtslaPool = "0x5233349957586A8207c52693A959483F9aeAA50C";
const mtwtrPool = "0x34856be886A2dBa5F7c38c4df7FD86869aB08040";
const ust = "0xa47c8bf37f92aBed4A126BDA807A7b7498661acD";
const toAddress = "0x0fFeb87106910EEfc69c1902F411B431fFc424FF";
const mslvLiqAddress = "0x860425bE6ad1345DC7a3e287faCBF32B18bc4fAe";

let poolMap = new Map();

function init()
{
  poolMap.set(mmsft,mmsftPool);
  poolMap.set(maapl,maaplPool);
  poolMap.set(mslv,mslvPool);
  poolMap.set(muso,musoPool);
  poolMap.set(mqqq,mqqqPool);
  poolMap.set(mbaba,mbabaPool);
  poolMap.set(mamzn,mamznPool);
  poolMap.set(mtsla,mtslaPool);
  poolMap.set(mtwtr,mtwtrPool);
}

/*
[{"internalType":"uint256","name":"amountIn","type":"uint256"},
 {"internalType":"uint256","name":"amountOutMin","type":"uint256"},
 {"internalType":"address[]","name":"path","type":"address[]"},
 {"internalType":"address","name":"to","type":"address"},
 {"internalType":"uint256","name":"deadline","type":"uint256"}],
*/
async function swap(from,to,amount)
{
  try {
    const lc = await erc.getContract(from);
    await erc.approve(lc, toAddress, routerAddress,BigNumber(amount).mult(BigNumber(10).pow(18)).toString());
    const decimals = await erc.decimals(lc);
    amount = BigNumber(amount).mult(BigNumber(10).pow(decimals)).toString();
    const contract = await new web3.web3.obj.eth.Contract(uniABI,routerAddress);
    const blockNumber = await web3.web3.obj.eth.getBlockNumber();
    const block = await web3.web3.obj.eth.getBlock(blockNumber);
    const deadline = BigNumber(block.timestamp).add(60).toString();
    console.log("Calling swapExact");
    await contract.methods.swapExactTokensForTokens(amount,1,[from,to], toAddress, deadline)
      .send({ from: toAddress, gas: "5000000" });
    console.log("swap complete");
  } catch (e) {
    console.log(e.message+" => swap failed"); 
    throw new Error(e.message+" => swap failed");
  }
}

async function removeLiquidity()
{
  try {
    const lc = await erc.getContract(mslvLiqAddress);
console.log("Approving");
    await erc.approve(lc, toAddress, routerAddress, 
  BigNumber(1000000).mult(BigNumber(10).pow(18)).toString());
console.log("Getting contract");
    const contract = await new web3.web3.obj.eth.Contract(uniABI,routerAddress);
    //console.log("contract",contract);
    //    let time = Math.floor(Date.now()/1000 + 100);
    //console.log("Deadline", time);
    const blockNumber = await web3.web3.obj.eth.getBlockNumber();
    const block = await web3.web3.obj.eth.getBlock(blockNumber);
    const deadline = BigNumber(block.timestamp).add(60).toString();
    await contract.methods.removeLiquidity(
        mslv,
        ust,
        amount,
        1,
        1,
        toAddress,
        deadline)
      .send({ from: toAddress, gasPrice: "100000000000", gas: "400000",
            nonce: await web3.web3.obj.eth.getTransactionCount(toAddress)})
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => removeLiquidity failed");
      });

  } catch (e) {
    console.log(e.message+" => removeLiquidity failed"); 
    throw new Error(e.message+" => removeLiquidity failed");
  }
}

//    const lc = await erc.getContract(mslvLiqAddress);

async function addLiquidity(walletAddress, poolAddress,t0,t1,a0,a1)
{
  try {
     console.log("addLiquidity", walletAddress, poolAddress, t0, t1, a0, a1);
    const c0 = await erc.getContract(t0);
    const c1 = await erc.getContract(t1);
console.log("Approving");
    await erc.approve(c0, walletAddress, routerAddress,BigNumber(10000000).mult(BigNumber(10).pow(18)).toString());
    await erc.approve(c1, walletAddress, routerAddress,BigNumber(10000000).mult(BigNumber(10).pow(18)).toString());
console.log("Getting contract");
    const contract = await new web3.web3.obj.eth.Contract(uniABI,routerAddress);
    //console.log("contract",contract);
    //    let time = Math.floor(Date.now()/1000 + 100);
    //console.log("Deadline", time);
    const blockNumber = await web3.web3.obj.eth.getBlockNumber();
    const block = await web3.web3.obj.eth.getBlock(blockNumber);
    const deadline = BigNumber(block.timestamp).add(60).toString();
    await contract.methods.addLiquidity(
        t0,
        t1,
        a0,
        a1,
        0,
        0,
        walletAddress,
        deadline)
      .send({ from: toAddress, gasPrice: "100000000000", gas: "400000",
            nonce: await web3.web3.obj.eth.getTransactionCount(walletAddress)})
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => addLiquidity failed");
      });

  } catch (e) {
    console.log(e.message+" => addLiquidity failed"); 
    throw new Error(e.message+" => addLiquidity failed");
  }
}

//*********************************************************************
// Uniswap Pool Methods
//*********************************************************************
async function getPoolContract(addr) {
  try {
//console.log("uniPoolABI=",uniPoolABI);
//console.log("addr=",addr);
    const contract = await new web3.web3.obj.eth.Contract(uniPoolABI, addr);
    return contract;
  } catch (e) {
    console.log(e.message+" getContract failed");
    throw Error(e.message+" => getContract failed");
  }
}

async function getReserves(c)
{
  try {
    //console.log("allowance contract", c);
    const reserves = await c.methods
      .getReserves()
      .call()
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => getReserves failed");
      });
    console.log("reserves",reserves);
    return reserves;
  } catch (e) {
    console.log(e.message);
     throw new Error(e.message+" => getReserves failed");
  }
}


async function token0(c)
{
  try {
    const t = await c.methods
      .token0()
      .call()
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => token0 failed");
      });
    console.log("token0",t);
    return t;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => token0 failed");
  }
}

async function token1(c)
{
  try {
    const t = await c.methods
      .token1()
      .call()
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => token1 failed");
      });
    console.log("token1",t);
    return t;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => token1 failed");
  }
}


async function addMirLiquidity(wallet,poolAddress)
{
  try {
    let c = await getPoolContract(poolAddress);
    const result = await getReserves(c);
    const p0 = result._reserve0;
    const p1 = result._reserve1;
    console.log("results", p0,p1);
    const t0 = await token0(c);
    const t1 = await token1(c);
    const c0 = await erc.getContract(t0);
    const c1 = await erc.getContract(t1);
    const symbol0 = await erc.symbol(c0);
    const symbol1 = await erc.symbol(c1);
    const decimals0 = await erc.symbol(c0);
    const decimals1 = await erc.symbol(c1);
    const b0 = await erc.balanceOf(c0,wallet.address);
    const b1 = await erc.balanceOf(c1,wallet.address);
    console.log("symbols", symbol0, symbol1);
    console.log("balances", b0, b1);
    let a0;
    let a1;
    if (BigNumber(b0).mult(p1).div(p0).gt(b1))
    {
      // pair b1 with calculated amount for b0
      a0 = BigNumber(b1).mult(p0).div(p1).toString();
      a1 = b1;
    }
    else  
    {
      a0 = b0;
      a1 = BigNumber(b0).mult(p1).div(p0).toString();
    }
    await addLiquidity(wallet.address, poolAddress,t0,t1,a0,a1);
  } catch (e) {
    console.log(e.message+" => main failed"); 
  }
}


async function main()
{
  init();
  let wallet = await wall.initWallet("lance","eth");
  let token = mtwtr;
  await swap(ust,token,8000);
  await addMirLiquidity(wallet,poolMap.get(token));
}
main();
