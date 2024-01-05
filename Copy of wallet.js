const fusion = require("@1inch/fusion-sdk");
const utils = require("./utils.js");
const alchemy = require("alchemy-sdk");
const chain = require("./chain.js");
const web = require("./web3.js");
const op = require("./op.js");
const maps = require("./maps.js");
const erc20 = require("./erc20.js");
// const erc20e = require("./erc20e.js");
require("dotenv").config();
var BigNumber = require('big-number');

var web3 = web.web3;
const NATIVE_WALLET_RESERVE =        "3000000000000000000";
const NATIVE_OP_WALLET_RESERVE =     "3000000000000000000";
const NATIVE_MATIC_WALLET_RESERVE = "12000000000000000000";
const NATIVE_ARB_WALLET_RESERVE =    "1000000000000000000";
const MIN_WALLET_RESERVE =           "1000000000000000000";

// alchemy api keys
const apiKeyMap = {
  op: "rHtq3eFE7jm_xUmUNJOOOg4LR9wngukb",
  poly: "AmllS7MVSHEnkL8dxIWD0QiDQhMWe5Ry",
  arb: "-aIjTJiAjkaQVE7aJio0ew42h0b39iZf",
  eth: "0cbue9UUJ2iTntNKop8bnJTujqtNAwbS"
};

const networkMap = {
  op: alchemy.Network.OPT_MAINNET,
  poly: alchemy.Network.MATIC_MAINNET,
  arb: alchemy.Network.ARB_MAINNET,
  eth: alchemy.Network.ETH_MAINNET
};

let pk;

// variables for ethers wallets

//*********************************************************************
// getSpendableBalancee - gets spendable balance using ethers/alchemy
//*********************************************************************
async function getBalancee(walletAddress,ch)
{
console.log("getBalancee",walletAddress,ch);
  try {
    let provider = web.getEthersProvider(ch);
    let bal = await provider.getBalance(walletAddress);
    return bal.toString();
    bal = bal.toString();
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => getBalancee failed");
  }
}

async function getSpendableBalancee(walletAddress,ch)
{
  try {
    let reserve=0;
    if (web3.chain == 'avax')
      reserve = NATIVE_WALLET_RESERVE;
    else if (web3.chain == 'op')
      reserve = NATIVE_OP_WALLET_RESERVE;
    else if (web3.chain == 'poly')
      reserve = NATIVE_MATIC_WALLET_RESERVE;
    else if (web3.chain == 'arb')
      reserve = NATIVE_ARB_WALLET_RESERVE;
    else
      throw new Error("Unknown chain in getSpendableBalancee()");
    let bal = await getBalancee(walletAddress,ch);
    bal = bal.toString();
    if (BigNumber(bal).lt(reserve))
    {
      bal=0;
      //console.log("Balance less than reserve");
    }
    else
    {
      //console.log("Balance greater than reserve");
      bal=BigNumber(bal).add(-reserve).toString();
      //console.log("bal=",bal);
    }
    return bal;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => getSpendableBalancee failed");
  }
}

async function getBalance(walletAddress)
{
  try {
    let bal = await web3.obj.eth.getBalance(walletAddress);
    return bal;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => getBalance failed");
  }
}

async function getSpendableBalance(walletAddress)
{
console.log("getSpendableBalance", walletAddress);
  try {
    let reserve=0;
    if (web3.chain == 'avax')
      reserve = NATIVE_WALLET_RESERVE;
    else if (web3.chain == 'op')
      reserve = NATIVE_OP_WALLET_RESERVE;
    else if (web3.chain == 'poly')
      reserve = NATIVE_MATIC_WALLET_RESERVE;
    else if (web3.chain == 'arb')
      reserve = NATIVE_ARB_WALLET_RESERVE;
    else
      throw new Error("Unknown chain in getSpendableBalance()");
    let bal = await web3.obj.eth.getBalance(walletAddress);
    if (BigNumber(bal).lt(reserve))
    {
      bal=0;
      //console.log("Balance less than reserve");
    }
    else
    {
      //console.log("Balance greater than reserve");
      bal=BigNumber(bal).add(-reserve).toString();
      //console.log("bal=",bal);
    }
    console.log("getSpendableBalance bal=",bal);
    return bal;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => getSpendableBalance failed");
  }
}

