const pool = require("./poolV3tj.js");
const wall = require("./wallet.js");
const nodemailer = require("./nodemailer.js");
const portfolio = require("./porttj.js");
const web = require("./web3.js");
const web3 = web.web3;

async function main()
{     
  let port = portfolio.get();

  while (true)
  {
    let pos = await pool.getPositions(port);
    port.snapshot = pos;
    let tid = await pool.defundPosition(port,true);
    if (tid !== true)
      continue;
    break;
  }
  pool.setState(false);
}  

main()
