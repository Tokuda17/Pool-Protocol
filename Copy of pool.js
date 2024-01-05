//Imports

require("dotenv").config();
var BigNumber = require("big-number");
const avax = require("./avax.js");
const swap = require("./swap.js");
const utils = require("./utils.js");
const kucoin = require("./kucoin.js");
const maps = require("./maps.js");
const erc20 = require("./erc20.js");
const nodemailer = require("./nodemailer.js");
const aave = require("./aave.js");
const inchnew = require("./1inchnew.js");
const alpha = require('./alpha.js');
const pan = require("./pan.js");
const wall = require('./wallet.js');
const inch = require("./1inch.js");
const quote = require("./quote.js");
const factory = require("./panFactory.js");
const web = require("./web3.js");
var wallet;
var SWAP_ATTEMPTS = 0;
var DEFAULT_SWAP_ATTEMPTS = 0;
let web3 = web.web3;

const ERROR_THRESHOLD = 8;
const DEFAULT_LEVERAGE = 2.75;
// to calculate multiple 2.75 * 1/(1+(outside positions)/(alpha leveraged position))
// includes AVAX-USDT and AVAX-USDC.e in pan
const LANCE_LEVERAGE = 2.75;
//const LANCE_LEVERAGE = 2.75; // without AVAX-USDT in pan, should be this


const OPTIMISTIC_TRADE_THRESHOLD = 0.9; // percent 
function getTradeThreshold(wname)
{
  if (wname == "lance")
  {
    return 1.2;
    //return 0.1;
    //return 1.0;
  }
  else 
  {
    return 1.2;
  }
}

//*********************************************************************
// Misc support functions
//*********************************************************************
function printMap(name, map) {
  console.log(name);
  map.forEach((value, key) => {
    console.log(key, value);
  });
}

function getSymbolFromArray(sym,a)
{ 
//console.log("getsymbolfromarray");
//console.log(sym,a);
  for(let i=0;i<a.length;i++)
  { 
    if (a[i].symbol.toUpperCase() == sym.toUpperCase())
      return a[i];
  }
  return {symbol: sym, amount: 0, decimals:18, amt: 0, usd: 0};
}

function getIdSymbolFromArray(id,sym,a)
{ 
//console.log("getsymbolidfromarray");
//console.log(id,sym,a);
  for(let i=0;i<a.length;i++)
  { 
    if (a[i].id == id)
    { 
      if (a[i].symbol.toUpperCase() == sym.toUpperCase())
        return a[i];
    }
  }
  return {symbol: sym, amount: 0, decimals:18, amt: 0, usd: 0};
}

// divides two number and returns a decimal with decimal places of precision
function getDecimalDivision(numerator, denominator, decimal)
{ 
  let n = BigNumber(numerator).mult(10 ** decimal).div(denominator).toString();
  n = parseInt(n)/(10 ** decimal);
  return n;
}

function addCommas(n,dollar)
{  
   if (dollar === true)
     dollar = "$";
   else 
     dollar = "";
   if (n < 0)
   { 
     minus = "-";
     n = -n;
   }
   else
     minus = "";
   if (n < 1000)
   {
     n = Math.floor(n*100)/100.0;
     return minus+dollar+n;
   }
   else
   {
     n = Math.floor(n);
     return minus+dollar+n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
   }
}

// creates addressMap, symbolMap, and decimalsMap from an array of positions
// a position is { symbol: <sym>, token: <address>, decimals: <decimals> }
function addPositionsToMaps(pos)
{ 
  //console.log("CREATE MAPS",pos.length);
  for(let i=0;i<pos.length;i++)
  { 
    if (pos[i].symbol !== undefined)
    { 
      if (pos[i].token !== undefined)
      { 
        //console.log("sym",pos[i].symbol,"token",pos[i].token);
        maps.addressMap.set(pos[i].symbol,pos[i].token);
        maps.symbolMap.set(pos[i].token,pos[i].symbol);
      }
      if (pos[i].decimals !== undefined)
      { 
        maps.decimalsMap.set(pos[i].symbol,pos[i].decimals);
        //console.log("dec",pos[i].decimals);
      }
    }
  }
  //console.log ("MAPS CREATED");
}

async function initMaps()
{
  await inch.initMaps();
  let ch = web3.chain;
  if (ch == 'avax')
  {
    await pan.initMaps(ch);
  }
}

async function exchangeRewards(wname, owner,walletPng,
  toAddress="0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E")
{
  console.log("EXCHANGE REWARDS:", walletPng);
  try {
    //console.log("Inside Try:");
    //const threshold = alpha.getClaimThreshold(wname);
    //console.log("Threshold:", threshold);
    const amount = parseInt(BigNumber(walletPng.amount).div(BigNumber(10).pow(walletPng.decimals)).toString());
    console.log("Amount:", amount);
    //    if (amount >= threshold)
    if (amount > 8000)
    {
      console.log("Need to SELL PNG:", walletPng);
      pAddress = maps.addressMap.get("PNG");
      console.log("Calling swap");
      pContract = await erc20.getContract(pAddress);
      console.log("exchangeRewards swap", pAddress,toAddress, walletPng.amount, owner);
      await inchnew.swap(
        "PNG",
        "USDC",
        amount);
/*
      await inch.swap(
        pAddress,
        toAddress,
        walletPng.amount,
        owner
      );
*/
      console.log("Swapping PNG for USDC.e or other token");
      return true;
    }
    return false;
  } catch (e) {
    console.log("exchangeRewards " + e.message);
    throw new Error(e.message+" => exchangeRewards failed");
  }
}

// xxx - run this on the result of wallet getPositions to get the value of lp tokens
// untested
async function expandPoolPositions(pos, pools)
{
  let newpos = [];
  for (let i=0;i<pos.length;i++)
  {
    if (BigNumber(pos[i].amount).isZero())
      continue;
    if (pools.includes(pos[i].symbol))
    {
      tokens = await pan.getPoolTokens(pos[i].id+":"+pos[i].symbol,maps.addressMap.get(pos[i].symbol), pos[i].amount);
      newpos = newpos.concat(tokens.positions);
    }
    else
    {
      newpos = newpos.concat(pos[i]);
    }
  }
  return newpos;
}

