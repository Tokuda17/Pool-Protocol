const BigNumber = require("big-number");
const user = require("./userOp.js");
const unic = require("./unicache.js");
const univ3 = require("./univ3.js");
const quote = require("./quote.js");
const wall = require("./wallet.js");
const erc20 = require("./erc20.js");
const maps = require("./maps.js");
const inch = require("./1inch.js");
const nodemailer = require("./nodemailer.js");

const USDC_ADDRESS = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
async function init()
{
  let tokenAddresses = [
      WETH_ADDRESS, // weth
      USDC_ADDRESS, // usdc
    ];
  await erc20.initMaps(tokenAddresses);
  let q = await quote.oneFastQuote(ETH_ADDRESS,10);
  maps.priceMap.set("ETH",q);
}

function isStablecoin(sym)
{
  return ["USDC","USDT"].includes(sym.toUpperCase());
}

function isNativeEquivalent(sym)
{
  return ["ETH","WETH"].includes(sym.toUpperCase());
}

async function sell(wname,vamt,pos,walletAddress)
{
  try {   
    let vamount = BigNumber(Math.floor(vamt*1000000)).mult(BigNumber(10).pow(18-6)).toString();
console.log("SELLING vamount=",vamount,"vamt",vamt);
    await inch.swap(WETH_ADDRESS,USDC_ADDRESS,vamount,walletAddress);
    let now = Math.floor(Date.now()/1000);
    let subject = "Sell($"+Math.floor(vamt*pos.quote)+") of ETH "+now;
    let body = "Selling "+vamt+" ETH\n\n";
    let json = JSON.stringify(pos,null,2);
    body += json+"\n\n";
    let newpos = await getPositions(wname, walletAddress);
    json = JSON.stringify(newpos,null,2);
    body += json;
    nodemailer.sendMail(subject,body);
    unic.saveFile("update",wname,subject+" "+body);

  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => sell() failed");
  }
}
async function buy(wname,vusd,pos,walletAddress)
{
  try {   
    let samount = Math.floor(vusd * 1000000);
console.log("BUYING vusd", vusd, 'samount',samount);
    await inch.swap(USDC_ADDRESS,WETH_ADDRESS,samount,walletAddress);
    let now = Math.floor(Date.now()/1000);
    let subject="Buy($"+Math.floor(vusd)+") of ETH "+now;
    let body = "Buying $"+vusd+"\n\n";
    let json = JSON.stringify(pos,null,2);
    body += json+"\n\n";
    let newpos = await getPositions(wname, walletAddress);
    json = JSON.stringify(newpos,null,2);
    body += json;
    nodemailer.sendMail(subject,body);
    unic.saveFile("update",wname,subject+" "+body);
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => buy() failed");
  }
}

function getUsd(pos,tid)
{
  let usd=0;
  for(let i=0;i<pos.length;i++)
  {
    if (pos[i].id == tid)
    {
      usd += pos[i].usd;
    }
  }
  return usd;
}

async function defundPosition(wname,walletAddress,pos)
{
  let positions = pos.positions;
  let upos = [];
  let tick = univ3.getTickFromPrice(pos.quote);
  let lowerTick = univ3.findLowerTick(tick);
console.log("quote",pos.quote,"lowerTick",lowerTick,"lowerTickPrice",univ3.getTickPrice(lowerTick));
  for(let i=0;i<positions.length;i++)
  {
    //console.log("Checking pos", i, positions[i]);
    if (!isNaN(positions[i].id))
    {
      if (positions[i].tickLower == lowerTick)
      {
        console.log("skipping active span",lowerTick);
        continue;
      }
      upos.push(positions[i]);
      console.log("FOUND number id",positions[i].id);
    }
  }
  let maxDistance=0;
  let maxTid;
  let d;
  for(let i=0;i<upos.length;i++)
  {
    if (upos[i].tickLower < lowerTick)
      d = tick - upos[i].tickLower - univ3.SPAN;
    else 
      d = upos[i].tickLower - tick;
    console.log("dist",d,"pos",upos[i], "tick",tick,"SPAN",univ3.SPAN);
    if (d > maxDistance)
    {
      maxDistance = d;
      maxTid = upos[i].id;
    }
  }
console.log("defund",maxTid);
  if (d > 0)
    return maxTid;
  return false;
}

