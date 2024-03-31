const axios = require("axios");
const utils = require("./utils.js");
const unic = require("./unicache.js");
require("dotenv").config();
var BigNumber = require("big-number");
const chain = require("./chain.js");
const wall = require("./wallet.js");
const aave = require("./aave.js");
const web = require("./web3.js");
const gas = require("./gasPoly.js");
const erc20 = require("./erc20.js");
const maps = require("./maps.js");
const quote = require("./quote.js");
const web3 = web.web3;

async function initMaps(chin=false)
{
  let tokenAddresses;
  let ch = web3.chain;
  if (chin)
    ch = chin;
  if (ch == 'avax')
  {
    tokenAddresses = [
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // avax
      "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // wavax
      "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // usdc
      "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", // usdc.e
      "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", // usdt
      "0xc7198437980c041c805A1EDcbA50c1Ce5db95118", // usdt.e
      "0x60781C2586D68229fde47564546784ab3fACA982"  // png
    ];
  }
  else if (ch == 'op')
  {
    tokenAddresses = [
      "0x4200000000000000000000000000000000000006", // weth
      "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // usdc
    ];
  }
  else if (ch == 'arb')
  {
    tokenAddresses = [
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // eth
      "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // weth
      "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // usdc
    ];
  }
  else if (ch == 'poly')
  {
    tokenAddresses = [
      "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // weth
      "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // usdc
    ];
  }
console.log("b");
  await erc20.initMaps(tokenAddresses);
  //console.log("addressMaps in inch.js",maps.addressMap);
}

let MAX_RETRIES=3;

function formatSlippage(s)
{
  let o = Math.floor(s);
  let d = Math.floor((s-o)*1000);
  s = o+'.'+d;
  return s;
}

async function confirmTransaction(hash)
{
  console.log("Confirming transaction hash=",hash);
  const start = parseInt(Date.now()/1000);
  let now = parseInt(Date.now()/1000);
  const TIMEOUT = 300;
  const SLEEP = 1;
  let status = false;
  while (start + TIMEOUT > now)
  {

    status = await web3.obj.eth.getTransactionReceipt(hash);
    console.log("status=",status,"hash=",hash);
    if (status !== null)
    {
      return status;
    }
    await utils.sleep(SLEEP);
    now = parseInt(Date.now()/1000);
  }
  throw new Error("Transaction not confirmed in 1inch.confirmTransaction()");
}

