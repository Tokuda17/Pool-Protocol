/*
This version works for Uniswap V3.  

It calculates the position once then spends time checking just the tick for the pool to see if
it hit the trading threshold.  If it did, a trade is triggered.

Caching notes:
  ./cache/chain/wallet/weth.json stores the last wallet WETH value prior to any changes
  poolOp.addPositionChanges() checks that the next WETH value is either higher or lower
    after a change has taken place.  The new value is stored in the cache
  poolOp.getPositions - after calling poolOp.getPositions, the value of pos.wallet.weth should
    be compared with the value in cache

  liquidity positions are cached by Uniswap index id
  removing, adding, minting need to update the Uniswap index id entry

  ethquotes - stores multiple eth quotes from eth, avax, poly, and op chains
*/

const BigNumber = require("big-number");
const utils = require("./utils.js");
const unic = require("./unicache.js");
const chain = require("./chain.js");
const univ3 = require("./univ3.js");
const quote = require("./quote.js");
const wall = require("./wallet.js");
const tjliq = require("./traderjoeliq.js");
const erc20 = require("./erc20.js");
const maps = require("./maps.js");
const inch = require("./1inchnew.js");
const web = require("./web3.js");
const web3 = web.web3;
const nodemailer = require("./nodemailer.js");
const ankr = require("./ankr.js");

let USDC_ADDRESS;
let WETH_ADDRESS;
let ETH_ADDRESS;
let MATIC_ADDRESS;

const ADJUST_THRESHOLD = 0.9;
const WALLET_ETH_MIN = 0.3;
const WALLET_ETH_BUFFER = 1;
const WALLET_MATIC_BUFFER = 10;
const WALLET_MATIC_MIN = 2;
const TRADING_WETH_BUFFER = 10000;

async function init(port,ch=false,callfrom=false)
{
  if (!ch)
    ch = port.tj.chain;
  console.log("init ch=",ch);
  await web.init(ch);
  await wall.initPort(port,ch);
  console.log("port=",port);
  let tokens;
  if (!ch)
    ch = web3.chain;
  if (ch == 'op')
  {
    tokens = [
      {
        symbol: "OP",
        address: "0x4200000000000000000000000000000000000042",
        cgid: 'optimism'
      },
      {
        symbol: "WETH",
        address: "0x4200000000000000000000000000000000000006",
        cgid: 'ethereum'
      },
      {
        symbol: "ETH",
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        cgid: 'ethereum'
      },
      {
        symbol: "USDC",
        address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
        cgid: 'usd-coin'
      }
    ];
  }
  else if (ch == 'avax')
  {
    tokens = [
      {
        symbol: "AVAX",
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        cgid: 'avalanche-2'
      },
      {
        symbol: "WAVAX",
        address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
        cgid: 'avalanche-2'
      },
      {
        symbol: "WETH.E",
        address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
        cgid: 'ethereum'
      },
      {
        symbol: "USDC",
        address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        cgid: 'usd-coin'
      }
    ];
  }
  else
    throw new Error("Unsupported chain in init()");
  let tokenAddresses = [];
  for (let i=0;i<tokens.length;i++)
  {
    tokenAddresses[i] = tokens[i].address;
  }
  console.log("poolV3.init() initMaps()");
  await erc20.initMaps(tokenAddresses);
  console.log("poolV3.init() loadCgQuotes()");
  await quote.loadCgQuotes(tokens);
  //await univ3.init(port.tj.pair.span,port.tj.pair.spacing,port.tj.pair.poolFee);
  if (port.email)
  {
    if (typeof port.email === 'string')
    {
      nodemailer.init(port.email);
    }
  }
}

function checkPositions(pos)
{
  let positions = pos.positions;
  for(let i=0;i<positions.length;i++)
  {
    //console.log("Checking pos", i, positions[i]);
    if (!isNaN(positions[i].id))
    {
      console.log("FOUND number id",positions[i].id);
    }
  }
  return 0;
}

function getWallet(port,ch)
{
  for (let i=0;i<port.wallets.length;i++)
  {
    if (port.wallets[i].chain == ch)
      return port.wallets[i];
  }
  return false;
}