const SPAN_VALUE = 10000;
const TRADE_THRESHOLD = SPAN_VALUE*0.2;
const ADJUST_THRESHOLD = 0.9;
async function fundPositions(wname,walletAddress,pos,tries)
{
  try {   
console.log("FUND POSITIONS");
    let p = pos.quote;
    let tick = univ3.getTickFromPrice(p);
    let {lowerNut,upperNut} = univ3.findTicks(tick);
    let pl = univ3.getTickPrice(lowerNut);
    let pu = univ3.getTickPrice(upperNut);
    let liq = univ3.lookupLiquidity(lowerNut);
    console.log("lowerNut",lowerNut,"tick",tick,"liq",liq,"Price Low",pl,"Price",p,"Price Up",pu);
    if (liq === undefined)
    {
      console.log("MINT", lowerNut,tick);
      let c = await univ3.getContract();
      await univ3.mint(c, walletAddress, lowerNut, SPAN_VALUE);
      let now = Math.floor(Date.now()/1000);
      let subject = "Minting at "+lowerNut+" Price="+pl+" "+now;
      let body = "Upper="+pu+" liquidity="+liq+"\n\n";
      let json = JSON.stringify(pos,null,2);
      body += json+"\n\n";
      let newpos = await getPositions(wname, walletAddress);
      json = JSON.stringify(newpos,null,2);
      body += json;
      nodemailer.sendMail(subject,body);
      unic.saveFile("update",wname,"Minting");
      //await calculateAndAdjust(wname, walletAddress,tries+1);
    }
    else
    {
      let tid = univ3.lookupLowTick(lowerNut);
      let usd = getUsd(pos.positions,tid);
      console.log("USD for existing position",tid,"=",usd);
      if (usd < SPAN_VALUE * ADJUST_THRESHOLD)
      {
        console.log("ADJUST LIQUIDITY", tid, SPAN_VALUE-usd);
        let c = await univ3.getContract();
        await univ3.increaseLiquidity(wname,c, walletAddress, tid, SPAN_VALUE-usd);
        let now = Math.floor(Date.now()/1000);
        let subject = "Increasing liqiudity at "+lowerNut+" Price="+pl+" "+now;
        let body = "Increasing by "+(SPAN_VALUE-usd)+"\n\n";
        let json = JSON.stringify(pos,null,2);
        body += json+"\n\n";
        let newpos = await getPositions(wname, walletAddress);
        json = JSON.stringify(newpos,null,2);
        body += json;
        nodemailer.sendMail(subject,body);
        unic.saveFile("update",wname,"Increasing liquidity");
        //await calculateAndAdjust(wname, walletAddress,tries+1);
      }
      else
      {
        console.log("HOLD POSITION", tid,lowerNut,tick);
        let json = JSON.stringify(pos,null,2);
        unic.saveFile("update",wname,"Holding position"+"\n\n"+json+"\n");
      }
    }
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => fundPositions() failed");
  }
}
function printMap(name, map) {
  console.log(name);
  map.forEach((value, key) => {
    console.log(key, value);
  });
}

async function calculateAndAdjust(wname, walletAddress,tries=0)
{
  try {
    nodemailer.initEmailTo("op");
    newpos = await getPositions(wname, walletAddress);
console.log("VUSD",newpos.netVusd,"threshold",TRADE_THRESHOLD);
console.log("balance vusd < -thresh",newpos.netVusd < -TRADE_THRESHOLD);
    if (parseFloat(newpos.netVusd) > TRADE_THRESHOLD)
    {
      await sell(wname, newpos.netVamt, newpos, walletAddress);
      //await calculateAndAdjust(wname, walletAddress,tries+1);
    }
    else if (parseFloat(newpos.netVusd) < -TRADE_THRESHOLD)
    {
      await buy(wname, -newpos.netVusd, newpos, walletAddress);
      //await calculateAndAdjust(wname, walletAddress,tries+1);
    }
    else
    {
      await fundPositions(wname,walletAddress,newpos,tries);
    }
  } catch (e) {
    console.log(e.message);
    nodemailer.sendMail("calculateAndAdjust() failed", e.message);
    throw new Error(e.message+" => calculateAndAdjust failed");
  }
}

