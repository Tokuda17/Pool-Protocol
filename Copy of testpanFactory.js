const user=require("./user.js");
const wall=require("./wallet.js");
const utils = require("./utils.js");
const pf = require("./panFactory.js");

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
    let rc = pf.getRouterContract();
    const tokenB = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7';
    //const tokenA = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';
    const tokenA = '0xc7198437980c041c805A1EDcbA50c1Ce5db95118';
    //const liquidity = '167279255694';
    //const liquidity = '66719583774933377';
    const liquidity = '6236820135864408';
    await pf.panRemoveLiquidityAVAX(rc,tokenA,liquidity,init.walletAddress);


/*
    let ratio = aave.getRatio(port);
    console.log("ratio=",ratio);
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