async function swap(fromToken, toToken, amount, walletAddress, retries=0, gp=false) {
  try {
    console.log(`fromToken ${fromToken}, toToken${toToken}, amount ${amount} `);
    let inchSpender;
    let slippage=0.3;
     if (web3.chain == "op")
     {
       slippage = 0.2;
       inchSpender = "0x1111111254760F7ab3F16433eea9304126DCd199";
     }
     else if (web3.chain == "poly")
     {
       slippage = 0.25;
       inchSpender = "0x1111111254eeb25477b68fb85ed929f73a960582";
     }
     else
       inchSpender = "0x1111111254fb6c44bac0bed2854e76f90643097d";
    var data;
    if (fromToken.toLowerCase() != "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE".toLowerCase()) {
      const c = await erc20.getContract(fromToken);
      await erc20.approve(c,walletAddress,inchSpender,amount);
    }
    console.log("getting swap quote");
    console.log(fromToken,toToken,amount,walletAddress);
    if (retries > 0) 
      slippage = slippage + retries * 0.1;
    let quoteUrl;
    if (fromToken == "0x09a3EcAFa817268f77BE1283176B946C4ff2E608")
      quoteUrl = `https://api.1inch.io/v4.0/1/swap?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}&fromAddress=${walletAddress}&slippage=`+slippage;
    else if (web3.chain == 'op')
      quoteUrl = `https://api.1inch.io/v4.0/10/swap?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}&fromAddress=${walletAddress}&slippage=`+slippage;
    else if (web3.chain == 'arb')
      quoteUrl = `https://api.1inch.io/v4.0/42161/swap?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}&fromAddress=${walletAddress}&slippage=`+slippage;
    else if (web3.chain == 'poly')
      quoteUrl = `https://api.1inch.io/v4.0/137/swap?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}&fromAddress=${walletAddress}&slippage=`+slippage;
    else
      quoteUrl = `https://api.1inch.io/v4.0/43114/swap?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}&fromAddress=${walletAddress}&slippage=`+slippage;
    console.log("quote=",quoteUrl);
    let response;
    try {
      response = await axios.get(quoteUrl);
    } catch (e)
    {
      console.log(e.message+" swap.axios.get("+quoteUrl+") failed");
      throw new Error(e.message+" swap.axios.get("+quoteUrl+") failed");
    }
    console.log("swapping amount=",amount);
    if (response.data) {
      data = response.data;
      data.tx.gas = "7000000";
      data.tx.nonce = await web3.obj.eth.getTransactionCount(walletAddress);
      if (web3.chain == "poly")
        data.tx.maxPriorityFeePerGas = await gas.getGas();
      console.log("data.tx",data.tx);
      let tx;
      try {
        tx = await web3.obj.eth.sendTransaction(data.tx);
      } catch (e) { 
        console.log(e.message+" swap.sendTransaction() failed");
        throw new Error(e.message+" swap.sendTransaction() failed");
      }
      let status = await confirmTransaction(tx.transactionHash);
      console.log("tx=",tx);
      console.log("tx.status=",tx.status);
      if (!status)
        throw new Error("Transaction reverted");
    }

    console.log("1inch.swap() data",data);
    return data.toTokenAmount;
  } catch (e) {
    console.log("Error in swap: " + e.message);
    if (retries < MAX_RETRIES && utils.shouldRetry(e.message))
    {
      retries++;
      if (e.message.search("Returned error: gas price too low:")>=0)
      {
        let gp = utils.parseGas(e.message);
        gp = Math.floor((1+retries*0.5) * gp);
        return await swap(fromToken, toToken, amount, walletAddress, retries, gp);
      }
      await utils.sleep(2*retries);
      return await swap(fromToken, toToken, amount, walletAddress, retries, gp);
    }

    console.log("failed to swap: " + e.message);
    throw new Error(e.message+" => inch.swap("+fromToken+","+toToken+","+
      amount+","+walletAddress+","+retries+") failed");
  }
}

async function convertAmount(fromToken,toToken,fromAmt)
{
  try {
    const fs = maps.symbolMap.get(fromToken.toLowerCase());
    const ts = maps.symbolMap.get(toToken.toLowerCase());
    //console.log("fs",fs,"ts",ts);
    const fp = maps.priceMap.get(fs);
    const tp = maps.priceMap.get(ts);
    //console.log("fp",fp,"tp",tp);
    const fd = maps.decimalsMap.get(fs);
    const td = maps.decimalsMap.get(ts);
    //console.log("fromAmt", fromAmt,"fd",fd,"td",td, "td-fd",td-fd);
    var toAmt;
    if (td > fd)
      toAmt = BigNumber(fromAmt).mult(fp).div(tp).mult(BigNumber(10).pow(td-fd)).toString();
    else
      toAmt = BigNumber(fromAmt).mult(fp).div(tp).div(BigNumber(10).pow(fd-td)).toString();
    //console.log("convertAmount",fs,ts,fromAmt,toAmt);
    return toAmt;
  } catch (e) {
    console.log("Error in convertAmount:"+e.message);
    throw new Error(e.message+" => convertAmount() failed");
  }
}  

function setSlippage(time, startTime, seconds, minSlip, maxSlip)
{
  const slip = minSlip + (time-startTime)/seconds * (maxSlip-minSlip);
  return slip;
}

