const wall = require('./wallet.js');
const unic = require('./unicache.js');
const tj2 = require('@traderjoe-xyz/sdk-v2');
const {LBPairV21ABI} = require('@traderjoe-xyz/sdk-v2/dist/index.js');
const factoryABI = require("./ABI/TJFactory.json");
const routerABI = require("./ABI/TJRouter.json");
const web = require("./web3.js");
const web3 = web.web3;
var BigNumber = require('big-number');
const ankr = require('./ankr.js');
const maps = require('./maps.js');
const erc20 = require('./erc20.js');
const utils = require('./utils.js');

wavax = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7';
usdc = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';

async function getPair(c,token0,token1)
{
  try {
    const t = await c.methods
      .getPair(token0,token1)
      .call()
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => getPair() failed");
      });
    console.log("getPair()",t);
    return t;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => getPair() failed");
  }
}

async function getRouterContract() {
  try {
    const faddress = '0xb4315e873dbcf96ffd0acd8ea43f689d8c20fb30';
    const contract = await new web3.obj.eth.Contract(routerABI, faddress);
    //console.log("routerContract=",contract);
    return contract;
    } catch (e) {
      console.log(e.message+" getContract failed");
      throw Error(e.message+" => getContract failed");
    } 
}   

async function getFactoryContract() {
  try {
    const faddress = '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10';
    const contract = await new web3.obj.eth.Contract(factoryABI, faddress);
    return contract;
    } catch (e) {
      console.log(e.message+" getContract failed");
      throw Error(e.message+" => getContract failed");
    } 
}   

async function getActiveId(c)
{
  let addrs = [];
  try {
    const t = await c.methods
      .getActiveId()
      .call()
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => getActiveId() failed");
      });
    //console.log("getActiveId()",t);
    return t;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => getActiveId() failed");
  }
}

async function activeId(port)
{
  const c = await getLBPairContract(port);
  const id = getActiveId(c);
  return id;
}

async function balanceOfBatch(c,addr,bins)
{
  let addrs = [];
  for (let i=0;i<bins.length;i++)
  {
    addrs[i]=addr;
  }
  //console.log("addrs",addrs,bins);
  try {
    const t = await c.methods
      .balanceOfBatch(addrs,bins)
      .call()
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => balanceOfBatch() failed");
      });
    //console.log("balanceOfBatch()",t);
    return t;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => balanceOfBatch() failed");
  }
}

async function getBalanceOf(c,addr,bin)
{
  try {
    const t = await c.methods
      .balanceOf(addr,bin)
      .call()
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => getBalanceOf() failed");
      });
    console.log("balanceOf()",t);
    return t;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => getBalanceOf() failed");
  }
}

async function getTotalSupply(c,bin)
{
  try {
    const t = await c.methods
      .totalSupply(bin)
      .call()
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => getTotalSupply() failed");
      });
    console.log("totalSupply()",t);
    return t;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => getTotalSupply() failed");
  }
}

async function getBin(c,bin,port)
{
  try {
    let t = await c.methods
      .getBin(bin)
      .call()
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => getBin() failed");
      });
    console.log("getBin()",t);
    return t;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => getBin() failed");
  }
}

async function getTokenX(c,port) {
  try {
    const t = await c.methods
      .getTokenX()
      .call()
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => getTokenX() failed");
      });
//console.log("token0=",t);
    return t;
    } catch (e) {
      console.log(e.message+" getTokenX failed");
      throw Error(e.message+" => getTokenX failed");
    } 
}

async function getLBPairContract(port) {
  try {
    let address = '0xD446eb1660F766d533BeCeEf890Df7A69d26f7d1';
    if (port.tj.pair.ssym.toUpperCase() == "WETH.E" && port.tj.pair.vsym == "WAVAX")
      address = '0x1901011a39B11271578a1283D620373aBeD66faA';
    const contract = await new web3.obj.eth.Contract(LBPairV21ABI, address);
    let t0 = await getTokenX(contract,port);
    //console.log("getLBPairContract comparison", t0.toLowerCase(), maps.addressMap.get(port.tj.pair.vsym));
    if (t0.toLowerCase() == maps.addressMap.get(port.tj.pair.vsym))
      port.tj.pair.swap = false;
    else
      port.tj.pair.swap = true;
    return contract;
    } catch (e) {
      console.log(e.message+" getLBPairContract failed");
      throw Error(e.message+" => getLBPairContract failed");
    } 
}

