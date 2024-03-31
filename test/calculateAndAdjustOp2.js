const pool = require("./poolOp.js");
const wall = require("./wallet.js");

async function main()
{     
  const wname = "lance";
  let wallet = await wall.initWallet(wname,"op");
  await pool.calculateAndAdjust(wname,wallet.address);
}  

main()