function getNativeExposure(ids,a)
{
console.log("ids=",ids);
console.log("a=",a);
  let amount = 0;
  let s = ['USDC.e','USDC','USDT','USDT.e'];
  for(let i=0;i<ids.length;i++)
  {
console.log("i",i);
    for (let j=0;j<s.length;j++)
    {
console.log("j",j);
      let ne = getIdSymbolFromArray(ids[i],s[j],a);
console.log("ne=",ne);
      if (ne)
      {
        amount += parseFloat(ne.amount);
      }
    }
  }
console.log( "AMOUNT ==============",amount);
  return amount;
}

function findPos(pos, id, ch, symbol)
{
//console.log("FINDING", pos, id, ch, symbol);
  for (let i=0; i< pos.length;i++)
  {
//console.log("i=",i,pos[i]);
    if (pos[i].id == id && pos[i].chain == ch && pos[i].symbol == symbol)
    {
      console.log("FOUND DUPLICATE", id,ch,symbol);
      return true;
    }
  }
  return false;
}


function deduplicate(pos)
{
  let newpos = [];
  for (let i=0;i<pos.length;i++)
  {
    if (!findPos(newpos, pos[i].id, pos[i].chain, pos[i].symbol))
      newpos.push(pos[i]);
  }
  return newpos;
}

async function getPositions(init) {
  let wname = init.wname;
  let owner = init.walletAddress;
  let trace = "";
  try {
    await initMaps();
    trace += "a";
    console.log("getPositions",wname,owner);
    //console.log("initMaps");
    //const ct = await alpha.getClaimThreshold(wname);
    //console.log("getclaimthresh",ct);

    let pos = [];
    const wavaxAddr = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
    //avaxUSDPrice = await quote.oneFastQuote(wavaxAddr);
    const multi = await quote.cgQuotes("ethereum,avalanche-2,pangolin",2);
    const avaxUSDPrice = multi["avalanche-2"].usd;
    const ethUSDPrice = multi["ethereum"].usd;
    const pngUSDPrice = multi["pangolin"].usd;
console.log("multi",multi,avaxUSDPrice,ethUSDPrice);
    let avaxPrice = BigNumber(Math.floor(avaxUSDPrice*100000000000)).mult(100000).toString();
    console.log("avaxPrice", avaxPrice);
    maps.priceMap.set("AVAX",avaxUSDPrice);
    maps.priceMap.set("WETH.E",ethUSDPrice);
    maps.priceMap.set("WAVAX",avaxUSDPrice);
    maps.priceMap.set("PNG",pngUSDPrice);
    maps.priceMap.set("USDT",1);
    maps.priceMap.set("USDt",1);
    maps.priceMap.set("USDT.e",1);
    maps.priceMap.set("USDC.e",1);
    maps.priceMap.set("USDC",1);

    let alphaPos = {numPositions: 0, nativeExposure: 0};
    let alphaRewards = 0;
    let rewardsUsd = 0;
    var aavePos = await aave.getPositions(owner);
    trace += "c";
    //console.log("aave position", aavePos);
    pos = pos.concat(aavePos);
    //addPositionsToMaps(pos); // addressMap and other maps filled in here
    let pos3 = await wall.getPositions(owner,maps.addressMap,false,false);
    pos3 = await expandPoolPositions(pos3,
      ['AVAX-USDC','AVAX-USDC.e','AVAX-USDT','AVAX-USDT.e']);
    trace += "d";
//console.log("pos3a",pos3);
//    pos3 = pos3.concat(pos3);
//console.log("pos3b",pos3);
    pos3 = deduplicate(pos3);
console.log("pos3c",pos3);
//console.log("pos3=",pos3);
    let pos4;
    if (wname == "lance") 
      pos4 = await pan.getPositions(owner, pos3);
    else
      pos4 = pos3;
    trace += "e";
    let wallNativeExposure = 0;
    wallNativeExposure = getNativeExposure(['AVAX-USDT.e','AVAX-USDC','AVAX-USDC.e','AVAX-USDT'],pos4);
    //console.log("=====================\n");
    //console.log(pos4);
    pos = pos.concat(pos4);
    if (wname == "lance" && false)
    {
      await kucoin.init();
      //var kucoinPos = await kucoin.getPositions();
      let kucoinPos = [];
      trace += "f";
      pos = pos.concat(kucoinPos);
    }
    const aaveRewards = await aave.getUserRewards(owner);
    trace += "g";
    //console.log("aaveRewards",aaveRewards);
    pos = pos.concat(aaveRewards);
    let walletPng=getIdSymbolFromArray("wallet","PNG",pos);
    await alpha.claimRewards(wname,owner,alphaRewards);
    trace += "h";
    let exchanged = false;
    exchanged = await exchangeRewards(wname,owner,walletPng);
    trace += "i";
    if (exchanged)
      return getPositions(init);
    trace += "j";
    let usd = 0; 
    let native = 0; 
    let vamt=0;
    let vusd=0;
    for (let i = 0; i < pos.length; i++) {
      console.log("i=",i, pos[i]);
      //console.log("SYMBOL "  + i + " " + pos[i].symbol + "\n");
      let sym = pos[i].symbol;
      let id = pos[i].id;
      //if (id == "rewards") continue;
      //console.log("sym=",sym);
      if (avax.isStablecoin(sym)) {
//console.log("stablecoin",sym,pos[i].amount);
        usd = BigNumber(usd).add(pos[i].amount).toString();
      } else if (avax.isNativeEquivalent(sym)) {
console.log("adding native",sym,pos[i].amount);
        native = BigNumber(native).add(pos[i].amount).toString();
        vamt += pos[i].amt;
        vusd += pos[i].usd;
console.log("total native=",native);
      } else if (sym == "PNG") {
 console.log("reward pos",i,pos[i]);
        rewardsUsd += pos[i].usd;
      } else {
      }
//console.log("end loop i=",i);
    }
    let netpos = {
      positions: [ 
        { id: "net", symbol: "USD", amount: usd, decimals: 6 }, 
        { id: "net", symbol: "AVAX", amount: native, decimals: 18 } ],
        //{ id: "rewards", rewards: alphaRewards} ],
      //aavePositions: aavePos,
      rewards: alphaRewards,
      rewardsUsd: rewardsUsd,
      numPositions: alphaPos.numPositions, 
      ids: alphaPos.positionIds,
      nativeExposure: alphaPos.nativeExposure+wallNativeExposure
      //poolNativePrice: alphaPos.poolNativePrice
    };
console.log("netpos=",netpos);
    netpos.positions = netpos.positions.concat(pos);
    
console.log("netpos in getPositions",netpos);
    return netpos;
  } catch (e) {
    console.log("getPositions " + e.message);
    throw new Error(e.message+" => pool.getPositions() failed trace="+trace);
  }
}

