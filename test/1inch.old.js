const axios = require("axios");
const utils = require("./utils.js");
require("dotenv").config();
var BigNumber = require("big-number");
const wall = require("./wallet.js");
const aave = require("./aave.js");
const web = require("./web3.js");
const erc20 = require("./erc20.js");
const maps = require("./maps.js");
const quote = require("./quote.js");
const web3 = web.web3;

async function initMaps()
{
  const tokenAddresses = [
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // avax
    "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // wavax
    "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // usdc
    "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", // usdc.e
    "0xc7198437980c041c805A1EDcbA50c1Ce5db95118", // usdt.e
    "0x60781C2586D68229fde47564546784ab3fACA982"  // png
  ];
  await erc20.initMaps(tokenAddresses);
  //console.log("addressMaps in inch.js",maps.addressMap);
}

let MAX_RETRIES=5;

async function oneInchApprove(tokenAddress, amount, walletAddress,retries=0) {
  try {
    let allowUrl;
    // xxx special hack for trading MIR
    if (tokenAddress == "0x09a3EcAFa817268f77BE1283176B946C4ff2E608")
      allowUrl = 'https://api.1inch.io/v4.0/1/approve/allowance?tokenAddress='+tokenAddress+'&walletAddress='+walletAddress;
    else
      allowUrl = 'https://api.1inch.io/v4.0/43114/approve/allowance?tokenAddress='+tokenAddress+'&walletAddress='+walletAddress;
    console.log("allowUrl",allowUrl);
    var allow = await axios.get(allowUrl);
    console.log("Allowance0",allow.data);
    if (allow.data)
    {
      allow = allow.data.allowance;
      //console.log("Allowance1",allow);
      if (BigNumber(allow).minus(amount).gt(0))
      {
        console.log("Trade approved by allowance");
        return true;
      }
    }
    //console.log("Approving...", tokenAddress, amount, walletAddress);
    let url;
    if (tokenAddress == "0x09a3EcAFa817268f77BE1283176B946C4ff2E608")
      url =  `https://api.1inch.io/v4.0/1/approve/transaction?tokenAddress=${tokenAddress}&amount=${amount}`;
    else
      url =  `https://api.1inch.io/v4.0/43114/approve/transaction?tokenAddress=${tokenAddress}&amount=${amount}`;
    const response = await axios.get(url);
    console.log(response.data);
    if (response.data) {
      data = response.data;
      data.nonce = await web3.obj.eth.getTransactionCount(walletAddress);
      data.gas = "4000000";
      data.from = walletAddress;
      tx = await web3.obj.eth.sendTransaction(data);
      if (tx.status) {
        console.log(tx.status);
      }
    }
  } catch (e) {
    if (retries < MAX_RETRIES)
    {
      if (utils.shouldRetry(e.message))
      {
        retries++;
console.log("SLEEPING 3 seconds in oneInchApprove");
        await utils.sleep(3 ** retries);
        return await oneInchApprove(tokenAddress, amount, walletAddress);
      }
    }
    console.log("oneInchApprove error" + e.message);
    throw new Error(e.message+" => oneInchApprove failed");
  }
}

async function swap(fromToken, toToken, amount, walletAddress, retries=0) {
  try {
    console.log(`fromToken ${fromToken}, toToken${toToken}, amount ${amount} `);
    var data;
    if (fromToken != "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
//      await oneInchApprove(fromToken, amount, walletAddress);
      const c = await erc20.getContract(fromToken);
      const inchSpender = "0x1111111254fb6c44bac0bed2854e76f90643097d";
      await erc20.approve(c,walletAddress,inchSpender,amount);
    }
    console.log("getting swap quote");
    console.log(fromToken,toToken,amount,walletAddress);
    let slippage=0.5;
    if (retries > 0) slippage = 0.8;
    let quoteUrl;
    if (fromToken == "0x09a3EcAFa817268f77BE1283176B946C4ff2E608")
      quoteUrl = `https://api.1inch.io/v4.0/1/swap?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}&fromAddress=${walletAddress}&slippage=`+slippage;
    else
      quoteUrl = `https://api.1inch.io/v4.0/43114/swap?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}&fromAddress=${walletAddress}&slippage=`+slippage;
    console.log("quote=",quoteUrl);
    const response = await axios.get(quoteUrl);
    console.log("swapping");
    if (response.data) {
      data = response.data;
      data.tx.gas = "1500000";
      data.nonce = await web3.obj.eth.getTransactionCount(walletAddress);
      console.log("data.tx",data.tx);
      tx = await web3.obj.eth.sendTransaction(data.tx);
      console.log(tx.status);
    }
    console.log("1inch.swap() data",data);
    return data.toTokenAmount;
  } catch (e) {
    console.log("Error in swap: " + e.message);
    if (retries < MAX_RETRIES && utils.shouldRetry(e.message))
    {
      retries++;
      await utils.sleep(3);
      return await swap(fromToken, toToken, amount, walletAddress, retries);
    }

    console.log("failed to swap: " + e.message);
    throw new Error(e.message+" => swap() failed");
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
  walletAddress)
{
 console.log("getQuote",fromToken,toToken,amount,walletAddress);
  if (fromToken != "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
    const c = await erc20.getContract(fromToken);
    const inchSpender = "0x1111111254fb6c44bac0bed2854e76f90643097d";
    await erc20.approve(c,walletAddress,inchSpender,amount);
  }
  let quoteUrl;
  let response;
  let swapAmount;
  //await quote.oneLoadQuotes();
  let quoteFailures = 0;
  while (true) {
    quoteUrl = `https://api.1inch.io/v4.0/43114/swap?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}&fromAddress=${walletAddress}&slippage=0.5`;
    try {
      //console.log("quoteUrl=",quoteUrl);
      response = await axios.get(quoteUrl);
      swapAmount = response.data.toTokenAmount;
      break;
    } catch (e) {
      console.log("Error in axios.get of quote:",e.message,quoteUrl);
      if (e.message.search("status code 400")>=0)
        throw new Error(e.message+" getQuote failed amt="+amount+" fromToken="+fromToken+" url="+quoteUrl);
      quoteFailures++;
      await utils.sleep(5+3*quoteFailures);
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
    //await oneInchApprove(fromToken, amount, walletAddress);
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
    console.log("swapWithQuote",response.data,fromToken,amount,walletAddress);
    let data;
    if (response.data) {
      data = response.data;
      data.tx.gas = "1000000";
      data.nonce = await web3.obj.eth.getTransactionCount(walletAddress);
      //console.log(data);
      //console.log(data.tx);
      tx = await web3.obj.eth.sendTransaction(data.tx);
      console.log("swapWithQuote transaction status:",tx.status);
      return data.toTokenAmount;
    }
  } catch (e) {
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