async function getPositions(wname, walletAddress)
{
  try {
    await init();
    let pos=[];
    let npos;
    let initValue = user.getInit();
    let startVamt = parseFloat(initValue.vamt);
    let vusd;
    let price = maps.priceMap.get("ETH");
    let startSusd = initValue.susd;
    let vamount = BigNumber(Math.floor(startVamt*1000000)).mult(-BigNumber(10).pow(12)).toString();
    npos = await wall.getPositions(walletAddress, maps.addressMap);
    pos = pos.concat(npos);
    //console.log(pos);
    npos = await univ3.getPositions(wname,walletAddress);
    pos = pos.concat(npos);
    //console.log(pos);
    let susd=0;
    vusd=0;
    let q;
    for(let i=0;i<pos.length;i++)
    {
      if (isStablecoin(pos[i].symbol))
      {
        susd += pos[i].usd;
      }
      else if (isNativeEquivalent(pos[i].symbol))
      {
        vusd += pos[i].usd;
        q = pos[i].quote;
      }
      else
      {
        throw new Error("Unknown coin in getPositions");
      }
    }
    let tick = univ3.getTickFromPrice(q);
    let {lowerNut,upperNut} = univ3.findTicks(tick);

    let newpos = {
      profit: vusd-startVamt*q+susd-startSusd,
      netVusd: vusd-startVamt*q,
      netVamt: vusd/q-startVamt,
      netSusd: susd-startSusd,
      vusd: vusd, 
      vamt: vusd/q, 
      susd: susd, 
      quote: q, 
      tick: tick,
      lowerNut: lowerNut,
      lowerPrice:univ3.getTickPrice(lowerNut),
      upperNut: upperNut,
      upperPrice:univ3.getTickPrice(upperNut),
      starttime: initValue.timestamp, 
      now: Math.floor(Date.now()/1000), 
      collateral: initValue.collateral,
      positions: pos
    };
console.log(newpos);
    return newpos;
  } catch (e) {
    console.log(e.message);
    nodemailer.sendMail("getPositions() failed", e.message);
    throw new Error(e.message+" => getPositions failed");
  }
}

async function calculateNetPosition(wname,walletAddress)
{
  try 
  {  
    nodemailer.initEmailTo("op");
    const newpos = await getPositions(wname,walletAddress);
    let subject="";
    if (newpos.netVusd > TRADE_THRESHOLD)
      subject="SELLING " + Math.floor(newpos.netVamt*100)/100 + " ETH " + newpos.now;
    else if (newpos.netVusd < -TRADE_THRESHOLD)
      subject="BUYING " + Math.floor(-newpos.netVamt*100)/100 + " ETH " + newpos.now;
    else
      subject="Your ETH position is " + Math.floor(newpos.netVamt*100)/100 + " " + newpos.now;
    let body="";
    let profit = Math.floor((newpos.netVusd+newpos.netSusd)*100)/100;
    let apy =  Math.floor(((1+(newpos.netVusd+newpos.netSusd)/newpos.collateral) ** ((365*24*3600)/(newpos.now-newpos.starttime)) * 100-100)*10)/10;
    body += "Profit="+profit+", APY="+apy+"%\n";
    const dt=new Date(newpos.starttime * 1000).toLocaleString("en-US",
      {timeZone: "America/Chicago"});
    body += "\nStarting "+dt;
    body += "\n\n"+JSON.stringify(newpos,null,2)+"\n";
console.log(body);
    console.log("    timestamp: "+newpos.now+",");
    console.log("    susd: "+newpos.susd+",");
    console.log("    vamt: "+newpos.vamt+",");
    console.log("    collateral: "+newpos.collateral+"\n");
    nodemailer.sendMail(subject,body);
  } catch (e) {
    console.log(e.message);
    nodemailer.sendMail("calculateNetPosition() failed", e.message);
    throw new Error(e.message+" => calculateNetPosition failed");
  }
}

/*
async function main()
{
  const wname = "lance";
  let wallet = await wall.initWallet(wname,"op");
  let newpos = await getPositions(wname,wallet.address);
  //await calculateNetPosition(wname,wallet.address);
  await calculateAndAdjust(wname,wallet.address);
  let c = await univ3.getContract();
  //await univ3.removeLiquidity(c,wallet.address,344945);
  //await univ3.removeLiquidity(c,wallet.address,344944);
  //await univ3.removeLiquidity(c,wallet.address,344939);
}

main();
*/

module.exports = Object.assign({
  getPositions,
  defundPosition,
  calculateNetPosition,
  calculateAndAdjust
});     