async function getQuote(
  fromToken,
  toToken,
  amount,
  walletAddress,
  chin=false, 
  opt = false,
  ratio=false
  )
{
  console.log("getQuote",fromToken,toToken,amount,walletAddress);
  let ch = web3.chain;
  if (chin)
    ch = chin;
  let version = "4.0";
  let protocols = "";
  if (fromToken.toLowerCase() != "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE".toLowerCase()) {
    const c = await erc20.getContract(fromToken);
    let inchSpender;
    if (ch == "op")
    {
      inchSpender = "0x1111111254760F7ab3F16433eea9304126DCd199";
    }
    else if (ch == "poly")
    {
      inchSpender = "0x1111111254eeb25477b68fb85ed929f73a960582";
    }
    else if (ch == "arb") 
    {
      version = "5.0";
      inchSpender = "0x1111111254eeb25477b68fb85ed929f73a960582";
    }
    else  // works for "arb", "avax", "eth"?
      inchSpender = "0x1111111254fb6c44bac0bed2854e76f90643097d";
    await erc20.approve(c,walletAddress,inchSpender,amount);
  }
  let quoteUrl;
  let response;
  let swapAmount;
  //await quote.oneLoadQuotes();
  let quoteFailures = 0;
  let slippage = 0.1;
  if (ratio && ratio > 1.5)
    slippage = 0.7;
  else if (ratio && ratio > 1.2)
    slippage = 0.4;
  else if (ratio && ratio > 1)
    slippage = 0.2;
  while (true) {
    try {
      let cid = chain.chainId(ch);
      //let cid = web3.chainid;
console.log("CID=",cid);
      if (opt)
        slippage = 0.05;
      else 
        slippage = parseFloat(slippage)+0.1;
      slippage = formatSlippage(slippage);
console.log("slippage=",slippage);
      quoteUrl = 'https://api.1inch.io/v'+version+'/'+cid+'/swap?fromTokenAddress='+fromToken+'&toTokenAddress='+toToken+'&amount='+amount+'&fromAddress='+walletAddress+'&slippage='+slippage+protocols;
      console.log("quoteUrl=",quoteUrl+" ratio="+ratio+" ch="+ch);
      unic.saveFile("trade","getQuote() "+quoteUrl+" ch="+ch+" opt="+opt+" ratio="+ratio+" slippages="+slippage);
      response = await axios.get(quoteUrl);
console.log("response =", response);
//console.log("response.status =", response.status);
//console.log("response.data =", response.data);
      swapAmount = response.data.toTokenAmount;
console.log("swapAmount =", swapAmount);
      break;
    } catch (e) {
      console.log("Error in axios.get of quote:",e.message,quoteUrl);
      unic.saveFile("trade","Error in 1inch.getQuote "+e.message+" quoteFailures="+quoteFailures);
      quoteFailures++;
      if (e.message.search("status code 400")>=0)
        throw new Error(e.message+" getQuote failed amt="+amount+" fromToken="+fromToken+" url="+quoteUrl);
      if (quoteFailures >= 3)
        throw new Error(e.message+" getQuote too many failures amt="+amount+" fromToken="+fromToken+" url="+quoteUrl);
      await utils.sleep(quoteFailures);
      continue;
    }
  }
  const toSymbol = maps.symbolMap.get(toToken.toLowerCase());
  const toDecimals = maps.decimalsMap.get(toSymbol);
  console.log("toSymbol",toSymbol,"toDecimals",toDecimals);
  const toAmount = parseInt(BigNumber(swapAmount).div(BigNumber(10).pow(toDecimals-6)).toString())/1000000;
  const result = { toAmount: toAmount, amount: swapAmount, decimals: toDecimals, symbol: toSymbol, quoteData: response };
  return result;
}

