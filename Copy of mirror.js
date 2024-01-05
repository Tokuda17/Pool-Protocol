//Imports

require("dotenv").config();
//const ch = require("./chain.js");
//ch.setChain("eth");
const web = require("./web3.js");
//console.log("web.chain=",web.chain);
//console.log("web.chain=",web.chain);
//console.log("web.chain=",web.chain);
var BigNumber = require("big-number");
const mirrorABI = require("./ABI/Mirror.json");
const maps = require("./maps.js");
const erc20 = require("./erc20.js");
const erc20ABI = require("./ABI/erc20.json");
const wall = require("./wallet.js");
const nodemailer = require("./nodemailer.js");
const inch = require("./1inch.js");

const mirAddress = "0x09a3EcAFa817268f77BE1283176B946C4ff2E608";
const ustAddress = "0xa47c8bf37f92aBed4A126BDA807A7b7498661acD";


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

let mirs = [
  {
    symbol: "mAMZN",
    token: mamzn,
    stake: "0x1fABef2C2DAB77f01053E9600F70bE1F3F657F51",
    pool: mamznPool
  },
  {
    symbol: "mUSO",
    token: muso,
    stake: "0x2221518288af8c5d5a87fd32717fab154240d942",
    pool: musoPool
  },
  {
    symbol: "mMSFT",
    token: mmsft,
    stake: "0x27a14c03c364d3265e0788f536ad8d7afb0695f7",
    pool: mmsftPool
  },
  {
    symbol: "mNFLX",
    token: "0xC8d674114bac90148d11D3C1d33C61835a0F9DCD",
    stake: "0x29cf719d134c1c18dab61c2f4c0529c4895ecf44",
    pool: "0xC99A74145682C4b4A6e9fa55d559eb49A6884F75"
  },
  {
    symbol: "mTSLA",
    token: mtsla,
    stake: "0x43dfb87a26ba812b0988ebdf44e3e341144722ab",
    pool: "0x5233349957586A8207c52693A959483F9aeAA50C"
  },
  {
    symbol: "mGOOGL",
    token: "0x59A921Db27Dd6d4d974745B7FfC5c33932653442",
    stake: "0x5b64bb4f69c8c03250ac560aac4c7401d78a1c32",
    pool: "0x4b70ccD1Cf9905BE1FaEd025EADbD3Ab124efe9a"
  },
  {
    symbol: "mAAPL",
    token: maapl,
    stake: "0x735659c8576d88a2eb5c810415ea51cb06931696",
    pool: maaplPool
  },
  {
    symbol: "mBABA",
    token: mbaba,
    stake: "0x769325e8498bf2c2c3cfd6464a60fa213f26afcc",
    pool: mbabaPool
  },
  {
    symbol: "mTWTR",
    token: mtwtr,
    stake: "0x99d737ab0df10cdc99c6f64d0384acd5c03aef7f",
    pool: mtwtrPool
  },
  {
    symbol: "mQQQ",
    token: mqqq,
    stake: "0xc1d2ca26a59e201814bf6af633c3b3478180e91f",
    pool: mqqqPool
  },
  {
    symbol: "mSLV",
    token: mslv,
    stake: "0xdb278fb5f7d4a7c3b83f80d18198d872bbf7b923",
    pool: mslvPool
  }
];

var web3 = web.web3;

stakeAddresses = [
 "0x1fabef2c2dab77f01053e9600f70be1f3f657f51",
 "0x2221518288af8c5d5a87fd32717fab154240d942",
 "0x27a14c03c364d3265e0788f536ad8d7afb0695f7", 
 "0x29cf719d134c1c18dab61c2f4c0529c4895ecf44",
 "0x43dfb87a26ba812b0988ebdf44e3e341144722ab",
 "0x5b64BB4f69c8C03250Ac560AaC4C7401d78A1c32",
 "0x735659c8576d88a2eb5c810415ea51cb06931696",
 "0x769325e8498bf2c2c3cfd6464a60fa213f26afcc",
 "0x99d737ab0df10cdc99c6f64d0384acd5c03aef7f",
 "0xc1d2ca26a59e201814bf6af633c3b3478180e91f",
 "0xdb278fb5f7d4a7c3b83f80d18198d872bbf7b923"
];

//*********************************************************************
// 
//*********************************************************************

async function getContract(address) {
  //console.log("inside getcontract", address);
  const mirrorContract = new web3.obj.eth.Contract(mirrorABI, address);
  //console.log("contract=", mirrorContract);
  return mirrorContract;
}

async function balanceOf (contract, walletAddress)
{
  //console.log("checking balance for wallet=",walletAddress, contract);
  const tx = await contract.methods
    .balanceOf(walletAddress)
    .call({ from: walletAddress })
    .catch(function (e) {
      console.log(e.message);
      throw new Error(e.message+" => balanceOf failed");
    });
  //console.log("balanceOf=",tx);
  return tx;
}