function getIdUsd(netPosition,id,symbol)
{
  let pos = netPosition.positions;
  for (let i=0;i<pos.length;i++)
  {
//console.log("comparing",pos[i].id,pos[i].symbol);
//await utils.sleep(3);
    if (pos[i].id == id && pos[i].symbol.toUpperCase() == symbol.toUpperCase())
    {
      return pos[i].usd;
    }
  }
  return 0;
}

const REBALANCE_THRESHOLD = 1.4;
const DEBT_RATIO = 0.85;

/*

  vusd - wallet variable usd value
  susd - wallet stable usd value
  avusd - aave vusd (negative if borrowing)
  asusd - aave susd (negative if borrowing)
  thresh - usd target for vusd and susd
  if (netPos.variableValue > 0)
  {
    sym0 = vsym
    sym1 = ssym
    amt = 
    aamt = avusd
    if (netPosition.variableValue)
      thresh=
  }
  else 
  {
    sym0 = ssym
    sym1 = vsym
    amt = 
    aamt = asusd
    if (netPosition.variableValue)
      thresh=
  }
*/

async function loadWallet(npos,sym)
{
  const walletAddress = npos.init.walletAddress;
  let thresh = npos.tradeThreshold;
  if (sym == "WAVAX")
  {
    if (npos.variableValue > thresh)
      thresh = npos.variableValue;
  }
  else
  {
    if (-npos.variableValue > thresh)
      thresh = -npos.variableValue;
  }
  const usd = getIdUsd(npos,"wallet",sym);
  const ausd = getIdUsd(npos,"aave-avalanche",sym);
  let amt = (thresh*3 * REBALANCE_THRESHOLD -usd)/maps.priceMap.get(sym);
  if (usd < thresh)
  {
    let subject;
    let body;
    if (ausd > 0)
    { 
      let amount = false;
      subject = "Withdrawing "+amt+" "+sym;
      if (ausd < amt)
      {
        let pos = getIdSymbolFromArray("aave-avalanche",sym,npos.positions)
console.log("pos",pos,sym);
        amount = pos.amount;
console.log("amount=",amount);
        console.log("withdrawing to close position amt",amt,amount,sym,usd,ausd,thresh,npos.variableValue);
        subject = "Withdrawing to close position: "+amount+" "+sym;
console.log("subject=",subject);
      }
      await aave.withdraw(walletAddress,sym,amt,amount);
      body = "loadWallet() $"+thresh+"\n";
      body += "wallet usd="+usd+"\n";
      body += "\n"+JSON.stringify(npos,null,2)+"\n";
    }
    else
    {
      console.log("borrowing amt",amt,sym,npos,thresh,npos.variableValue);
      await aave.borrow(walletAddress,sym,amt);
      subject = "Borrowing "+amt+" "+sym;
      body = "loadWallet() $"+thresh+"\n";
      body += "wallet usd="+usd+"\n";
      body += "\n"+JSON.stringify(npos,null,2)+"\n";
    }
    nodemailer.init(npos.init.email);
    nodemailer.sendMail(subject,body);
    return true;
  }
  console.log("status",npos,sym,usd,thresh,npos.variableValue);
  return false;
}

async function unloadWallet(npos,sym)
{
  let thresh = npos.tradeThreshold;
  const walletAddress = npos.init.walletAddress;
  const ausd = getIdUsd(npos,"aave-avalanche",sym);
  const wusd = getIdUsd(npos,"wallet",sym);
  let repay = 0;
  let subject = "";
  let body = "";
  if (wusd > thresh * REBALANCE_THRESHOLD)
  {
    repay = wusd - (thresh * REBALANCE_THRESHOLD);
    if (repay > 5000)
    {
      let amt = repay/maps.priceMap.get(sym);
      if (ausd >= 0)
      {
        console.log("deposit",sym,amt);
        await aave.deposit(walletAddress,sym,amt);
        subject = "Depositing "+amt+" "+sym; 
      }
      else
      {
        let amount = false;
        subject = "Repaying "+amt+" "+sym; 

        if (repay > -ausd)
        {
          console.log("need to close out position");
          let pos = getIdSymbolFromArray("aave-avalanche",sym,npos.positions)
          // repay exact amount
          amount = BigNumber(pos.amount).mult(-1).toString();
          console.log("repay to close out loan",sym,amt,amount,pos);
          subject = "Repaying "+amount+" to close out position for "+sym; 
        }
        console.log("repay",sym,amt,amount);
        await aave.repay(walletAddress,sym,amt,amount);
      }
      body += "Aave Usd="+ausd+" Wallet Usd="+wusd;
      nodemailer.init(npos.init.email);
      nodemailer.sendMail(subject,body);
      return true;
    }
  }
  return false;
}
/*
    thresh *= REBALANCE_THRESHOLD;
    let bvusd = getIdUsd(npos,"aave-avalanche","WAVAX");
    let bsusd = getIdUsd(npos,"aave-avalanche","USDC");
    if (bvusd < 0)
      bvusd *= -1;
    else
      bvusd = 0;
    if (bsusd < 0)
      bsusd *= -1;
    else
      bsusd = 0;
    let repayUsd=0;
    let bsym;
    if (bvusd > 0)
    {
      // repay but save thresh amount for next swap
      repayUsd = vusd - thresh;  

      // if repay amount is greater than borrow amount, then set repay to borrow amt
      if (repayUsd > bvusd)  
        repayUsd = bvusd;
      bsym = "WAVAX";
    }
    if (susd - thresh > repayUsd && bsusd > repayUsd)
    {
      repayUsd = susd - thresh;
      if (repayUsd > bsusd)
        repayUsd = bsusd;
      bsym = "USDC";
    }
    if (repayUsd > 1000)
    {
      amt = repayUsd/maps.priceMap.get(bsym);
      console.log("vusd=",vusd,susd,bvusd,"bsusd=",bsusd,"repayUsd=",repayUsd,"amt=",amt,"bsym=",bsym,"thresh=",thresh);
      await aave.repay(walletAddress,bsym,amt);
      nodemailer.init("lance");
      nodemailer.sendMail("Repaying debt","Debt ratio = "+ratio+". Repaying $"+repayUsd+" in "+bsym);
      console.log("repaid");
      return false;
    }
    nodemailer.init("default");
    nodemailer.setSubjectStartOption("EMERGENCY (1): Call Lance immediately - ");
    body = "Debt ratio = "+ratio+" Need to rebalance\n";
    body += "bvusd="+bvusd+" bsusd="+bsusd+" repayUsd="+repayUsd+" vusd="+vusd+" susd="+susd;
    nodemailer.sendMail("",body);
    await utils.sleep(300);
    // need to rebalance
    return;
*/

