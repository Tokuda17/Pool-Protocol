const user = require("./user.js");
const pool = require("./pool.js");
const utils = require("./utils.js");
const pan = require("./pan.js");
const wall = require("./wallet.js");
const maps = require("./maps.js");
const nodemailer = require("./nodemailer.js");
  
async function main(retries=0)
{ 
  const maxretries = 5;
  try {
    var wname = "lance";
    if (process.argv.length >= 3)
    {
      wname = process.argv[2];
    }
console.log("main.1",wname);
    let init = user.getInit(wname);
    await wall.initInit(init);
console.log(init);
//console.log("main.2");
//    let wallet = await wall.init(wname);
//    init.walletAddress = wallet.address;
console.log("main.3");
    nodemailer.init(wname);
console.log("main.4");
    const netPos = await pool.calculate(init,false);
    let pooladdr = maps.addressMap.get('AVAX-USDC');
    //console.log("AVAX-USDC addr=",pooladdr);
    //let newpos = await pool.expandPoolPositions(netPos.positions,
    //  ['AVAX-USDC','AVAX-USDC.e','AVAX-USDT','AVAX-USDT.e']);
    //console.log("expanded positions=",newpos);
    //await pool.loadWallet(netPos,"WAVAX");
    //await pool.balance(netPos);
  } catch (e) {
    console.log(e.message);
    if (await utils.shouldRetry(e.message) && retries < maxretries)
    {
      await utils.sleep(5);
      await main(retries+1);
    }
  }
}

main()