async function getReserveCache(tokenId)
{
  let r = await unic.readTagId("tj",tokenId);
console.log("r=",r);
  return r;
}
async function getReserve(c,tokenId,port)
{
  try {
    let {binReserveX, binReserveY} = await getBin(c,tokenId,port);
    if (port.tj.pair.swap)
    {
      let tmp = binReserveX;
      binReserveX = binReserveY;
      binReserveY = tmp;
    }
    const totalSupply = await getTotalSupply(c,tokenId);
    const balanceOf = await getBalanceOf(c,port.tj.address,tokenId);
    const info = {
      binReserveX: binReserveX,
      binReserveY: binReserveY,
      totalSupply: totalSupply,
      balanceOf: balanceOf
    };
    await unic.writeTagId("tj",tokenId,info);
    return {binReserveX,binReserveY,totalSupply,balanceOf};
  } catch (e) {
    console.log(e.message+" getReserve() failed");
    throw Error(e.message+" => getReserve() failed");
  }
}

function getTickPosition(tick,nfts)
{
  for (let i=0;i<nfts.length;i++)
    if (tick == nfts[i].tokenId)
      return i;
  throw Error("tick "+tick+" not found => getTickPosition()");
}

async function getReserves(c,nfts,port)
{
  try {
    let binXs = [];
    let binYs = [];
    let totals = [];
    let balances = [];
    const tick = port.tj.pair.tick;
    let t = getTickPosition(tick,nfts);
    //const cache = await getReserveCache(nfts[i].tokenId);
    let {binReserveX,binReserveY,totalSupply,balanceOf} = await getReserve(c,nfts[t].tokenId,port);
    binXs[t] = binReserveX;
    binYs[t] = binReserveY;
    totals[t] = totalSupply;
    balances[t] = balanceOf;
console.log("reserve",binReserveX,binReserveY,totalSupply,balanceOf);
    for (let i=t-1;i>=0;i--)
    {
      const cache = await getReserveCache(nfts[i].tokenId);
      let {binReserveX,binReserveY,totalSupply,balanceOf} = await getReserve(c,nfts[i].tokenId,port);
      binXs[i] = binReserveX;
      binYs[i] = binReserveY;
      totals[i] = totalSupply;
      balances[i] = balanceOf;
console.log("reserve",binReserveX,binReserveY,totalSupply,balanceOf,cache);
      if (cache.binReserveX == binReserveX &&
          cache.binReserveY == binReserveY &&
          cache.totalSupply == totalSupply &&
          cache.balanceOf == balanceOf)
      {
        for (let j=i-1;j>=0;j--)
        {
          const c = await getReserveCache(nfts[j].tokenId);
          binXs[j] = c.binReserveX;
          binYs[j] = c.binReserveY;
          totals[j] = c.totalSupply;
          balances[j] = c.balanceOf;
        }
        break;
      }
    }
    for (let i=t+1;i<port.tj.pair.bins;i++)
    {
      const cache = await getReserveCache(nfts[i].tokenId);
      let {binReserveX,binReserveY,totalSupply,balanceOf} = await getReserve(c,nfts[i].tokenId,port);
      binXs[i] = binReserveX;
      binYs[i] = binReserveY;
      totals[i] = totalSupply;
      balances[i] = balanceOf;
console.log("reserve",binReserveX,binReserveY,totalSupply,balanceOf,cache);
      if (cache.binReserveX == binReserveX &&
          cache.binReserveY == binReserveY &&
          cache.totalSupply == totalSupply &&
          cache.balanceOf == balanceOf)
      {
        for (let j=i+1;j<port.tj.pair.bins;j++)
        {
          const c = await getReserveCache(nfts[j].tokenId);
          binXs[j] = c.binReserveX;
          binYs[j] = c.binReserveY;
          totals[j] = c.totalSupply;
          balances[j] = c.balanceOf;
        }
        break;
      }
    }
    return {binXs,binYs,totals,balances};
  } catch (e) {
    console.log(e.message+" getReserves() failed");
    throw Error(e.message+" => getReserves() failed");
  }
}