async function balance(npos)
{
  let thresh = npos.tradeThreshold;
  const walletAddress = npos.init.walletAddress;
  const vusd = getIdUsd(npos,"wallet","WAVAX");
  const susd = getIdUsd(npos,"wallet","USDC");
  const ratio = aave.getRatio(npos.positions);
  let amt;
  let body="";
  console.log("ratio=",ratio,DEBT_RATIO);
  if (ratio > DEBT_RATIO)
  {
    let s;
    console.log("unload wallet USDC");
    s = await unloadWallet(npos,"USDC"); 
    if (s) return true;
    s = await unloadWallet(npos,"WAVAX"); 
    if (s) return true;
    nodemailer.init("default");
    nodemailer.setSubjectStartOption("EMERGENCY (2): Call Lance immediately - ");
    body = "Debt ratio = "+ratio+" Need to rebalance\n";
    body += "vusd="+vusd+" susd="+susd;
    nodemailer.sendMail("",body);
    await utils.sleep(300);
  }
  return false;
}

async function rebalance(walletAddress,netPosition)
{
  let thresh = netPosition.tradeThreshold;
  if (netPosition.variableValue > 0)
  {
    if (netPosition.variableValue > thresh)
      thresh = netPosition.variableValue;
  }
  else
  {
    if (-netPosition.variableValue > thresh)
      thresh = -netPosition.variableValue;
  }
  const vusd = getIdUsd(netPosition,"wallet","WAVAX");
  const susd = getIdUsd(netPosition,"wallet","USDC");
  const ratio = aave.getRatio(netPosition.positions);
  let amt;
  let body="";
  console.log("ratio=",ratio);
  if (vusd < thresh)
  {
    amt = (thresh * REBALANCE_THRESHOLD -vusd)/maps.priceMap.get("WAVAX");
    console.log("borrow amt",amt,"WAVAX",netPosition);
    await aave.borrow(walletAddress,"WAVAX",amt);
    nodemailer.init(netPosition.init.email);
    body = "$"+thresh+"\n";
    body += "vusd="+vusd+"\n";
    body += "\n"+JSON.stringify(netPosition,null,2)+"\n";
    nodemailer.sendMail("Borrowing "+amt+" WAVAX",body);
    return;
  }
  else if (susd < thresh)
  {
    amt = (thresh * REBALANCE_THRESHOLD -susd)/maps.priceMap.get("USDC");
    console.log("borrow amt",amt,"USDC",netPosition);
    await aave.borrow(walletAddress,"USDC",amt);
    nodemailer.init(netPosition.init.email);
    body = "$"+amt+"\n";
    body += "susd="+susd+"\n";
    body += "\n"+JSON.stringify(netPosition,null,2)+"\n";
    nodemailer.sendMail("Borrowing "+amt+" USDC",body);
    return;
  }
  console.log("ratio=",ratio,DEBT_RATIO);
  if (ratio > DEBT_RATIO)
  {
    thresh *= REBALANCE_THRESHOLD;
    let bvusd = getIdUsd(netPosition,"aave-avalanche","WAVAX");
    let bsusd = getIdUsd(netPosition,"aave-avalanche","USDC");
    if (bvusd < 0)
      bvusd *= -1;
    else
      bvusd = 0;
    if (bsusd < 0)
      bsusd *= -1;
    else
      bsusd = 0;
    let repayUsd=0;
    let bsym;
    if (bvusd > 0)
    {
      // repay but save thresh amount for next swap
      repayUsd = vusd - thresh;  

      // if repay amount is greater than borrow amount, then set repay to borrow amt
      if (repayUsd > bvusd)  
        repayUsd = bvusd;
      bsym = "WAVAX";
    }
    if (susd - thresh > repayUsd && bsusd > repayUsd)
    {
      repayUsd = susd - thresh;
      if (repayUsd > bsusd)
        repayUsd = bsusd;
      bsym = "USDC";
    }
    if (repayUsd > 1000)
    {
      amt = repayUsd/maps.priceMap.get(bsym);
      console.log("vusd=",vusd,susd,bvusd,"bsusd=",bsusd,"repayUsd=",repayUsd,"amt=",amt,"bsym=",bsym,"thresh=",thresh);
      await aave.repay(walletAddress,bsym,amt);
      nodemailer.init(netPosition.init.email);
      nodemailer.sendMail("Repaying debt","Debt ratio = "+ratio+". Repaying $"+repayUsd+" in "+bsym);
      console.log("repaid");
      return;
    }
    nodemailer.init("default");
    nodemailer.setSubjectStartOption("EMERGENCY (3): Call Lance immediately - ");
    body = "Debt ratio = "+ratio+" Need to rebalance\n";
    body += "bvusd="+bvusd+" bsusd="+bsusd+" repayUsd="+repayUsd+" vusd="+vusd+" susd="+susd;
    nodemailer.sendMail("",body);
    await utils.sleep(300);
    // need to rebalance
    return;
  }
}

