const utils = require("./utils.js");
const pool = require("./poolOp.js");
const wall = require("./wallet.js");
const unic = require("./unicache.js");

async function main()
{     
  try {
    const wname = "lance";
    let wallet = await wall.initWallet(wname,"op");
    const start = parseInt(Date.now()/1000);
    let now = parseInt(Date.now()/1000);
    const TIMEOUT = 50;
    const SLEEP = 7;
    while (start + TIMEOUT > now)
    {
      try {
        await pool.calculateAndAdjust(wname,wallet.address);
        console.log("Sleeping ...");
        await utils.sleep(7);
        now = parseInt(Date.now()/1000);
      } catch (e) {
        console.log(e.message," in main while{}");
        unic.saveFile("update",wname,e.message + " => main while{} failed");
      }
    }
  } catch (e) {
    console.log(e.message," in main()");
    unic.saveFile("update",wname,e.message + " => main() failed");
  }
}  

main()
