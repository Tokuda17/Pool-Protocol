const utils = require("./utils.js");
const web = require("./web3.js");
const chain = require("./chain.js");
const axios = require("axios");
const maps = require("./maps.js");
const erc20 = require("./erc20.js");
var BigNumber = require('big-number');
var avaxPrice18;

// pass coingecko id
// xxx can improve accuracy by getting value in btc and multiplying (more significant digits)
// consider a call like this:   'https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2%2Cbitcoin%2Cusd-coin%2Ctether&vs_currencies=btc%2Ceth' 
// it gives you multiple paths through btc and eth with more significant digits

async function cgQuotes(cgids,retries=0,sleeptime=0) {
  let err;
  while (retries >= 0)
  {
    try {
      const url = "https://api.coingecko.com/api/v3/simple/price?ids="+cgids+"&vs_currencies=usd&include_24hr_change=true";
      console.log("Entering quote",url);
      const quote = await axios.get(url);
      console.log("quote returned ");
      return quote.data;
    } catch (e) {
      err = e.message;
      console.log(err);
      retries--;
      if (sleeptime == 0)
        sleeptime = 3;
      else
        sleeptime *= 2;
      await utils.sleep(sleeptime);
    }
  }
  throw Error(err," => cgQuotes failed");
}

const cgvalues = [
  ["AVAX",'avalanche-2'],
  ["WAVAX",'avalanche-2'],
  ["USDC",'usd-coin'],
  ["USDC.E",'usd-coin'],
  ["USDT",'tether'],
  ["USDT.E",'tether'],
  ["PNG",'pangolin']
];

function getCgList()
{
  let list = "";
  list = cgvalues[0][1];
  for(let i=1;i<cgvalues.length;i++)
  {
    list += ","+cgvalues[i][1];
  }
  return list;
}

async function cgQuote(cgid,retries=0,sleeptime=0) {
  let err;
  while (retries >= 0)
  {
    try {
      const url = "https://api.coingecko.com/api/v3/simple/price?ids="+cgid+"&vs_currencies=usd&include_24hr_change=true";
      console.log("Entering quote",url);
      const quote = await axios.get(url);
      console.log("quote returned ");
      return quote.data[cgid]["usd"];
    } catch (e) {
      err = e.message;
      console.log(err);
      retries--;
      if (sleeptime == 0)
        sleeptime = 3;
      else
        sleeptime *= 2;
      await utils.sleep(sleeptime);
    }
  }
  throw Error(err," => cgQuote failed");
}

async function oneLoadQuotes(ch="avax")
{
  try {
    let id = chain.chainId(ch);
    if (ch != "avax")
    {
      throw Error("Non-AVAX chain currently not supported because of 1inch");
    }
    let cgids = getCgList();
    let qs = await cgQuotes(cgids,retries=2);
console.log("quotes=",qs);
    let usdcAddr = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
console.log("1");
    if (id ==1)
    {
console.log("1a");
      usdcAddr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
console.log("1b");
    }
console.log("1c");
    const tokenAddresses = [usdcAddr];
console.log("2");
    await erc20.initMaps(tokenAddresses);
console.log("3",cgvalues.length);
    for (let i=0;i<cgvalues.length;i++)
    {
      let sym = cgvalues[i][0];
      let price = qs[cgvalues[i][1]]['usd'];
      maps.priceMap.set(sym,price);
console.log("SAVING sym=",sym," price=",price);
    }
console.log("Out of loop");
/*
    for (var addr in quotes)
    {
      addr = addr.toLowerCase();
      const sym = maps.symbolMap.get(addr);
      if (sym != undefined)
      {
console.log("sym",sym,"price",quotes[addr]);
        maps.priceMap.set(sym,quotes[addr]);
      }
    }
*/
//   const usdcPrice18 = maps.priceMap.get("USDC");
console.log("USDC price set");
//    avaxPrice18 = (BigNumber(10).pow(36)).div(usdcPrice18).toString();
console.log("AVAX price set");
  } catch (e) {
    console.log(e.message);
    throw Error(e.message," => oneLoadQuotes failed");
  }
  
}

async function oneFastQuote(qaddr,ch="avax")
{
  exit();
console.log("qaddr=",qaddr,ch);
  try {
    if (!qaddr)
      throw new Error("oneFastQuote bad qaddr",qaddr);
    console.log("Calling oneFastQuote",qaddr,ch);
    let id = chain.chainId(ch);
    const config = {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    };
    let quotes;
    //quotes = quotes.data;
    quotes = JSON.parse(qdata);
    console.log("finding quote for qaddr=",qaddr);
    console.log(quotes);
    var usdFlag = false;
    var qaddrFlag = false;
    let usdcAddr = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
    if (id ==1)
    {
      usdcAddr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    }
    else if (id ==10) // op
    {
      usdcAddr = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
    }
    else if (id ==137) // poly
    {
      usdcAddr = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    }
    else if (id == 42161) // arbitrum
    {
      usdcAddr = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
    }
    usdcAddr = usdcAddr.toLowerCase();
    var qaddr = qaddr.toLowerCase();
    var qPrice;
//    var usdcPrice18 = maps.priceMap.get(usdcAddr);
    let usdcPrice18;
    for (let addr in quotes)
    {
      addr = addr.toLowerCase();
      if (usdFlag && qaddrFlag) break;
      if (addr == qaddr)
      {
        //maps.priceMap.set(addr.toLowerCase(), quotes[addr]);
        qPrice = quotes[addr];
        qaddrFlag = true;
      }
      else if (addr == usdcAddr)
      {
        //maps.priceMap.set(addr.toLowerCase(), quotes[addr]);
        usdcPrice18 = quotes[addr];
        usdFlag = true;
      }
    }
    if (usdFlag && qaddrFlag)
    {
      console.log("USDC Price=", usdcPrice18);
      console.log("WETH Price=", qPrice);
      avaxPrice18 = (BigNumber(10).pow(36)).div(usdcPrice18).toString();
      //console.log("AVAX Price=", parseInt(BigNumber(avaxPrice18).div(BigNumber(10).pow(16)).toString())/100);
      let q = parseInt(BigNumber(qPrice)
        .mult(avaxPrice18)
        .div(BigNumber(10)
        .pow(18+9))
        .toString())/1000000000;
      //q=parseInt(BigNumber(qPrice).mult(avaxPrice18).div(BigNumber(10).pow(27)).toString())/1000000000;
      console.log("Price=",q);
      return q;
    } else
      throw new Error("Could not find qaddr in 1inch quotes");
  } catch (e) {
    console.log(e.message);
    throw Error(e.message," => oneLoadQuotes failed");
  }
  
}
module.exports = Object.assign({cgQuote,oneLoadQuotes,oneFastQuote})

