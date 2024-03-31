const pool = require("./pool.js");
const wall = require("./wallet.js");
const user = require("./user.js");
const utils = require("./utils.js");
const nodemailer = require("./nodemailer.js");

async function main(retries=0) 
{
  const maxretries = 3;
  var wname = "default";
  //nodemailer.sendMail("calculateAndAdjust","running");
  if (process.argv.length >= 3)
  {
    wname = process.argv[2];
  }
  let wallet = await wall.init(wname);
  nodemailer.init(wname);
  const TIMEOUT = 40;
  const SLEEP = 10;
  const start = Math.floor(Date.now()/1000);
  let now = Math.floor(Date.now()/1000);
  while (start + TIMEOUT > now)
  {
    try {
      const init = user.getInit(wname);
      console.log("init",init);
      await pool.calculateAndAdjust(wname,wallet.address,false,init);
      console.log("Sleeping ...");
      console.log("Start="+start+ " Now="+now+" Timeout="+TIMEOUT);
      await utils.sleep(SLEEP);
    } catch (e) {
      console.log(e.message);
      if (utils.shouldRetry(e.message) && retries < maxretries)
      {
        retries++;
      }
      else
      {
        break; 
      }
    } 
    now = Math.floor(Date.now()/1000);
  }
}

main()
