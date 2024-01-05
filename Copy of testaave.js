const user=require("./user.js");
const pool=require("./pool.js");
const wall=require("./wallet.js");
const aave = require("./aave.js");
const utils = require("./utils.js");

function getIdUsd(port,id,symbol)
{
  let pos = port.snapshot.positions;
//console.log("getWalletUsd",pos,symbol);
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

async function main() 
{
  try {
    let init = user.getInit("lance");
    await wall.initInit(init);
    console.log("init=",init);
    let newpos = await pool.calculate(init,false);
    const ratio = aave.getRatio(newpos.positions);
    console.log("ratio=",ratio);
/*
    ratio = aave.getRatio(port, [
      {action:"deposit",symbol:"WAVAX",usd:245000},
      {action:"borrow",symbol:"WETH.e",usd:100000}
    ]);
    console.log("ratio=",ratio);
*/
    //const weth = getIdUsd(port,"wallet","WETH.e");
    //console.log("weth=",weth);
    //await aave.repay(port,"WAVAX",1);
    //await aave.deposit(port,"WAVAX",1);
    //await aave.withdraw(port,"WAVAX",1);
    //let newpos = await aave.getPositions(port);
    //console.log("newpos=",newpos);
    //await aave.borrow(port,"WAVAX",1);
    //let prices = await aave.getPriceOfAllTokens(port.wallets[0].walletAddress);
    //console.log("prices=",prices);
    //let rewards = await aave.getUserRewards(wallet.address);
    //console.log("rewards",rewards);
  } catch (e) {
    console.log(e.message);
  }
}

main()