// hard-coded for WAVAX-USDC
async function getPositions(port)
{
  try {
    const tick = await activeId(port);
    port.tj.pair.tick = tick;
    let bins = port.tj.pair.bins;
    let wallet = await wall.init(port.tj.wname,port.tj.chain);
console.log("wallet=",wallet);
    port.tj.address = wallet.address;
    console.log("port getPositions",port);
    let nfts = await ankr.getNFTs(port.tj.address);
console.log("nfts=",nfts);
    if (nfts.length == 0)
    {
      port.tj.pair.ids = [];
console.log("returning empty");
      return [];
    }
    let ids = [];
    for (let i=0;i<bins;i++)
    {
console.log("nfts",i,nfts[i]);
      ids[i]=nfts[i].tokenId;
    }
    port.tj.pair.ids = ids;
console.log("port=",port,port.tj.pair.ids);
    let x=0;
    let y=0;
    let xamt=0;
    let yamt=0;
    let c = await getLBPairContract(port);
    const batch = await balanceOfBatch(c,port.tj.address,ids);
    console.log("balanceOfBatch",batch);
    if (batch[0] == '0')
    {
      if (port.state == "funded")
      {
        throw new Error("Portfolio is funded but balanceOfBatch returned zeroes => tjliq.getPositions()");
      }
      return [];
    }
    port.tj.pair.amounts = batch;
    const {binXs,binYs,totals,balances} = await getReserves(c,nfts,port);
//console.log("reserves",binXs,binXs.length,binYs,binYs.length,totals,totals.length,balances,balances.length);
    for (let i=0;i<bins;i++)
    {
      const d0 = maps.decimalsMap.get(port.tj.pair.vsym);
      const d1 = maps.decimalsMap.get(port.tj.pair.ssym);
console.log("gp4",i,d0,d1,totals[i],balances[i]);
      ratio = parseInt(BigNumber(totals[i]).mult(1000000).div(balances[i]).toString())/1000000;
console.log("gp5",i,ratio);
      x += parseInt(BigNumber(binXs[i]).div(BigNumber(10).pow(d0-6)).toString())/1000000/ratio;
console.log("gp6",i);
      y += parseInt(BigNumber(binYs[i]).div(BigNumber(10).pow(d1-6)).toString())/1000000/ratio;
console.log("gp7",i,xamt,binXs[i],ratio);
      xamt = BigNumber(xamt).add(BigNumber(binXs[i]).mult(1000000).div(Math.floor(ratio*1000000))).toString();
console.log("gp8",i,yamt,binYs[i]);
      yamt = BigNumber(yamt).add(BigNumber(binYs[i]).mult(1000000).div(Math.floor(ratio*1000000))).toString();
console.log("gp9",i);
    }
    port.tj.pair.amountX = xamt;
    port.tj.pair.amountY = yamt;
  console.log("batch x",x,"y",y,xamt,yamt,maps.priceMap);
    let pos = [
    {
      id: 'tj',
      chain: 'avax',
      symbol: port.tj.pair.vsym,
      amount: xamt,
      decimals: 18,
      amt: x,
      usd: x * maps.priceMap.get(port.tj.pair.vsym)
    },
    {
      id: 'tj',
      chain: 'avax',
      symbol: port.tj.pair.ssym,
      amount: yamt,
      decimals: 18,
      amt: y,
      usd: y * maps.priceMap.get(port.tj.pair.ssym.toUpperCase())
    } ];
console.log("returning tjliq.getPositions");
    return pos;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => tjliq.getPositions() failed");
  }
}

function calculatePrice(id,d0,d1,binStep)
{
  console.log("calculatePrice=",id,d0,d1,binStep);
  let p;
  p = Math.exp((id-8388608)*Math.log(1+binStep/10000))*(10**(d0-d1));
  return p;
}