async function adjust(init,mailResults=false) {
  const wname = init.wname;
  const addr = init.walletAddress;
  try {
    //nodemailer.sendMail("calculateAndAdjust called","notification");
    nodemailer.init(init.email);
    nodemailer.setSubjectStartOption("Pool Protocol: ");
    //let netPosition = await calculateNetPosition(wname,addr,false,init);
    let netPosition = await calculate(init,false);
    console.log("caa1");
    let avVal = netPosition.variableValue;
    let avTokens = netPosition.variableTokens;
    let uVal = netPosition.stableValue;
    let spread = netPosition.tradeThreshold;
    let netVal = netPosition.netVal;
    const wsusd = netPosition.walletSusd;
    const wvusd = netPosition.walletVusd;
    console.log("caa2 init",init);
    let profit = netPosition.netVal - init.netValue;
    console.log("caa3",spread);
    const now = Date.now()/1000;
    const elapsed = now - init.timestamp;
    var apy = ((1+profit/init.collateral) ** ((365*24*3600)/elapsed)) *100-100;
    apy = Math.floor(apy*10)/10;
    profit = Math.floor(profit*100)/100;
    console.log("APY", apy, "elapsed", elapsed, "now",now);
    let printProfit = addCommas(profit);
    let printNetVal = addCommas(netVal,true);
    let printAvTokens = addCommas(avTokens);
    let printAvVal = addCommas(avVal,true);
    let printSpread = addCommas(spread,true);
    console.log("caa4");
    let subject;
    let body="";
    let tradeType = "default";
    const dt=new Date(init.timestamp * 1000).toLocaleString("en-US",
      {timeZone: "America/Chicago"});
    if (Math.abs(avVal) > Math.abs(spread) * ERROR_THRESHOLD )
    {
    console.log("*************************************************************");
      nodemailer.init("default");
      nodemailer.setSubjectStartOption("EMERGENCY (4): Call Lance immediately - ");
      let mtime = Math.floor(Date.now()/1000);
      subject = printAvTokens+" AVAX " + mtime;
      body += "Profit="+printProfit+", APY="+apy+"%\n";
      body += "FATAL AVAX POSITION "+printAvVal+". Net Value = "+printNetVal+"\n";
      body += " \nStarting "+dt;
      body += "\n\n"+JSON.stringify(netPosition,null,2)+"\n";
      nodemailer.sendMail(subject,body);
    }
    //xxx else if (avVal > spread * OPTIMISTIC_TRADE_THRESHOLD && wname == "lance" ||
    if (avVal > spread && avVal <= wvusd)
    {
      let mtime = Math.floor(Date.now()/1000);
      subject = "SELLING "+printAvTokens+" AVAX " + mtime;
      body += "Profit="+printProfit+", APY="+apy+"%\n";
      body += "You are LONG "+printAvVal+". Net Value = "+printNetVal+"\n";
      console.log("YOU ARE LONG AVAX! TRADING ...", wname);
      if (avVal < spread)
      {
        subject = "OPTIMISTIC SELLING "+printAvTokens+" AVAX";
        tradeType = "profit";
      }
      await inchnew.swap("WAVAX","USDC",avTokens);
      body += " \nStarting "+dt;
      body += "\n\n"+JSON.stringify(netPosition,null,2)+"\n";
      nodemailer.sendMail(subject,body);
    }
    // xxx else if (avVal < -spread * OPTIMISTIC_TRADE_THRESHOLD && wname == "lance" ||
    else if ( avVal < -spread && -avVal <= wsusd)
    {
      let printMavTokens = addCommas(-avTokens);
      let printMavVal = addCommas( -avVal, true);
      let mtime = Math.floor(Date.now()/1000);
      subject = "BUYING "+printMavVal+" of AVAX " + mtime;
      body += "Profit= "+printProfit+", APY= "+apy+"%\n";
      body += "You are SHORT "+printMavTokens+" AVAX. Net Value = "+printNetVal+"\n";
      console.log("YOU ARE SHORT AVAX!  TRADING ...");
      if (avVal > -spread)
      {
        subject = "OPTIMISTIC BUYING "+printMavVal+" of AVAX";
        tradeType = "profit";
      }
      await inchnew.swap("USDC","WAVAX",-avVal);
      body += " \nStarting "+dt;
      body += "\n\n"+JSON.stringify(netPosition,null,2)+"\n";
      nodemailer.sendMail(subject,body);
    }
    else
    {
      console.log("Your AVAX position is", avTokens);
      console.log("Your USDC position is", avVal);
      subject = "Your AVAX position is $"+avVal;
      body += "Profit="+printProfit+", APY="+apy+"%\n";
      body += "AVAX = "+printAvVal+", Net Value = "+printNetVal+", Spread = "+printSpread+"\n";
      if (mailResults)
      {
        body += " \nStarting "+dt;
        body += "\n\n"+JSON.stringify(netPosition,null,2)+"\n";
        nodemailer.sendMail(subject,body);
      }
      // xxx rebalance here
      let s;
      s = await loadWallet(netPosition,"WAVAX");
      if (s) return;
      s = await loadWallet(netPosition,"USDC");
      if (s) return;
      //await rebalance(addr,netPosition);
      await balance(netPosition);
    }
  } catch (e) {
    console.log(e.message);
    let mtime = Math.floor(Date.now()/1000);
    if (utils.isFatal(e.message))
    {
      nodemailer.init("default");
      nodemailer.setSubjectStartOption("EMERGENCY (5): Call Lance immediately - ");
    }
    nodemailer.init(init.email);
    nodemailer.setSubjectStartOption("Pool Protocol: ");
    nodemailer.sendMail("calculateAndAdjust() failed " + mtime, e.message + " => calculateAndAdjust failed");
    throw new Error(e.message+" => calculateAndAdjust failed");
  }
}

