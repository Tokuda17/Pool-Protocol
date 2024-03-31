const pool = require("./poolOp.js");
const wall = require("./wallet.js");
const nodemailer = require("./nodemailer.js");
const web = require("./web3.js");
const web3 = web.web3;

async function main()
{     
  const wname = "lance";
  let wallet = await wall.init(wname,"poly");
  await pool.init("poly");
  await nodemailer.init("poly");
  //await uni.removePositions(wname,wallet.address);
  while (true)
  {
    let pos = await pool.getPositions(wname,wallet.address);
    let tid = await pool.defundPosition(wname,wallet.address,pos,true);
    if (tid)
      continue;
    break;
    //  await uni.removePositions(wname,wallet.address);
  }
}  

main()