async function removeLiquidity(port)
{
  try {
    let vsym = port.tj.pair.vsym;
    let ssym = port.tj.pair.ssym;
console.log("removeLiquidity",vsym,ssym,port.tj.pair.swap);
    if (port.tj.pair.swap)
    {
      let tmp = vsym;
      vsym = ssym;
      ssym = tmp;
    }
    let tokenX = maps.addressMap.get(vsym);
    let tokenY = maps.addressMap.get(ssym);
console.log("removeLiquidity",tokenX,tokenY);
    const binStep = port.tj.pair.binStep;
    const ids = port.tj.pair.ids;
    const address = port.tj.address;
    let x=0;
    let y=0;
    let xamt=0;
    let yamt=0;
console.log("rl1",ids);
    let c = await getLBPairContract(port);
console.log("rl2",address,ids);
    const batch = await balanceOfBatch(c,address,ids);
console.log("rl3");
    console.log("balanceOfBatch",batch);
    port.tj.pair.amounts = batch;
    const bins = port.tj.pair.bins;
    let nfts = await ankr.getNFTs(address);
console.log("nfts=",nfts);
    if (nfts.length == 0)
      return false;
    for (let i=0;i<bins;i++)
    { 
      const {binReserveX, binReserveY} = await getBin(c,nfts[i].tokenId,port);
      const ts = await getTotalSupply(c,nfts[i].tokenId);
      const bal = await getBalanceOf(c,address,nfts[i].tokenId);
      const d0 = maps.decimalsMap.get(vsym);
      const d1 = maps.decimalsMap.get(ssym);
console.log("rl 4",i);
      ratio = parseInt(BigNumber(ts).mult(1000000).div(bal).toString())/1000000;
console.log("rl 5",i);
      //console.log("binReserveX",binReserveX,"binReserveY",binReserveY,ts,bal,ratio);
      x += parseInt(BigNumber(binReserveX).div(BigNumber(10).pow(d0-6)).toString())/1000000/ratio;
      y += parseInt(BigNumber(binReserveY).div(BigNumber(10).pow(d1-6)).toString())/1000000/ratio;
console.log("rl 6",i,xamt,binReserveX,ratio);
      xamt = BigNumber(xamt).add(BigNumber(binReserveX).mult(1000000).div(Math.floor(ratio*1000000))).toString();
console.log("rl 7",i,yamt,binReserveY,ratio);
      yamt = BigNumber(yamt).add(BigNumber(binReserveY).mult(1000000).div(Math.floor(ratio*1000000))).toString();
console.log("rl 8",i);
    }
    const amountXMin = BigNumber(xamt).mult(97).div(100).toString();
    const amountYMin = BigNumber(yamt).mult(97).div(100).toString();
console.log("rl 8");
    const amounts = port.tj.pair.amounts;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 2;
    let sendParams = {
      from: address,
      value: 0,
      gas: 5000000,
      nonce: await web3.obj.eth.getTransactionCount(address)
    };
console.log("rl 9");
    let rc = await getRouterContract();
console.log("calling removeLiquidity");
    await rc.methods
      .removeLiquidity(
        tokenX,
        tokenY,
        binStep,
        amountXMin,
        amountYMin,
        ids,
        amounts,
        address,
        deadline)
      .send(sendParams)
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => pairContract.removeLiquidity() failed");
      });
console.log("removeLiquidity success");
    return true;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => removeLiquidity() failed");
  }
}