async function managePoly(port)
{
  try {
    let pos = port.snapshot;
    let c = utils.checkWallet(pos.positions,"MATIC","poly");
//console.log("getSpendableBalance=",c);
    c = parseInt(BigNumber(c).div(BigNumber(10).pow(18-6)).toString())/1000000;
//console.log("Comparing MATIC=",c," with WALLET_MATIC_BUFFER");
    if (c < WALLET_MATIC_MIN)
    {
      let q = await quote.oneFastQuote(chain.getAddress("MATIC"),"poly");
      let amt = (WALLET_MATIC_BUFFER - c) * q;
      amt = Math.floor(amt * 1000000);
      await init(port,"poly");
      let w = getWallet(port,"poly");
      let r = await inch.swap(USDC_ADDRESS,MATIC_ADDRESS,amt,w.walletAddress);
      if (!r)
        throw new Error("Not enough USDC to covert to MATIC");
      let body = "MATIC total increasing\n";
      body += await addPositionChanges(port,"poly",false,"down","managePoly.addMATIC");
      nodemailer.sendMail("Swapping USDC for MATIC",body);
      return true;
    }
    return false;
  } catch (e) {
    console.log(e.message," in managePoly()");
    throw new Error(e.message+" => managePoly() failed");
  }
}
async function manageOp(port)
{
  try {
    let pos = port.snapshot;
console.log("manageOp",port.walletAddress);
    //let c = utils.checkWallet(pos.positions,"ETH");
    let c = await wall.getBalance(port.walletAddress);
console.log("c=",c);
    c = parseInt(BigNumber(c).div(BigNumber(10).pow(18-6)).toString())/1000000;
console.log("c2=",c);
    let wc = utils.checkWallet(pos.positions,"WETH");
    console.log("ETH",c,WALLET_ETH_MIN);
    console.log("WETH",wc,WALLET_ETH_BUFFER);
    // if ETH is below MIN threshold, then add to BUFFER amount
    if (c < WALLET_ETH_MIN && wc > WALLET_ETH_BUFFER)
    {
      let amt = WALLET_ETH_BUFFER-c;
      console.log("amt from weth to eth", amt);
      //amt = BigNumber(Math.floor(amt*1000000)).mult(BigNumber(10).pow(18-6)).toString();
      console.log("Buying amt from weth to eth", amt);
      let w = getWallet(port,"op");
      let r = await inch.swap("WETH","ETH",amt,w.walletAddress);
      if (!r)
        throw new Error("Not enough WETH to convert to ETH");
      let body = "ETH total increasing\n";
      body += await addPositionChanges(port,"op","down",false,"manageOp.addETH");
      nodemailer.sendMail("Swapping WETH for ETH",body);
      return true;
    }
    return false;
  } catch (e) {
    console.log(e.message," in manageOp()");
    throw new Error(e.message+" => manageOp() failed");
  }
}

async function defundPosition(port,all=false)
{
  try {
    console.log("defundPosition");
    await init(port,port.tj.chain,"defund");
console.log("before removeLiquidity",port.snapshot.positions);
    const status = await tjliq.removeLiquidity(port);
    if (!status)
      return false;
    let body = "Defunding\n";
    body += await addPositionChanges(port,port.tj.chain,"gte","gte","defundPosition");
    nodemailer.sendMail("Defunding position",body);
    return true;
  } catch (e) {
    console.log(e.message," in defundPosition()");
    throw new Error(e.message+" => defundPosition() failed");
  }
}

async function sell(port,amt=false,slippage=false,ratio=false)
{
  try {   
    let vsym = port.tj.pair.vsym;
    let ssym = port.tj.pair.ssym;
    let pos = port.snapshot;
    let vamt = pos.netVamt;
    if (amt)
    {
      vamt = amt;
    }
console.log("SELLING vamt=",vamt,port.tj.address);
    let samt=false;
    let opt = " notOpt "
    if (slippage !== false)
    {
      samt = vamt / pos.quote * (1-slippage);
      opt = "OPTIMISTIC ";
    }
console.log("swap",vsym,ssym,vamt,port.tj.address);
    let r = await inch.swap(vsym, ssym, vamt,port.tj.address);
    if (!r) return false;
    let ch = chain.getChain();
    let f = r.fusion;
    let now = Math.floor(Date.now()/1000);
    let profit = Math.floor((pos.netVusd+pos.netSusd)*100)/100;
    let subject = "Profit="+profit+" sell($"+Math.floor(vamt*maps.priceMap.get(vsym.toUpperCase()))+") "+opt+ch+" f="+f+" "+now;
    let apy =  Math.floor(((1+(pos.netVusd+pos.netSusd)/port.tj.pair.value) ** ((365*24*3600)/(pos.now-pos.starttime)) * 100-100)*10)/10;
    let body = "Profit="+profit+", APY="+apy+"%\n";
    body += "Selling "+vamt+" "+vsym+" on chain="+ch+" fusion="+f+"\n\n";
    body += await addPositionChanges(port,ch,"down","up","sell");
    body += "\nbuysell\n";
    nodemailer.sendMail(subject,body);
    //unic.saveFile("update",wname,subject+" "+body);
    return true;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => sell() failed");
  }
}
async function buy(port,amt=false,slippage=false,ratio=false)
{
  try {   
    let vsym = port.tj.pair.vsym;
    let ssym = port.tj.pair.ssym;
    let pos = port.snapshot;
    let vusd = -pos.netVusd;
    let samt = vusd/maps.priceMap.get(ssym.toUpperCase());
    if (amt)
    {
      samt = amt;
    }
    let vamt=false;
    let opt = " notOpt "
    if (slippage !== false)
    {
      vamt = vusd / maps.priceMap.get(vsym.toUpperCase()) * (1-slippage);
      opt = "OPTIMISTIC ";
    }
console.log("BUYING vusd", vusd, vsym,samt);
    let r = await inch.swap(ssym, vsym, samt,port.tj.address);
console.log("swap success");
    if (!r) return false;
    let ch = chain.getChain();
    let f = r.fusion;
    let now = Math.floor(Date.now()/1000);
    let profit = Math.floor((pos.netVusd+pos.netSusd)*100)/100;
    let subject = "Profit="+profit+" buy($"+Math.floor(vusd)+") "+opt+ch+" f="+f+" "+now;
    let apy =  Math.floor(((1+(pos.netVusd+pos.netSusd)/port.tj.pair.value) ** ((365*24*3600)/(pos.now-pos.starttime)) * 100-100)*10)/10;
    let body = "Profit="+profit+", APY="+apy+"%\n";
    body += "Buying "+samt+" "+ssym+" on chain="+ch+" fusion="+f+"\n\n";
    body += await addPositionChanges(port,ch,"up","down","buy");
    body += "\nbuysell\n";
    nodemailer.sendMail(subject,body);
    //unic.saveFile("update",wname,subject+" "+body);
    return true;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => buy() failed");
  }
}