function mailPosition(netPosition,init,mailFlag = true)
{
console.log("mailPosition",netPosition,init);
  let avVal = netPosition.variableValue;
  let avTokens = netPosition.variableTokens;
  let uVal = netPosition.stableValue;
  let spread = netPosition.tradeThreshold;
  let netVal = netPosition.netVal;
  let profit = netPosition.netVal - init.netValue;
console.log("NETPOS: ", netPosition.netVal);
console.log("init: ",init.netValue);
  const now = Math.floor(Date.now()/1000);
  let elapsed = now - init.timestamp;
  var apy = ((1+profit/init.collateral) ** ((365*24*3600)/elapsed)) *100-100;
  profit = Math.floor(profit*100)/100;
  apy = Math.floor(apy*10)/10;
  elapsed = Math.floor(elapsed * 10/3600/24)/10;
  console.log("APY", apy, "elapsed days", elapsed, "now",now);
  let printProfit = addCommas(Math.floor(profit),true);
console.log("Profit=",profit,printProfit);
  let printNetVal = addCommas(netVal,true);
  let printAvTokens = addCommas(avTokens);
  let printAvVal = addCommas(avVal,true);
  let printSpread = addCommas(spread,true);
  const dt=new Date(init.timestamp * 1000).toLocaleString("en-US",
    {timeZone: "America/Chicago"});
  let subject="";
  let body="";
  subject+=printProfit+"("+Math.floor(avVal)+") "+apy+"%";
console.log(subject);
  body+="APY: "+apy+"% VariableUsd="+avVal+"\n";
  body+="Starting "+dt+"\n";
  body += "\n"+JSON.stringify(netPosition,null,2)+"\n";
  if (mailFlag)
  {
    nodemailer.init(netPosition.init.email);
    nodemailer.sendMail(subject,body);
  }
}


async function calculate(init,mailFlag=false)
{
  let wname = init.wname;
  let walletAddress = init.walletAddress;
  let trace="TRACE:";
  try
  { 
    const netPos = await getPositions(init);
    trace += "a";
    //console.log("getPositions",netPos);
    //console.log("rewardsUsd",rewardsUsd);
    
    //const tokenToPrice = await aave.getPriceOfAllTokens(walletAddress);
    trace += "b";

    let avaxUSDPrice;
    //avaxUSDPrice = await quote.oneFastQuote(wavaxAddr);
    avaxUSDPrice = maps.priceMap.get("WAVAX");
    trace += "c";
    console.log("avaxUSDPrice", avaxUSDPrice);
    let avaxPrice = BigNumber(Math.floor(avaxUSDPrice*100000000000)).mult(100000).toString();
    console.log("avaxPrice", avaxPrice);
    //maps.priceMap.set("AVAX",avaxUSDPrice);
    //maps.priceMap.set("WAVAX",avaxUSDPrice);

    let av=getIdSymbolFromArray("net","AVAX",netPos.positions);
    let avVal=BigNumber(av.amount).mult(avaxPrice).div(BigNumber(10).power(av.decimals)).div(BigNumber(10).power(8)).toString();
     console.log("avVal=",avVal);
    // avTokens is the number of AVAX tokens to two decimal places
    let avTokens=getDecimalDivision(av.amount,BigNumber(10).power(av.decimals).toString(),2);

    const wsusd=getIdSymbolFromArray("wallet","USDC",netPos.positions);
    const wvusd=getIdSymbolFromArray("wallet","WAVAX",netPos.positions);

console.log("step2");
    let u=getSymbolFromArray("usd",netPos.positions);
    // uVal = net dollar value of all stablecoin positions
    let uVal = BigNumber(u.amount).div(BigNumber(10).power(u.decimals)).toString();

console.log("step3",netPos.positions);
    let ad=getIdSymbolFromArray("aave-avalanche","WAVAX",netPos.positions);
console.log("ad",ad);
    // adVal = value of AVAX debt from Aave
    let adVal=BigNumber(ad.amount).mult(-1).mult(avaxPrice).div(BigNumber(10).power(8)).div(BigNumber(10).power(18)).toString();

console.log("step4");
    // spread is a % of Aave AVAX debt used to determine if a trade should be executed
    //let spread=BigNumber(adVal).mult(parseInt(getTradeThreshold(wname) * 1000)).div(1000).div(100).toString();
    let leverage = DEFAULT_LEVERAGE;
    if (wname == "lance")
      leverage = LANCE_LEVERAGE;
console.log("THRESHOLD",netPos.nativeExposure,leverage,getTradeThreshold(wname));
    let spread=parseInt(netPos.nativeExposure)/1000000/leverage*getTradeThreshold(wname)/100*100000000;

    // netVal is the sum of the net AVAX and USD positions
//console.log("HERE IS THE NETVAL",BigNumber(avVal).add(uVal*100000000).toString());
    let netVal = BigNumber(avVal).add(uVal*100000000).add(Math.floor(netPos.rewardsUsd*100000000)).toString();
//console.log("HERE ARE THE REWARDS BEING ADDED IN", Math.floor(netPos.rewardsUsd*100000000));
//console.log("HERE IS THE NETVAL",netVal);

console.log("Step5");
    const poolContract = await aave.getPoolContract();
    trace += "d";
    const netPosition = {
      init: init,
      avaxPrice: avaxUSDPrice,
      //poolNativePrice: netPos.poolNativePrice,
      variableValue: parseInt(avVal)/100000000,
      tradeThreshold: parseInt(spread)/100000000,
      variableTokens: avTokens,
      stableValue: uVal,
      walletVusd: wvusd.usd,
      walletSusd: wsusd.usd,
      netVal: parseInt(netVal)/100000000,
      debtRatio : await aave.getRatio(netPos.positions),
      collateral : await aave.getCollateralBase(poolContract, walletAddress)/100000000,
      //aavePositions: netPos.aavePositions,
      //alphaNumPositions: netPos.numPositions,
      //alphaPositionIds: netPos.ids,
      positions: netPos.positions,
      rewards: netPos.rewards,
      rewardsUsd: netPos.rewardsUsd,
      nativeExposure: Math.floor(parseInt(netPos.nativeExposure)/10000)/100
    }
    trace += "e";
    console.log("NET Position:",netPosition);
    mailPosition(netPosition,init,mailFlag);
    return netPosition;
  } catch (e) {
    console.log(e.message);
    nodemailer.sendMail("calculate() failed", e.message+" trace="+trace);
    throw new Error(e.message+" => calculate failed trace="+trace);
  }
}

