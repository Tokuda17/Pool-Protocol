const user = require("./user.js");
const pool = require("./pool.js");
const utils = require("./utils.js");
const wall = require("./wallet.js");
const nodemailer = require("./nodemailer.js");

async function main(retries=0)
{
  const maxretries = 5;
  try {
    var wname = "lance";
console.log("main.1",wname);
    let init = user.getInit(wname);
    init.email = "michael";
    await wall.initInit(init);
console.log(init);
//console.log("main.2");
//    let wallet = await wall.init(wname);
//    init.walletAddress = wallet.address;
console.log("main.3");
    nodemailer.init(wname);
console.log("main.4");
    await pool.calculate(init,true);
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