async function withdraw (contract, amount, walletAddress)
{
  console.log("withdrawing",walletAddress);
  const nonce = await  web3.obj.eth.getTransactionCount(walletAddress);
  const tx = await contract.methods
    .withdraw(amount)
    .send({ from: walletAddress, gas: 1000000,  nonce: nonce })
    .catch(function (e) {
      console.log(e.message);
      throw new Error(e.message+" => withdraw failed");
    });
  return tx;
}

async function claim (contract, walletAddress)
{
  console.log("claiming",walletAddress);
  const nonce = await  web3.obj.eth.getTransactionCount(walletAddress);
  const tx = await contract.methods
    .getReward()
    .send({ from: walletAddress, gas: 1000000,  nonce: nonce })
    .catch(function (e) {
      console.log(e.message);
      throw new Error(e.message+" => claim failed");
    });
  return tx;
}

async function getMIR(walletAddress)
{
  const c = await new web3.obj.eth.Contract(erc20ABI, mirAddress);

  let bal = await c.methods.balanceOf(walletAddress)
    .call()
    .catch(function (e) {
      console.log(e.message);
      throw new Error(e.message+" => balanceOf failed");
    });
//console.log("balanceOf", bal);
//  bal= parseInt(BigNumber(bal).div(BigNumber(10).pow(18)).toString());
//console.log("balanceOf", bal);
  return bal;
}

async function check(stakeAddress,walletAddress)
{
  console.log("checking address", stakeAddress);
  const c = await getContract(stakeAddress);
  //console.log("got contract",c);
  e = await earned(c,walletAddress);
  //console.log("got earned");
  console.log("stakeAddress=",stakeAddress, e);
  if (e > 0)
  {
    console.log("rewards=", e);
    await claim(c,walletAddress);
  }
  let b = balanceOf(c,walletAddress);
  //console.log("earned",stakeAddress,e);
}

async function checkAll(walletAddress)
{
  console.log("checkAll");
  for (let i=0;i<stakeAddresses.length;i++)
  {
    await check(stakeAddresses[i],walletAddress);
  }
}

async function earned(c, walletAddress) {
  //console.log("inside earned", walletAddress);
  var e = await c.methods
    .earned(walletAddress)
    .call()
    .catch(function (e) {
      console.log(e.message);
      throw new Error(e.message+" => earned failed");
    });
 // console.log(tx);
  e = BigNumber(e).mult(100).div(BigNumber(10).pow(18))/100;
  return e;
}


async function main(retries=0)
{
  const maxretries = 3;
  kucoinMirAddress="0xac721C0B1023F6A7583FcD60FDE45C97814AfF0e";
  try {
    nodemailer.init("lance");
    nodemailer.setSubjectStartOption("ATTENTION: ");
    var wname = "lance";
//console.log("init wallet", wname);
    let wallet = await wall.init(wname,"eth");
//console.log("checking all", wallet.address);
    await checkAll(wallet.address);
console.log("getting MIR");
    const mir = await getMIR(wallet.address);
    console.log("MIR=", mir);

    const c = await new web3.obj.eth.Contract(erc20ABI, mirAddress);
    const d = await erc20.decimals(c);
    if (mir > 10000)
    {
//     const amt = BigNumber(Math.floor(mir)).mult(BigNumber(10).pow(d)).toString();
//      console.log("transferring",amt,"to KuCoin");
//      await erc20.transfer(c,wallet.address, kucoinMirAddress,amt);
      //console.log("sending email");
    }
    const amount = BigNumber(10000).mult(BigNumber(10).pow(18)).toString();
    if (true)
    {
      await inch.swap(mirAddress,"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",mir,wallet.address);
      //await inch.swap(mirAddress,ustAddress,amount,wallet.address);
      await nodemailer.sendMail("Swapping 5000 MIR","current MIR "+mir);
    }
  } catch (e) {
    console.log(e.message);
    if (shouldRetry(e.message) && retries < maxretries)
    {
      main(retries+1);
    }
  }
}

function shouldRetry(msg)
{
  if (msg.search("Request failed with status code 400")>=0)
    return 1;
  else if (msg.search("Request failed with status code 500")>=0)
    return 1;
  else if (msg.search("nonce too low")>=0)
    return 1;
  else if (msg.search("we can't execute this request")>=0)
    return 1;
  else if (msg.search("Invalid JSON RPC response")>=0)
    return 1;
  else if (msg.search("swap() failed")>=0)
    return 1;
  else return 0;
}

const waddr = "0x0fFeb87106910EEfc69c1902F411B431fFc424FF";
async function withdrawAll()
{
  let wallet = await wall.init("lance","eth");
//console.log("checking all", wallet.address);
  for (let i=0;i<mirs.length;i++)
  {
    let c = await getContract(mirs[i].stake);
    let bal = await balanceOf(c,waddr);
    console.log("withdrawing",mirs[i].symbol);
    await withdraw(c,bal,waddr);
  }
}

main()