function getWalletAddress(port,ch)
{
  for (let i=0;i<port.wallets.length;i++)
  {
    if (port.wallets[i].chain == ch)
    {
      return port.wallets[i].walletAddress;
    }
  }
  throw new Error("wallet.getWalletAddress() unknown chain="+ch);
}

async function getPositionsMulti(port,wallet) {
  try {
    ch = wallet.chain;
    //if (wallet.chain != "arb") return false;
    let walletAddress = wallet.walletAddress;
console.log("walletAddress=",walletAddress,"wallet=",wallet);
    let blocklist = [];
    if (wallet.blocklist)
      blocklist = wallet.blocklist;
    let includelist = false;
    if (wallet.includelist)
      includelist = wallet.includelist;
    console.log("==================================================================");
console.log("addressMap=",maps.addressMap);
    console.log("getPositions walletAddress=",wallet.walletAddress,"chain=",ch);
    pos=[];
    let price;
    //xxxfor (const[sym,a] of maps.addressMap) {
    for (const[sym,a] of maps.getAddressMap(ch)) {
      let s = sym.toUpperCase();
      price = maps.priceMap.get(s); 
      console.log("getWallet XXXXXXXXXXXXXXXXXX  address=",a, " sym=", s);
      if (blocklist.includes(s))
        continue;
      console.log("getWalleta XXXXXXXXXXXXXXXXXX  address=",a, " sym=", s);
      if (includelist && !includelist.includes(s.toUpperCase()))
        continue;
      console.log("getWallet2 XXXXXXXXXXXXXXXXXX  address=",a, " sym=", s);
      let c;
      let d;
      let bal;
      if (a == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") 
      {
        if (ch != 'avax')
        {
          d = 18;
          bal = await getSpendableBalancee(walletAddress,ch);
          console.log("getWallet3 XXXXXXXXXXXXXXXXXX  address=",a, " sym=", s);
        }
        else
        {
          d = 18;
          bal = await getSpendableBalance(walletAddress,ch);
          console.log("getWallet3 XXXXXXXXXXXXXXXXXX  address=",a, " sym=", s);
        }
      }
      else
      {
        console.log("Getting contract");
        c=await erc20.getContract(a,ch);
        console.log("Getting decimals");
        d=await erc20.decimals(c,ch);
        console.log("Getting balance",walletAddress,ch);
        bal=await erc20.balanceOf(c,walletAddress,ch);
        console.log("getWallet4 XXXXXXXXXXXXXXXXXX  address=",a, " sym=", s);
      }
      const amt = parseInt(BigNumber(bal).mult(1000000).div(BigNumber(10).pow(d)).toString())/1000000;
      if (chain.isEthEquivalent(s))
      {
        let vusd = parseInt(BigNumber(bal).mult(Math.floor(price * 1000000)).div(BigNumber(10).pow(18)).toString())/1000000;
        pos.push({id: "wallet", chain: ch, symbol: s, amount: bal, amt: amt, decimals: d, quote: price, usd: vusd});
        console.log("getWallet5 XXXXXXXXXXXXXXXXXX  address=",a, " sym=", s);
      }
      else if (chain.isStablecoin(s,ch))
      {
        //let susd = parseInt(bal)/1000000;
        let susd = parseInt(BigNumber(bal).mult(Math.floor(price * 1000000)).div(BigNumber(10).pow(6)).toString())/1000000;
        pos.push({id: "wallet", chain: ch, symbol: s, amount: bal, amt: amt, decimals: d, usd: susd});
        console.log("getWallet6 XXXXXXXXXXXXXXXXXX  address=",a, " sym=", s);
      }
      else
      {
        let vusd = parseInt(BigNumber(bal).mult(Math.floor(price * 1000000)).div(BigNumber(10).pow(18)).toString())/1000000;
        pos.push({id: "wallet", chain: ch, symbol: s, amount: bal, amt: amt, decimals: d, usd: vusd});
        console.log("getWallet7 XXXXXXXXXXXXXXXXXX  address=",a, " sym=", s);
      }
    }
    return pos;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => wallet.getPositionsMulti failed");
  }
}

async function getPositions(walletAddress, addressMap, includelist=false, blocklist=false) {
  try {
    //console.log("==================================================================");
    console.log("getPositions walletAddress=",walletAddress,"chain=",web3.chain,addressMap);
    pos=[];
    let price = maps.priceMap.get("ETH");
    //console.log("wallet.getPositions addessMap=",addressMap);
    if (!blocklist)
      blocklist = [];
    for (const[s,a] of addressMap) {
console.log("getting wallet for avax chain symbol "+s);
      //console.log("getWallet XXXXXXXXXXXXXXXXXX  address=",a, " sym=", s);
      if (blocklist.includes(s.toUpperCase()))
        continue;
      if (includelist && !includelist.includes(s.toUpperCase()))
        continue;
      if (a == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") continue;
      const c=await erc20.getContract(a);
      const d=await erc20.decimals(c);
      const bal=await erc20.balanceOf(c,walletAddress);
      const amt = parseInt(BigNumber(bal).div(BigNumber(10).pow(d-6)).toString())/1000000;
      if (web3.chain == 'op')
      {
        if (op.isNativeEquivalent(s))
        {
          let vusd = parseInt(BigNumber(bal).mult(Math.floor(price * 1000000)).div(BigNumber(10).pow(18)).toString())/1000000;
          pos.push({id: "wallet", chain: web3.chain, symbol: s, amount: bal, amt: amt, decimals: d, quote: price, usd: vusd});
        }
        else if (op.isStablecoin(s))
        {
          let susd = parseInt(bal)/1000000;
          pos.push({id: "wallet", chain: web3.chain, symbol: s, amount: bal, amt: amt, decimals: d, usd: susd});
        }
      }
      else if (web3.chain == 'poly')
      {
        if (s == "WETH" || s == "ETH")
        {
          let vusd = parseInt(BigNumber(bal).mult(Math.floor(price * 1000000)).div(BigNumber(10).pow(18)).toString())/1000000;
          pos.push({id: "wallet", chain: web3.chain, symbol: "WETH", amount: bal, amt: amt, decimals: d, quote: price, usd: vusd});
        }
        else if (chain.isStablecoin(s))
        {
          let susd = parseInt(bal)/1000000;
          pos.push({id: "wallet", chain: web3.chain, symbol: s, amount: bal, amt: amt, decimals: d, usd: susd});
        }
      }
      else if (web3.chain == 'avax')
      {
console.log("2 getting wallet for avax chain symbol "+s);
        if (s.toUpperCase() == "WETH.E")
        {
          let vusd = parseInt(BigNumber(bal).mult(Math.floor(price * 1000000)).div(BigNumber(10).pow(18)).toString())/1000000;
          pos.push({id: "wallet", chain: web3.chain, symbol: "WETH", amount: bal, amt: amt, decimals: d, quote: price, usd: vusd});
        }
        else if (chain.isStablecoin(s,"avax"))
        {
          let susd = parseInt(bal)/1000000;
          pos.push({id: "wallet", chain: web3.chain, symbol: s, amount: bal, amt: amt, decimals: d, usd: susd});
        }
        else if (chain.isNativeEquivalent(s.toUpperCase()))
        {
          let vusd = parseInt(BigNumber(bal).mult(Math.floor(maps.priceMap.get("WAVAX") * 1000000)).div(BigNumber(10).pow(18)).toString())/1000000;
          pos.push({id: "wallet", chain: web3.chain, symbol: "WAVAX", amount: bal, amt: amt, decimals: d, quote: maps.priceMap.get("WAVAX"), usd: vusd});
        }
        else
        {
          newpos = {id: "wallet", chain: web3.chain, symbol: s, amount: bal, amt: amt, decimals: d};
          const p = maps.priceMap.get(s.toUpperCase());
          if (p)
          {
            const usd = amt * p;
            newpos.usd = usd;
          }
          pos.push(newpos);
        }
      }
      else if (web3.chain == 'arb')
      {
        if (chain.isNativeEquivalent(s,"arb"))
        {
          let vusd = parseInt(BigNumber(bal).mult(Math.floor(price * 1000000)).div(BigNumber(10).pow(18)).toString())/1000000;
          pos.push({id: "wallet", chain: web3.chain, symbol: s, amount: bal, decimals: d, quote: price, usd: vusd});
        }
        else if (chain.isStablecoin(s,"arb"))
        {
          let susd = parseInt(bal)/1000000;
          pos.push({id: "wallet", chain: web3.chain, symbol: s, amount: bal, decimals: d, usd: susd});
        }
      }
      else
      {
        pos.push({id: "wallet", chain: web3.chain, symbol: s, amount: bal, decimals: d});
        //console.log("getWalletPositions symbol:",s," bal:",bal);
      }
    }
    const native = await getSpendableBalance(walletAddress);
console.log("native=",native);
console.log("chain=",web3.chain);
console.log("predicate=",!blocklist.includes("AVAX"));
    if (web3.chain == 'avax')
    {
console.log("here1");
      if (!blocklist.includes("AVAX"))
      {
console.log("here2");
        if (!includelist || includelist.includes("AVAX")) 
        {
console.log("here3");
          const namt = parseInt(BigNumber(native).div(BigNumber(10).pow(18-6)).toString())/1000000;
          const nusd = namt * maps.priceMap.get("WAVAX");
          pos.push({id: "wallet", chain: web3.chain, symbol: "AVAX", amount: native, amt: namt, decimals: 18, usd: nusd});
        }
      }
    }
    else if (web3.chain == 'op')
    {
      if (!blocklist.includes("ETH"))
      {
        if (!includelist || includelist.includes("ETH")) 
        {
          let vusd = parseInt(BigNumber(native).mult(Math.floor(price * 1000000)).div(BigNumber(10).pow(18)).toString())/1000000;
          pos.push({id: "wallet", chain: web3.chain, symbol: "ETH", amount: native, decimals: 18, 
            quote: price, usd: vusd });
        }
      }
    }
    else if (web3.chain == 'arb')
    {
      if (!blocklist.includes("ETH"))
      {
        if (!includelist || includelist.includes("ETH")) 
        {
          let vusd = parseInt(BigNumber(native).mult(Math.floor(price * 1000000)).div(BigNumber(10).pow(18)).toString())/1000000;
          pos.push({id: "wallet", chain: web3.chain, symbol: "ETH", amount: native, decimals: 18, 
            quote: price, usd: vusd });
        }
      }
    }
    else if (web3.chain == 'poly')
    {
      if (!blocklist.includes("MATIC"))
      {
        if (!includelist || includelist.includes("MATIC")) 
        {
          let vusd = parseInt(BigNumber(native).mult(Math.floor(1000000)).div(BigNumber(10).pow(18)).toString())/1000000;
          pos.push({id: "wallet", chain: web3.chain, symbol: "MATIC", amount: native, decimals: 18, 
            quote: 1, usd: vusd });
        }
      }
    }
    return pos;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => wallet.getPositions failed");
  }
}

async function initPort(port,ch=false)
{
  try {
  console.log("entering initPort",ch);
  if (!ch)
  {
    if (port.uniswapV3 && port.uniswapV3.chain)
      ch = port.uniswapV3.chain;
    else if (port.tj && port.tj.chain)
      ch = port.tj.chain;
    else if (port.chain)
      ch = port.chain;
  }
  let mainchain = false;
  let uniswap = false;
  console.log("wallet.initPort",port,ch);
  for (let i=0;i<port.wallets.length;i++)
  {
    console.log("initPort",i);
  //console.log("comparing",port.wallets[i].chain, port.uniswapV3.chain);
    //if (port.wallets[i].chain == port.uniswapV3.chain)
    if (port.uniswapV2)
    {
      if (port.wallets[i].chain == port.uniswapV2.chain)
      {
        uniswap = i;
      }
    }
    else if (port.uniswapV3)
    {
      if (port.wallets[i].chain == port.uniswapV3.chain)
      {
        uniswap = i;
      }
    }
    if (ch == port.wallets[i].chain)
    {
      mainchain = i;
      continue;
    }
console.log("calling init",port.wallets[i].wname,port.wallets[i].chain);
    let wallet = await init(port.wallets[i].wname, port.wallets[i].chain);
    port.wallets[i].walletAddress = wallet.address;
console.log("port=",port);
  }
    //console.log("initPort cleanup");
  let wallet = await init(port.wallets[mainchain].wname, ch);
  console.log("wallet=",wallet,mainchain,wallet.address);
  port.wallets[mainchain].walletAddress = wallet.address;
    //console.log("uniswap",uniswap);
  if (port.uniswapV2)
  {
    port.uniswapV2.walletAddress = port.wallets[uniswap].walletAddress;
  }
  else if (port.uniswapV3)
  {
    port.uniswapV3.walletAddress = port.wallets[uniswap].walletAddress;
  }
console.log("wall.init port=",port,uniswap);
  return port;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => initPort() failed");
  }
}

function getPrivateKey()
{
  //return process.env.LANCE_PRIVATE_KEY;
  return pk;
}

async function initInit(i,ch="avax")
{
  const wallet = await init(i.wname,ch);
  i.walletAddress = wallet.address;
}
async function init(wname,ch="avax")
{
  console.log("wallet.init",wname,ch);
  var wallet;
  await web.init(ch);
  console.log("wallet.init.2");
  if (process.env.FAMILY_PRIVATE_KEY !== undefined && wname == "family")
  {
    wallet = web3.obj.eth.accounts.wallet.add(process.env.FAMILY_PRIVATE_KEY);
    pk = process.env.FAMILY_PRIVATE_KEY;
  }
  else if (process.env.YIELD_PRIVATE_KEY !== undefined && wname == "yield")
  {
    wallet = web3.obj.eth.accounts.wallet.add(process.env.YIELD_PRIVATE_KEY);
    pk = process.env.YIELD_PRIVATE_KEY;
  }
  else if (process.env.LANCE_PRIVATE_KEY !== undefined && wname == "lance" )
  {
    if (ch != "avax")
    {
console.log("ch=",ch);
console.log("web3.ethers[ch]",web3.ethers[ch]);
console.log("web3.ethers[ch].wallet",web3.ethers[ch].wallet);
      if (!web3.ethers[ch].wallet)
      {
console.log("wallet.init.3");
        let setting = {
          apiKey: apiKeyMap[ch],
          network: networkMap[ch]
        };
        let a = new alchemy.Alchemy(setting);
console.log("a=",a);
        web3.ethers[ch].alchemy = a;
        let pk = process.env.LANCE_PRIVATE_KEY;
/*
        let wallet = web.getEthersProvider(ch);
console.log("wallet=",wallet);
        //pk = pk.replace('0x','');
        //pk = Buffer(pk,'hex');
//console.log("args",pk,wallet);
*/
        web3.ethers[ch].wallet = new alchemy.Wallet(pk,web3.ethers[ch].alchemy);
console.log("wallet.init.3a",web3.ethers[ch].wallet,ch);
      }
      if (!web3.fusion[ch])
      {
        const blockchainProvider = new fusion.PrivateKeyProviderConnector(
          process.env.LANCE_PRIVATE_KEY,web3.obj);
        const sdk = new fusion.FusionSDK({
          url: 'https://fusion.1inch.io',
          network: chain.chainId(ch),
          blockchainProvider });
        web3.fusion[ch] = sdk;
      }
    }
console.log("wallet.init.4");
    wallet = web3.obj.eth.accounts.wallet.add(process.env.LANCE_PRIVATE_KEY);
    pk = process.env.LANCE_PRIVATE_KEY;
  }
  else 
  {
    wallet = web3.obj.eth.accounts.wallet.add(process.env.PRIVATE_KEY);
    pk = process.env.PRIVATE_KEY;
  }

  console.log("wallet.init wallet=",wname,"address=",wallet.address);
  return wallet;
}

module.exports = Object.assign({init,initInit,initPort,getPrivateKey,getPositions, getPositionsMulti,getBalance, getSpendableBalance, getSpendableBalancee,NATIVE_WALLET_RESERVE, MIN_WALLET_RESERVE})