function getDebtTradeParams(tradeType,params={})
{
  if (tradeType == "default")
  {
    if (SWAP_ATTEMPTS == 1)
    {
      params = {minThresh: 300, maxThresh: 500, seconds: 20};
    }
    else
    {
      params = {minThresh: 500, maxThresh: 700, seconds: 20};
    }
  }
  else if (tradeType == "profit")
  {
    if (SWAP_ATTEMPTS > 1)
    {
      throw new Error("Max swap attempts for optimistic trade reached = "+SWAP_ATTEMPTS);
    }
    else 
    {
      params = {minThresh: 0, maxThresh: 0, seconds: 10};
    }
  }
  else if (tradeType == "custom")
  {
  }
  else
    throw new Error("Undefined trade type "+tradeType+" in getDebtTradeParams");
  console.log("getDebtTradeParams", params);
  return params;
}

const BORROW_THRESHOLD = 0.01;

// checks that wallet has at least tokens of contract type, returns the difference
async function checkWallet(walletAddress, contract, tokens) 
{
  try {
    let wtokens = await erc20.balanceOf(
      contract,
      walletAddress
    );
    return BigNumber(wtokens).minus(tokens).toString();
  } catch (e) {
    console.log("Error checkWallet: " + e.message);
    throw new Error(e.message+" => checkWallet failed");
  }
}

function min(a,b)
{
  if (BigNumber(a).lt(b))
    return a;
  else return b;
}

// n=numerator, d=denominator, t=threshold
function checkThreshold(n,d,t)
{
  if (parseInt(BigNumber(n).mult(1000000).div(d).abs().toString()) > t * 1000000)
    return true;
  return false; 
}


// stableDiff, the target amount to be repaid should be positive
async function repay(walletAddress,idealBorrowAmount,actualBorrowAmount,
  borrowTokenSym, borrowTokenContract,borrowToken, 
  poolTokenSym,poolToken, targetRepayAmount, borrowPoolContract)
{
  try {
      console.log("REPAY coins from aave", targetRepayAmount);
      // if amount in wallet is enough then continue
      // else
      //   swap pool for borrow token
      
      // calculate if there are enough tokens in the wallet.
      // if number is negative, swap is required
      let tokenDeficit = await checkWallet(walletAddress, borrowTokenContract,targetRepayAmount);
console.log("compare tokenDeficit",tokenDeficit, targetRepayAmount, BORROW_THRESHOLD);
      if (BigNumber(tokenDeficit).lt(0) && checkThreshold(tokenDeficit,targetRepayAmount,BORROW_THRESHOLD))
      { 
        tokenDeficit = BigNumber(tokenDeficit).mult(-1).toString(); 
        console.log("not enough", borrowTokenSym, "in wallet, swapping", tokenDeficit);
        console.log("SWAPPING",tokenDeficit);
        await inch.swap(
          poolToken,
          borrowToken,
          tokenDeficit,
          walletAddress
        );
        let mtime = Math.floor(Date.now()/1000);
        let subject = "pool.js repay() " + mtime;
        let body = "Repaying\n";
        body += "Swapping poolToken, borrowToken, tokenDeficit, walletAddress: " + 
          poolToken + " " + borrowToken + " " + tokenDeficit + " " + walletAddress + "\n";
        nodemailer.sendMail(subject,body);
      }
      else
      { 
        console.log("enough coins found");
      }
      let borrowTokenBal = await erc20.balanceOf(borrowTokenContract,walletAddress);
      let repayAmount = min(borrowTokenBal,targetRepayAmount);
console.log("borrowTokenBal", borrowTokenBal);
console.log("targetRepayAmount", targetRepayAmount); 
console.log("idealBorrowAmount", idealBorrowAmount);
console.log("REPAYING", repayAmount);
//console.log(borrowPoolContract,borrowTokenContract,borrowToken,targetRepayAmount,walletAddress);
      await aave.repay(
        borrowPoolContract,
        borrowTokenContract,
        borrowToken,
        repayAmount,
        walletAddress
      );
  } catch (e) {
    console.log("Error repay: " + e.message);
    throw new Error(e.message+" => repay failed");
  }
}

// if wallet native tokens are below the min reserve, then set to reserve amount
// if there is a deficit, then the supplyToken is traded for native tokens
async function checkAndReloadWallet(walletAddress,supplyToken)
{
  try
  {
    bal = await wall.getBalance(walletAddress);
    console.log("checking wallet balance", bal, wall.MIN_WALLET_RESERVE);
    if (BigNumber(bal).gt(wall.MIN_WALLET_RESERVE))
      return;
    const price = maps.priceMap.get("WAVAX");
    let diff = BigNumber(wall.NATIVE_WALLET_RESERVE).minus(bal).toString();
    //console.log("diff=",diff);
    diff = BigNumber(diff).mult(Math.floor(price*10000000)).div(10000000).div(BigNumber(10).pow(12)).toString();
    //console.log("diff=",diff);
    //console.log("swapping to reload wallet price=",price,diff);
    //return;
    await inch.swap(
      supplyToken,
      "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      diff,
      walletAddress
    );
  } catch(e) {
    console.log("Error checkAndReloadWallet: " + e.message);
    throw new Error(e.message+" => checkAndReloadWallet failed");
  }
}