function prunePositions(pos)
{
  let npos=[];
  for(let i=0;i<pos.positions.length;i++)
  {
    if (!isNaN(pos.positions[i].id) && pos.positions[i].liquidity == 0)
    {
      //console.log("SKIPPING pos",pos.positions[i]);
      continue;
    }
    else if (String(pos.positions[i].id).search("fees-")>=0 && pos.positions[i].usd == 0)
    {
      //console.log("SKIPPING pos",pos.positions[i]);
      continue;
    }
    npos.push(pos.positions[i]);
  }
  pos.positions = npos;
  return pos;
}

async function addPositionChanges(port,ch,vdir,sdir,callfrom)
{
  let trace = "a";
  let retries = 0;
  let vsym = port.tj.pair.vsym;
  let ssym = port.tj.pair.ssym;
  let MAX_RETRIES = 12;
  try {
console.log("addPosChanges 1");
    let pos = port.snapshot;
    let s = JSON.stringify(pos,null,2)+"\n\n";
    let wweth0;
    let usdc0;
    wweth0 = utils.checkWallet(pos.positions,vsym,ch);
    usdc0 = utils.checkWallet(pos.positions,ssym,ch);
console.log("addPosChanges 2");
    if (vdir)
    {
      let w = {wweth: wweth0, callfrom: callfrom};
      w.direction = vdir;
      unic.writeTagId("wallet","weth",w,ch);
    }
console.log("addPosChanges 3");
    if (sdir)
    {
      let w = {susd: usdc0, callfrom: callfrom};
      if (sdir)
      w.direction = sdir;
      unic.writeTagId("wallet","susd",w,ch);
    }
console.log("addPositionChanges",wweth0,pos,usdc0);
    let wweth1;
    let usdc1;
    let tries = 0;
    let newpos;
    const MAX_TRIES = 12;
console.log("addPositionChanges direction=",vdir);
    while (true)
    {
console.log("TRIES=",MAX_TRIES," RETRIES=",MAX_RETRIES);
console.log("=====================================================================================");
      trace = trace+"b";
      try {
        while (true)
        {
console.log("getPositions()", tries);
console.log("X====================================================================================");
utils.sleep(10);
          newpos = await getPositions(port);
console.log("addPosChanges 4");
          break;
        } 
      } catch (e) {
console.log("getPositions() error");
console.log("Y====================================================================================");
        retries++
        if (retries < MAX_RETRIES)
        { 
          if (utils.shouldRetry(e.message))
          { 
            continue;
          }
        } 
        throw new Error(e.message+" failed in while loop for getPositions()");
      }
      wweth1 = utils.checkWallet(newpos.positions,vsym,ch);
      usdc1 = utils.checkWallet(newpos.positions,ssym,ch);
console.log("addPositionChanges",wweth0,wweth1,usdc0,usdc1,newpos,ch);
      trace = trace+"c";
      //newpos = prunePositions(newpos);
      trace = trace+"d";
      if (vdir == "up" && wweth1 <= wweth0 || 
          vdir == "gte" && wweth1 < wweth0 || 
          vdir == "lte" && wweth1 > wweth0 || 
          vdir == "down" && wweth1 >= wweth0 ||
          sdir == "up" && usdc1 <= usdc0 || 
          sdir == "gte" && usdc1 < usdc0 || 
          sdir == "lte" && usdc1 > usdc0 || 
          sdir == "down" && usdc1 >= usdc0 ||
          (vdir == "lte" && sdir == "lte" && (wweth1 >= wweth0 && usdc1 >= usdc0)) ||
          (vdir == "gte" && sdir == "gte" && (wweth1 <= wweth0 && usdc1 <= usdc0)))
      {
console.log("addPosChanges 5");
        trace = trace+"e";
        tries++;
        let poss = JSON.stringify(pos,null,2)+"\n";
        poss += JSON.stringify(newpos,null,2)+"\n";
        if (tries >= MAX_TRIES)
        {
console.log("addPosChanges 6");
          s = "tries="+tries+" wweth0="+wweth0+" wweth1="+wweth1+" vdir="+vdir+" usdc0="+usdc0+" usdc1="+usdc1+" sdir="+sdir+"\n check failed\n\n"+s;
          throw new Error("addPositionChange() failed "+s+" trace="+trace);
        }
        if (tries == 1)
        {
console.log("addPosChanges 7");
          nodemailer.sendMail(
            "WETH wallet error: "+callfrom+" ch="+ch+" "+pos.now,
            "Detected bad WETH or USDC "+
            " wweth0="+wweth0+" wweth1="+wweth1+" vdir="+vdir+" usdc0="+usdc0+" usdc1="+usdc1+" sdir="+sdir+
            " trace="+trace+" tries="+tries+"\n\n"+poss);
        }
        //throw new Error("addPositionChange wweth0="+wweth0+" wweth1="+wweth1+" trace=",trace);
        await utils.sleep(12);
        trace = trace+"f";
        continue;
      }
      s += JSON.stringify(newpos,null,2)+"\n";
      break;
    }
console.log("addPosChanges 8");
    trace = trace+"g";
    let ww = {wweth: wweth1, oldweth: wweth0, olddir: vdir, callfrom: callfrom};
    let ws = {susd: usdc1, oldsusd: usdc0, olddir: sdir, callfrom: callfrom};
    trace = trace+"h";
    unic.writeTagId("wallet","weth",ww,ch);
    unic.writeTagId("wallet","susd",ws,ch);
    trace = trace+"i";
    port.snapshot = newpos;
console.log("addPosChanges 9");
    return s;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" trace="+trace+" => addPositionChanges() failed");
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


function findNonzeroLiquidity(pos)
{
  let positions = pos.positions;
  for(let i=0;i<positions.length;i++)
  {
    if (!isNaN(positions[i].id))
    {
      if (positions[i].liquidity > 0)  
        return positions[i];
    }
  }
  console.log("Could not find a nonzero position");
  return false;
}

function findInRange(pos,ssym)
{
console.log("findInRange",pos,ssym);
  try {
    let positions = pos.positions;
    let emptyGoodPos = false;
    for(let i=0;i<positions.length;i++)
    {
console.log("1.positions[i]", positions[i].inRange,ssym);
      if (!isNaN(positions[i].id))
      {
console.log("2.positions[i]", positions[i].inRange,ssym);
        if (positions[i].inRange && positions[i].symbol == ssym)
        {
console.log("3.positions[i]", positions[i].inRange,ssym);
          // if position is already active with liquidity
console.log("4.positions[i]", positions[i].liquidity > 0);
          if (positions[i].liquidity > 0)  
            return positions[i];

          let {lowerNut,upperNut} = univ3.findTicks(pos.quote);

console.log("5.positions[i]", lowerNut,upperNut,positions[i].tickLower);

          // if position has no liquidity but is the exact one that would be minted
          if (positions[i].tickLower == lowerNut) 
            emptyGoodPos = positions[i];
        }
      }
    }
    if (emptyGoodPos)
      return emptyGoodPos;
    return false;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => removeOutOfRange() failed");
  }
}

function findEthPosById(positions,tid)
{
  try {
    for(let i=0;i<positions.length;i++)
    {
      if (positions[i].id == tid && ["ETH","WETH"].includes(positions[i].symbol))
      {
        return positions[i];
      }
    }
    throw new Error("Could not find tid="+tid+" symbol="+positions[i].symbol);
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => findPosByIdSymbol() failed");
  }
}

function findOutOfRange(pos)
{
  try {
    let positions = pos.positions;
    let tid = false;
    for(let i=0;i<positions.length;i++)
    {
      if (!isNaN(positions[i].id))
      {
        if (!positions[i].inRange && positions[i].liquidity > 0 && positions[i].symbol == "ETH")
        {
          tid = positions[i].id;
        }
      }
    }
    return tid;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => removeOutOfRange() failed");
  }
}

function getWalletAmount(pos,token)
{
  for (let i=0;i<pos.length;i++)
  {
    if (pos[i].id == "wallet" && pos[i].symbol == token)
      return pos[i].amount;
  }
  return 0;
}
function getWalletUsd(pos,token)
{
  for (let i=0;i<pos.length;i++)
  {
    if (pos[i].id == "wallet" && pos[i].symbol == token)
      return pos[i].usd;
  }
  return 0;
}

async function fundIncrease(port,tid,usd)
{
  try {
    let vsym = port.tj.pair.vsym;
    let ssym = port.tj.pair.ssym;
    let pos = port.snapshot;
    await init(port,port.tj.chain,"fundIncrease");
    console.log("ADJUST LIQUIDITY", tid, port.tj.pair.value-usd);
    let c = await univ3.getContract();
    await univ3.increaseLiquidity(port.tj.wname,c, port.walletAddress, tid, port.snapshot.collateral-usd,vsym,ssym);
    let now = Math.floor(Date.now()/1000);
    let subject = "Increasing liquiudity in "+tid+" from "+ Math.floor(usd);
    let profit = Math.floor((pos.netVusd+pos.netSusd)*100)/100;
    let apy =  Math.floor(((1+(pos.netVusd+pos.netSusd)/port.tj.pair.value) ** ((365*24*3600)/(pos.now-pos.starttime)) * 100-100)*10)/10;
    let body = "Profit="+profit+", APY="+apy+"%\n";
    body += "Increasing by "+(port.snapshot.collateral-usd)+"\n\n";
    body += await addPositionChanges(port,port.tj.chain,"lte","lte","increase liquidity");
    nodemailer.sendMail(subject,body);
    //unic.saveFile("update",wname,"Increasing liquidity");
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => fundIncrease() failed");
  }
}

async function fundMint(port)
{
  try {
    let pos = port.snapshot;
    await tjliq.addLiquidity(port);
    console.log("MINT");
    let now = Math.floor(Date.now()/1000); 
    let subject = "Minting "+now;
    let profit = Math.floor((pos.netVusd+pos.netSusd)*100)/100;
    let apy =  Math.floor(((1+(pos.netVusd+pos.netSusd)/port.tj.pair.value) ** ((365*24*3600)/(pos.now-pos.starttime)) * 100-100)*10)/10;
    let body = "Profit="+profit+", APY="+apy+"%\n";
    body += await addPositionChanges(port,port.tj.chain,"down","down","mint");
    nodemailer.sendMail(subject,body);
    return true;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => fundMint() failed");
  }
}

function printMap(name, map) {
  console.log(name);
  map.forEach((value, key) => {
    console.log(key, value);
  });
}

function setState(s,extra=null)
{
  let oldstate = getState();
  let w = {state: s};
  if (extra)
  {
    extra.state = s;
    w = extra;
  }
  unic.writeTagId("portfolio","state",w);
  let subject = "State changed from "+oldstate+" to "+s;
  let body = "State changed from "+oldstate+" to "+s;
  nodemailer.sendMail(subject,body);
}

function getState(param="state")
{
  let w = unic.readTagId("portfolio","state");
console.log("getState() = ",w);
  if (w && w[param] !== false)
  {
    return w[param];
  }
  else
    return false;
}

async function rebalance2(port)
{
  let newpos = port.snapshot;
  let vsym = port.tj.pair.vsym;
  let ssym = port.tj.pair.ssym;
console.log("port=",port);
  if (parseFloat(newpos.netVusd) > newpos.threshold)
  { 
    let wc = utils.checkWallet(newpos.positions,vsym,port.tj.chain);
    if (wc > parseFloat(newpos.netVamt))
    { 
      newpos.notes = "Non optimistic adjust.sell() with ratio "+parseFloat(newpos.netVusd)/port.snapshot.threshold;
      unic.saveObj("trade",newpos);
      console.log("Not optimistic sell");
      let s = await sell(port);
      return s;
    } 
    return false;
  }
  else if (parseFloat(newpos.netVusd) < -newpos.threshold)
  {
console.log("need to sell usdc to buy weth",newpos.positions);
    let u = utils.checkWallet(newpos.positions,ssym,port.tj.chain);
console.log("u=",u,-parseFloat(newpos.netVusd));
    if (u > -parseFloat(newpos.netVusd)/maps.priceMap.get(ssym.toUpperCase()))
    {
      newpos.notes = "Non optimistic, adjust.buy() with ratio = "+(-parseFloat(newpos.netVusd)/port.snapshot.threshold,u);
      unic.saveObj("trade",newpos);
      console.log("Not optimistic buy");
      let s = await buy(port);
      return s;
    }
    return false;
  }
  return true;
}

// review these checks because buy and sell are not getting called
async function rebalance(port,action)
{
  let newpos = port.snapshot;
  let vsym = port.tj.pair.vsym;
  let ssym = port.tj.pair.ssym;
  let value = port.tj.pair.value;
  let vprice = maps.priceMap.get(vsym.toUpperCase());
  let sprice = maps.priceMap.get(ssym.toUpperCase());
  if (action == "sellVsym")
  {
    
    let vamt = value/vprice/2;
    let wc = utils.checkWallet(newpos.positions,vsym,port.tj.chain);
    if (wc > vamt)
    {
      newpos.notes = "Non optimistic adjust.sell() with vamt "+vamt;
      unic.saveObj("trade",newpos);
      console.log("Not optimistic sell");
console.log("sell vamt=",vamt);
      let s = await sell(port,vamt);
      return s;
    }
    return false;
  }
  else if (action == "buyVsym")
  {
console.log("need to sell usdc to buy weth",newpos.positions);
    let u = utils.checkWallet(newpos.positions,ssym,port.tj.chain);
console.log("u=",u,-parseFloat(newpos.netVusd));
    let samt = value/sprice/2;
console.log("samt used to buy ",samt);
    if (u > samt)
    {
      newpos.notes = "Non optimistic, adjust.buy() with samt = "+samt;
      unic.saveObj("trade",newpos);
      console.log("Not optimistic buy");
      let s = await buy(port,samt);
      return s;
    }
    return false;
  }
  return true;
}

function getTickLower(positions)
{
  for (let i=0;i<positions.length;i++)
  {
    if (positions[i]["tickLower"] && positions[i]["liquidity"] && positions[i].liquidity > 0)
      return positions[i]["tickLower"];
  }
  throw new Error("No tickLower found in positions => getTickLower() failed");
}

function getUpperLower(port)
{
  const ids = port.tj.pair.ids;
  //console.log("ids=",ids);
  let lowerThresh;
  let upperThresh;
  if (ids[0] < ids[ids.length-1])
  {
    lowerThresh = ids[0];
    upperThresh = ids[ids.length-1];
  }
  else
  {
    lowerThresh = ids[ids.length-1];
    upperThresh = ids[0];
  }
  return {lowerThresh,upperThresh};
}

async function checkTick(port,tick)
{
  let {lowerThresh, upperThresh} = getUpperLower(port);
  //console.log(tick,lowerThresh,upperThresh,port);
  //console.log(tick > lowerThresh, tick < upperThresh);
  if (tick > lowerThresh && tick < upperThresh)
    return "hold";
  if (tick <= lowerThresh)
  {
    if (port.tj.pair.swap)
      return "buyVsym";
    else
      return "sellVsym";
  }
  if (tick >= upperThresh)
  {
    if (port.tj.pair.swap)
      return "sellVsym";
    else
      return "buyVsym";
  }
  throw new Error("Bad values in checkTick()");
}

function checkSpanOffset(port)
{
  let newpos = port.snapshot;
  if ((newpos.spanOffset !== false) && Math.abs(newpos.spanOffset) >= port.tj.pair.spanThresh)
  {
    return false;
  }
  return true;
}

async function adjust(port)
{
  try {
    let newpos = await getPositions(port);
    port.snapshot = newpos;
    for (let i=0;i<port.wallets.length;i++)
    {
      await init(port, port.wallets[i].chain,"port.wallet"+i);
      await checkWeth(port,port.wallets[i].chain);
      if (port.wallets[i].chain == "op")
      {
        if (await manageOp(port))
          return;
      }
      else if (port.wallets[i].chain == "poly")
      {
        if (await managePoly(port))
          return;
      }
    }
    let state = getState();
    console.log("STATEx=",state);
    if (!state)
    {
      let fp = await fundMint(port);
      if (fp === true)
      {
        setState("funded");
        console.log("SET STATE=","funded");
        return true;
      }
    }
    if (state == "funded")
    {
      if (!Array.isArray(port.tj.pair.amounts) || port.tj.pair.amounts.length != port.tj.pair.bins || 
          !Array.isArray(port.tj.pair.ids) || port.tj.pair.ids.length != port.tj.pair.bins)
      {
        console.log("Funded position not yet registered");
        await utils.sleep(5);
        return false;
      }
      const TIMEOUT = 300;
      const SLEEP = 1;
      const start = parseInt(Date.now()/1000);
      let now = parseInt(Date.now()/1000);

      while (start + TIMEOUT > now)
      {
        let tick = await tjliq.activeId(port);
//  let vsym = port.tj.pair.vsym;
//  let ssym = port.tj.pair.ssym;
//  let value = port.tj.pair.value;
//console.log("vprice=",vprice);
        console.log("Checking time:",start+TIMEOUT,now, "Remaining time: ",start+TIMEOUT-now, "Tick=",tick);

        let action = await checkTick(port,tick);
        console.log("action=",action,port.tj.address);
        if (action == "sellVsym" || action == "buyVsym")
        {
console.log("Unfunded bin, exiting");
utils.sleep(10);
exit();
          let r = await rebalance(port,action);
          if (r)
          {
            setState("rebalanced");
console.log("r=true");
            console.log("SET STATE=","rebalanced");
            return true;
          }
          else
          {
console.log("r=false");
            console.log("funded with rebalance = false");
            return false;
          }
        }
        await utils.sleep(SLEEP);
        now = parseInt(Date.now()/1000);
     }
     console.log("leaving funding loop check");
     return false;
    }
    if (state == "rebalanced")
    {
      let tid = await defundPosition(port,true);
      setState("defunded");
      console.log("SET STATE=","defunded");
      return true;
    }
    if (state == "defunded")
    {
      const ids = port.tj.pair.ids;
console.log("ids=",ids);
      if (ids.length > 0)
      {
        setState("rebalanced");
        return false;
      }
      let r = await rebalance2(port);
      if (r)
      {
          setState(false);
          console.log("SET STATE=false");
          return true;
      }
    }
    return false;

  } catch (e) {
    console.log(e.message+" => adjust() failed");
    nodemailer.sendMail("adjust() failed", e.message+" => adjust() failed");
    throw new Error(e.message+" => adjust() failed");
  }
}

const MAX_RETRIES = 3;

/*
  let port = {wallets: [
    {wname: "lance", chain: "op", walletAddress: walletAddress},
    {wname: "lance", chain: "poly", walletAddress: walletAddress},
  ]};
*/
async function getPositions(port, retries=0)
{
  try {
    await init(port);
    console.log("gp1", port);
console.log("gp1z", maps.priceMap);
    console.log("chain.getAddress()=", chain.getAddress("WETH"));
    let vsym = port.tj.pair.vsym;
    let ssym = port.tj.pair.ssym;
    await quote.oneLoadQuotes("avax");
    //let ethPrice = await univ3.getEthPrice();
    //maps.priceMap.set("WETH",ethPrice);
    // let price = await univ3.getCurrentPrice();
    // console.log("price=",price);
    //    maps.priceMap.set(vsym,maps.priceMap.get(ssym)/price);
console.log(maps.priceMap);
    let q = maps.priceMap.get(vsym.toUpperCase());
console.log("gp1y", q);
    let pos=[];
    let npos;
    let initValue = port.start;
    console.log("gp3",initValue);
    let startVamt = parseFloat(initValue.vamt);
    let vusd;
    let startSamt = initValue.samt;
    let startSusd = startSamt * maps.priceMap.get(ssym.toUpperCase());
    //let vamount = BigNumber(Math.floor(startVamt*1000000)).mult(-BigNumber(10).pow(12)).toString();
    let address;
    for (let i=0;i<port.wallets.length;i++)
    {
      let includelist = port.wallets[i].includelist;
      if (!includelist)
        includelist = false;
console.log("INCLUDELIST=", includelist);
//console.log("web3=",web3);
      npos = await wall.getPositionsMulti(port,port.wallets[i]);
      console.log("wallet positions["+i+"]=",npos);
      pos = pos.concat(npos);
    }
    npos = await tjliq.getPositions(port);
console.log("getPositions=",npos);
    pos = pos.concat(npos);
console.log("returning from tjliq.getPositions()",pos);
    let ivamt=0;
    let isamt=0;
    let isusd=0;
    let lVamt=0;
    let lSamt=0;
    let lSusd=0;
    let tradeThreshold= port.tj.pair.value*port.tj.pair.threshRatio;
    let liqValue = 0;
    let tickLower = false;
    let initLiqValue = isamt*maps.priceMap.get(ssym.toUpperCase()) + ivamt*maps.priceMap.get(vsym.toUpperCase());
    let il = liqValue - initLiqValue;
    console.log(pos);
    let susd=0;
    vusd=0;
    for(let i=0;i<pos.length;i++)
    {
      //console.log("looping", i, pos[i]);
      if (pos[i].symbol.toUpperCase() == ssym.toUpperCase())
      {
        //console.log("stablecoin");
        susd += pos[i].usd;
      }
      else if (pos[i].symbol.toUpperCase() == vsym.toUpperCase())
      {
        //console.log("native", pos[i].usd);
        vusd += pos[i].usd;
      }
      else if (pos[i].symbol=="MATIC")
      {
      }
      else if (pos[i].symbol=="AVAX")
      {
      }
      else if (pos[i].symbol=="WAVAX")
      {
      }
      else if (pos[i].symbol=="ETH")
      {
      }
      else if (pos[i].symbol.toUpperCase() =="WETH.E")
      {
      }
      else if (pos[i].symbol=="USDC")
      {
      }
      else
      {
        throw new Error("Unknown coin in getPositions "+pos[i].symbol);
      }
    }
console.log("susd=",susd,port.start.samt,startSusd);
console.log("vusd=",vusd,startVamt,maps.priceMap.get(vsym.toUpperCase()));
console.log(vusd);
console.log(vusd-startVamt*maps.priceMap.get(vsym.toUpperCase()));
console.log(vusd-startVamt*maps.priceMap.get(vsym.toUpperCase())+susd);
console.log(vusd-startVamt*maps.priceMap.get(vsym.toUpperCase())+susd-startSusd);
console.log(startSusd);
    let profit = vusd-startVamt*maps.priceMap.get(vsym.toUpperCase())+susd-startSusd;
console.log("profit=",profit);
    let spanValue = port.tj.pair.value+profit;
    //console.log("setting new pos");
    let tick = await tjliq.activeId(port);
    let spanOffset = false;
    if (port.tj.pair.ids)
    {
      spanOffset = port.tj.pair.ids[Math.floor(port.tj.pair.bins/2)]-tick;
    }
    let newpos = {
      spanOffset: spanOffset,
      state: getState(),
      profit: profit,
      netVusd: vusd-startVamt*maps.priceMap.get(vsym.toUpperCase()),
      netVamt: vusd/maps.priceMap.get(vsym.toUpperCase())-startVamt,
      netSusd: susd-startSusd,
      netSamt: (susd-startSusd)/maps.priceMap.get(ssym.toUpperCase()),
      vprice: maps.priceMap.get(vsym.toUpperCase()),
      sprice: maps.priceMap.get(ssym.toUpperCase()),
      tick: tick,
      iVamt: ivamt,
      iVusd: ivamt*maps.priceMap.get(vsym.toUpperCase()),
      iSamt: isamt,
      iSusd: isusd,
      lVamt: lVamt,
      lVusd: lVamt * maps.priceMap.get(vsym.toUpperCase()),
      lSamt: lSamt,
      lSusd: lSamt * maps.priceMap.get(ssym.toUpperCase()),
      initLiqValue: initLiqValue,
      liqValue: liqValue,
      il: il,
      threshold: tradeThreshold,
      threshRatio: port.tj.pair.threshRatio,
      vusd: vusd, 
      vamt: vusd/maps.priceMap.get(vsym.toUpperCase()), 
      samt: susd/maps.priceMap.get(ssym.toUpperCase()),
      susd: susd,
      quote: q, 
      starttime: initValue.timestamp, 
      now: Math.floor(Date.now()/1000), 
      positions: pos
    };
    //newpos = prunePositions(newpos);
    console.log(newpos);
    return newpos;
  } catch (e) {
    if (retries < MAX_RETRIES)
    {
      if (utils.shouldRetry(e.message))
      {
        retries++;
        return getPositions(port, retries);
      }
    }
    console.log(e.message);
    nodemailer.sendMail("pool.getPositions() failed", e.message);
    throw new Error(e.message+" => pool.getPositions failed");
  }
}

async function checkWeth(port,ch,reset=true)
{
  let newpos = port.snapshot;
  let vsym = port.tj.pair.vsym;
  let ssym = port.tj.pair.ssym;
  let wcache = unic.readTagId("wallet",vsym,ch);
  let scache = unic.readTagId("wallet",ssym,ch);
  console.log("checkWeth wcache=",wcache," scache=",scache);
  let vdir = false;
  let sdir = false;
  let weth0;
  let weth1;
  let susd0;
  let susd1;
  if (wcache)
  {
    weth0 = wcache.wweth;
    console.log("wweth=",wcache.wweth,"direction=",wcache.direction);
    if (wcache.direction)
      vdir = wcache.direction;
    
    let sym = "WETH";
    weth1 = utils.checkWallet(newpos.positions,sym,ch);
    if (vdir == "up" && weth1 <= weth0 ||
        vdir == "gte" && weth1 < weth0 ||
        vdir == "lte" && weth1 > weth0 ||
        !vdir && weth1 != weth0 ||
        vdir == "down" && weth1 >= weth0)
    {
      if (!vdir && wcache.olddir == "gte" && weth1 > wcache.oldweth ||
          !vdir && wcache.olddir == "lte" && weth1 < wcache.oldweth)
      {
        console.log("late exception found in checkWeth");
      }
      else
      {
        await utils.sleep(12);
        throw new Error("Bad WETH wallet value in checkWeth() weth0="
          +weth0+" weth1="+weth1+" vdir="+vdir+" sdir="+sdir+" chain="+ch);
      }
    }
  }
  if (scache)
  {
    susd0 = scache.susd;
    console.log("susd=",scache.susd,"direction=",scache.direction);
    if (scache.direction)
      sdir = scache.direction;
    
    let sym = "USDC";
    susd1 = utils.checkWallet(newpos.positions,sym,ch);
    if (sdir == "up" && susd1 <= susd0 ||
        sdir == "gte" && susd1 < susd0 ||
        sdir == "lte" && susd1 > susd0 ||
        !sdir && (susd1 < susd0 || susd1 > susd0+0.1) ||
        sdir == "down" && susd1 >= susd0 ||
        (vdir == "lte" && sdir == "lte" && (weth1 >= weth0 && susd1 >= susd0)) ||
        (vdir == "gte" && sdir == "gte" && (weth1 <= weth0 && susd1 <= susd0)))
    {
console.log("checkWeth1", sdir, susd0, susd1);
      if (!sdir && scache.olddir == "gte" && susd1 > scache.oldsusd ||
          !sdir && scache.olddir == "lte" && susd1 < scache.oldsusd)
      {
        console.log("late exception found in checkWeth");
      }
      else
      {
console.log("checkWeth3");
        await utils.sleep(12);
        throw new Error("Bad WETH wallet value2 in checkWeth() weth0="
          +weth0+" weth1="+weth1+" susd0="+susd0+" susd1="+susd1+" vdir="+vdir+" sdir="+sdir+" chain="+ch);
      }
    }
  }
  if (wcache)
  {
    if (vdir && reset)
    {
      let w = {wweth: weth1, callfrom: wcache.callfrom};
      if (wcache.olddir)
      {
        w.olddir = wcache.olddir;
        w.oldweth = wcache.oldweth;
      }
      unic.writeTagId("wallet","weth",w,ch);
    }
  }
  if (scache)
  {
    if (sdir && reset)
    {
      let w = {susd: susd1, callfrom: scache.callfrom};
      if (scache.olddir)
      {
        w.olddir = scache.olddir;
        w.oldsusd = scache.oldsusd;
      }
      unic.writeTagId("wallet","susd",w,ch);
    }
  }
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

async function calculate(port)
{
  try 
  {  
console.log("c1");
console.log("c2",port);
    let newpos = await getPositions(port);
    //newpos = prunePositions(newpos);
    port.snapshot = newpos;
//console.log("c3",port);
console.log("c4",port);
    for (let i=0;i<port.wallets.length;i++)
    {
      await checkWeth(port,port.wallets[i].chain,false);
    }
console.log("newpos=",newpos);
    let subject="";
    let profit = Math.floor((newpos.netVusd+newpos.netSusd)*100)/100;
    let apy =  Math.floor(((1+(newpos.netVusd+newpos.netSusd)/port.tj.pair.value) ** ((365*24*3600)/(newpos.now-newpos.starttime)) * 100-100)*10)/10;
    let body="";
/*
    if (newpos.spanOffset !== false && newpos.spanOffset >= port.tj.spanThresh)
      subject="SELLING " + Math.floor(newpos.netVamt*100)/100 + " ETH " + newpos.now;
    else if (newpos.spanOffset !== false && -newpos.spanOffset >= port.tj.spanThresh)
      subject="BUYING " + Math.floor(-newpos.netVamt*100)/100 + " ETH " + newpos.now;
    else
*/
      subject = profit+" ("+newpos.spanOffset+"), APY="+apy+"%\n";
    body += "Profit="+profit+", APY="+apy+"%\n";
    body +="Your ETH position is " + Math.floor(newpos.netVamt*100)/100 + " " + newpos.now;
    const dt=new Date(newpos.starttime * 1000).toLocaleString("en-US",
      {timeZone: "America/Chicago"});
    body += "\nStarting "+dt;
    body += "\n\n"+JSON.stringify(port,null,2)+"\n";
    console.log(body);
    console.log("      timestamp: "+newpos.now+",");
    console.log("      samt: "+newpos.samt+",");
    console.log("      vamt: "+newpos.vamt);
    //console.log("      vamt: "+newpos.vamt+",");
    //console.log("      collateral: "+port.snapshot.collateral+"\n");
    console.log("\nProfit("+newpos.spanOffset+"):", newpos.profit+" APY="+apy+"%\n");
    if (port.email)
    {
      //let opt = nodemailer.getMailOptions();
      //console.log("port.email=",port.email, opt);
      nodemailer.sendMail(subject,body);
    }
//console.log("calculate port=",port);
    //await tjliq.removeLiquidity(port);
  } catch (e) {
    console.log(e.message);
    if (port.email)
      nodemailer.sendMail("calculate() failed", e.message);
    throw new Error(e.message+" => calculate() failed");
  }
}

/*
async function main()
{
  const wname = "lance";
  let wallet = await wall.init(wname,"op");
  let newpos = await getPositions(wname,wallet.address);
  //await calculateNetPosition(wname,wallet.address);
  await adjust(wname,wallet.address);
  let c = await univ3.getContract();
  //await univ3.removeLiquidity(c,wallet.address,344945);
  //await univ3.removeLiquidity(c,wallet.address,344944);
  //await univ3.removeLiquidity(c,wallet.address,344939);
}

main();
*/

module.exports = Object.assign({
  init,
  buy,
  sell,
  setState,
  getPositions,
  // fundPosition,
  defundPosition,
  calculate,
  adjust
});     