async function getSwapQuote(
  fromToken,
  toToken,
  amount,
  seconds,
  walletAddress,
  minSlip,  // set min slippage for trade
  maxSlip)  // slippage increases linearly from min to max over seconds
{
  if (fromToken != "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
    const c = await erc20.getContract(fromToken);
    const inchSpender = "0x1111111254fb6c44bac0bed2854e76f90643097d";
    await erc20.approve(c,walletAddress,inchSpender,amount);
  }
  console.log("getSwapQuote", amount, seconds, minSlip, maxSlip);
  const startTime = Date.now(); 
  let quoteUrl;
  seconds *= 1000;
  let response;
  let swapAmount;
  var SLIPPAGE;
  //await quote.oneLoadQuotes();
  let time = Date.now();
  let quoteFailures = 0;
  while (time < startTime + seconds) {
    try {
      SLIPPAGE = setSlippage(time,startTime,seconds,minSlip,maxSlip);
      quoteUrl = `https://api.1inch.io/v4.0/43114/swap?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}&fromAddress=${walletAddress}&slippage=0.5`;
      try {
        //console.log("quoteUrl=",quoteUrl);
        response = await axios.get(quoteUrl);
      } catch (e) {
        console.log("Error in axios.get of quote:",e.message,quoteUrl);
        if (e.message.search("status code 400")>=0)
          throw new Error(e.message+" getSwapQuote failed amt="+amount+" fromToken="+fromToken+" url="+quoteUrl);
        quoteFailures++;
        if (quoteFailures > 3)
          throw new Error(e.message+" getSwapQuote too many failures amt="+amount+" fromToken="+fromToken+" url="+quoteUrl);
        await utils.sleep(5+3*quoteFailures);
        continue;
      }
      swapAmount = response.data.toTokenAmount;
      await quote.oneLoadQuotes();
      var target = await convertAmount(fromToken,toToken,amount);
      console.log("target",target,"swapAmount",swapAmount, "seconds", seconds,Math.floor((time-startTime)/1000));
      const slippage = parseInt(BigNumber(target)
        .minus(BigNumber(swapAmount))
        .mult(100000) //gets three decimal places on .05 = 50; .1 = 100
        .div(swapAmount)
        .toString());
      console.log("slippage (300 = 0.3%):",slippage, "SLIPPAGE", SLIPPAGE);

      if (slippage <= SLIPPAGE)
      {
        console.log("SWAPPING",amount);
        try {
          await swapWithQuote(response, fromToken, amount, walletAddress);
          console.log("SWAP SUCCEEDED");
          return true;
        } catch (e) {
          console.log("SWAP FAILED",e.message);
        }
        break;
      }
      await utils.sleep(4);
      time = Date.now();
    } catch (e) {
      console.log("getSwapQuote() pricing failed amount="+amount
        +" minSlippage="+minSlip+" "+e.message);
      throw new Error(e.message + " => getSwapQuote() failed "
        +amount+" minSlippage="+minSlip);
    }
  }
  return false;
}

async function swapWithQuote(response, fromToken, amount, walletAddress) {
  try {
    unic.saveFile("trade","1inch.swapWithQuote()"+fromToken+" "+amount+" "+walletAddress);
    console.log("swapWithQuote",response.data,fromToken,amount,walletAddress);
    let data;
    if (response.data) {
      data = response.data;
      if (web3.chain != "arb")
      {
        data.tx.gas =   "7000000";
      } 
      if (web3.chain == "poly")
        data.tx.gas = 1500000;
      data.nonce = await web3.obj.eth.getTransactionCount(walletAddress);
      //console.log(data);
      console.log("data.tx=",data.tx);
console.log("swapWithQuote sending Transaction", data.tx, web3.chain);
      tx = await web3.obj.eth.sendTransaction(data.tx);
      console.log("swapWithQuote transaction :",tx);
      console.log("swapWithQuote transaction status:",tx.status);
      return data.toTokenAmount;
    }
  } catch (e) {
    unic.saveFile("trade","Error in 1inch.swapWithQuote() "+e.message);
    throw new Error(e.message + " => swapWithQuote() failed");
  }
}


module.exports = Object.assign({
  swap,
  convertAmount,
  getQuote,
  getSwapQuote,
  swapWithQuote,
  initMaps
});