async function convertNativeTokens(walletAddress, toToken)
{
  try {
    console.log("swapping from native tokens to pool tokens");
    tokens = wall.getSpendableBalance(walletAddress);
    if (BigNumber(tokens).gt(0))
    {
      await inch.swap(
         "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        toToken,
        tokens,
        walletAddress 
      );
    }
  } catch (e) {
    console.log("Error convertNativeTokens: " + e.message);
    throw new Error(e.message+" => convertNativeTokens failed");
  }
}

async function convertTokens(walletAddress, contract, fromToken, toToken)
{
  try {
    tokens = await erc20.balanceOf(contract,walletAddress);
    console.log("swapping from borrow tokens to pool tokens",tokens);
    if (BigNumber(tokens).gt(0))
    {
      await inch.swap(
        fromToken,
        toToken,
        tokens,
        walletAddress 
      );
    }
  } catch (e) {
    console.log("Error convertTokens: " + e.message);
    throw new Error(e.message+" => convertTokens failed");
  }
}

// xxx add another set of params for what tokens the swap pool requires
// that will handle the wrap/unwrap case that michael covered
async function balanceTokens(walletAddress,
      stableTokenSym, stableTokenContract, stableToken,
      variableTokenSym, variableTokenContract, variableToken)
{
  try {
    console.log("balanceTokens",walletAddress,stableTokenSym,variableTokenSym);
    let quoteToken = variableToken;
    console.log("variableTokenSym",variableTokenSym);
    let bval;
    if (avax.isNative(variableTokenSym))
    {
      console.log("getting spendable balance");
      bval = await wall.getSpendableBalance(walletAddress);
      quoteToken = maps.addressMap.get("WAVAX");
    }
    else 
    {
      bval = await erc20.balanceOf(variableTokenContract, walletAddress);
    }
    console.log("variableToken", variableToken);
    busd = BigNumber(await aave.convertToUSD(quoteToken, bval ,walletAddress)).div(BigNumber(10).pow(12)).toString();
    susd = await erc20.balanceOf(stableTokenContract, walletAddress);
    diff = (BigNumber(busd).minus(susd)).div(2).toString();
    console.log("busd",busd,"susd",susd,"diff",diff);
    if (checkThreshold(diff,busd,BORROW_THRESHOLD))
    {
      if (BigNumber(diff).gt(0))
      {
        // xxx need to handle decimals
        // xxx USDC hard coded
        var amt = diff;
        console.log("amt",amt);
        let tokens = await aave.convertFromTokenToToken(
          "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC - must be stablecoin supported by aave
          quoteToken,
          //BigNumber(diff).mult(BigNumber(10).pow(12)).toString(),
          amt,
          walletAddress
        );

        console.log("SWAPPING for USD", tokens);
        await inch.swap(
          variableToken,
          stableToken,
          tokens,
          walletAddress 
        );
      }
      else
      {
        const amt = BigNumber(diff).mult(-1).toString();
        console.log("SWAPPING for AVAX", amt);
        await inch.swap(
          stableToken,
          variableToken,
          amt,
          walletAddress 
        );
      }
    }
  } catch (e) {
    console.log("Error balanceTokens: " + e.message);
    throw new Error(e.message+" => balanceTokens failed");
  }
}

async function leverDeposit(walletAddress,poolStableToken,poolVariableToken,
  factoryContract, bankContract,swapPoolAddress, lpTokens)
{
  try {
    console.log("depositing liquidity to alpha",poolStableToken,poolVariableToken);
    console.log("deposit lpTokens",lpTokens,"swapPoolAddress",swapPoolAddress);
    //throw Error();
    //const lpContract = await erc20.getContract(lpTokens);
    //const amtLP = await erc20.balanceOf(lpContract, walletAddress);
    const panPoolData = await pan.getPoolTokens("pooltokens", swapPoolAddress, lpTokens);
    console.log(panPoolData.positions[0].amount);
    const stableAlphaBorrowAmount = Math.floor(
      BigNumber(panPoolData.positions[0].amount).mult(18).div(10)
    ).toString();
console.log(stableAlphaBorrowAmount);
    const variableAlphaBorrowAmount = Math.floor(
      BigNumber(panPoolData.positions[1].amount).mult(18).div(10)
    ).toString();
    // throw Error("pass");
    console.log("before bankDeposit",
      walletAddress,
      poolStableToken,
      stableAlphaBorrowAmount,
      poolVariableToken,
      variableAlphaBorrowAmount,
      "amount LP " + lpTokens
    );
    await alpha.bankDeposit(
      bankContract,
      walletAddress,
      poolStableToken,
      "0",
      stableAlphaBorrowAmount,
      BigNumber(stableAlphaBorrowAmount).mult(97).div(100).toString(),
      poolVariableToken,
      "0",
      variableAlphaBorrowAmount,
      BigNumber(variableAlphaBorrowAmount).mult(97).div(100).toString(),
      lpTokens,
      0,
      9
    );
  } catch (e) {
    console.log("Error leverDeposit: " + e.message);
    throw new Error(e.message+" => leverDeposit failed");
  }
}


/*
async function main() {
  try {
    var wname = "default";
    if (process.argv.length >= 3) {
      wname = process.argv[2];
    }
    wallet = await wall.init(wname);
    const poolContract = await aave.getPoolContract();
    const debt = await aave.getDebtRatio(poolContract, wallet.address);
    console.log(debt);
    //await nodemailer.init(wname);
    //  await calculateAndAdjust(wname, wallet.address, false);
    await calculateNetPosition(wname, wallet.address);
    //await adjustDebt("USDC", 25.7, "WAVAX", wallet.address);
    const bankContract = await alpha.getBankContract();
    await adjustPosition(
      wname,
      wallet.address,
      "11879",
      "USDC",
      "WAVAX",
      "USDC.e",
      "AVAX"
    );

    // await alpha.bankWithdraw(wname, bankContract, "11969", wallet.address);
  } catch (e) {
    console.log(e.message);
  }
}

main()
*/

module.exports = Object.assign({
  adjust,
  loadWallet,
  unloadWallet,
  expandPoolPositions,
  balance,
  calculate
});