async function addLiquidity(port)
{
  try {
    let sym0 = port.tj.pair.vsym;
    let sym1 = port.tj.pair.ssym;
    if (port.tj.pair.swap)
    {
      let tmp = sym0;
      sym0 = sym1;
      sym1 = tmp;
    }
    const bins = port.tj.pair.bins;
    const binStep = port.tj.pair.binStep;
    const dec0 = maps.decimalsMap.get(sym0);
    const dec1 = maps.decimalsMap.get(sym1);
    const tokenX = maps.addressMap.get(sym0);
    const tokenY = maps.addressMap.get(sym1);
    let value = port.tj.pair.value;
    if (port.snapshot.profit > 0)
      value += port.snapshot.profit;
console.log("value=",value);
    const c = await getLBPairContract(port);
    const activeIdDesired = await getActiveId(c);
    port.tj.pair.activeId = activeIdDesired;
    console.log("activeId",activeIdDesired);
    const price = calculatePrice(activeIdDesired,dec0,dec1,binStep);
    console.log("Price=",price);
    const p0 = price*maps.priceMap.get(sym1.toUpperCase());; 
    const p1 = maps.priceMap.get(sym1.toUpperCase());;
console.log("Price=",price,p0,p1,maps.priceMap.get(sym0.toUpperCase()),maps.priceMap.get(sym1.toUpperCase()));
    const amountX = BigNumber(Math.floor(value*1000000/2/p0)).mult(BigNumber(10).pow(dec0-6)).toString();
    console.log("amountX",amountX,value,p0,dec0);
    const amountY = BigNumber(Math.floor(value*1000000/2/p1)).mult(BigNumber(10).pow(dec1-6)).toString();
    const amountXMin = BigNumber(amountX).mult(999).div(1000).toString();
    const amountYMin = BigNumber(amountY).mult(999).div(1000).toString();
    console.log("price=",price);
    const amt = BigNumber(10).pow(18).div(bins).mult(2).toString();
    const amthalf = BigNumber(amt).div(2).toString();
    const idSlippage = 2;
    let deltaIds = [];
    const half = port.tj.pair.bins/2;
    let distributionX = [];
    let distributionY = [];
    for (let i=0;i<port.tj.pair.bins;i++)
    {
      deltaIds[i] = i - Math.floor(half);
      if (deltaIds[i] < 0)
      {
        distributionX[i] = 0;
        distributionY[i] = amt;
      }
      else if (deltaIds[i] > 0)
      {
        distributionX[i] = amt;
        distributionY[i] = 0;
      }
      else
      {
        distributionX[i] = amthalf;
        distributionY[i] = amthalf;
      }
    }
    console.log("distX=",distributionX,distributionY);
    const address = port.tj.address;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 2;
/*
    router 0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30
    const eXC = await erc20.getContract(tokenX);
    const eYC = await erc20.getContract(tokenY);
    const eZC = await erc20.getContract('0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB');
    const lbpair = '0xb4315e873dbcf96ffd0acd8ea43f689d8c20fb30';
    await erc20.approve(eXC,address,lbpair,'115792089237316195423570985008687907853269984665640564039457584007913129639935');
    await erc20.approve(eYC,address,lbpair,'115792089237316195423570985008687907853269984665640564039457584007913129639935');
    await erc20.approve(eZC,address,lbpair,'115792089237316195423570985008687907853269984665640564039457584007913129639935');
    const aX = await erc20.allowance(eXC,address,lbpair);
    const aY = await erc20.allowance(eYC,address,lbpair);
    const aZ = await erc20.allowance(eZC,address,lbpair);
    console.log("ALLOWANCE X=",aX);
    console.log("ALLOWANCE Y=",aY);
    console.log("ALLOWANCE Z=",aZ);
*/
    const params = [
      tokenX,
      tokenY,
      binStep,
      amountX,
      amountY,
      amountXMin,
      amountYMin,
      activeIdDesired,
      idSlippage,
      deltaIds,
      distributionX,
      distributionY,
      address,
      address,
      deadline
    ];
    console.log("params=",params);
    let sendParams = {
      from: address,
      value: 0,
      gas: 10000000,
      nonce: await web3.obj.eth.getTransactionCount(address)
    };
    let rc = await getRouterContract();
    await rc.methods
      .addLiquidity(params)
      .send(sendParams)
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => pairContract.addLiquidity() failed");
      });
    console.log("liquidity added");
    return true;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => addLiquidity() failed");
  }
}

/*
async function main()
{
  let port = {address: '0x0fFeb87106910EEfc69c1902F411B431fFc424FF'};
  let pos = await getPositions(port);
  console.log("pos=",pos);

  // xxx implement addLiquidity and removeLiquidity
}
main();
*/

      
module.exports = Object.assign({ 
  getPositions,
  activeId,
  calculatePrice,
  addLiquidity,
  removeLiquidity
});


