const pool = require("./poolV3tj.js");
const portfolio=require("./porttj.js");
const wall = require("./wallet.js");

async function main()
{     
  let port = portfolio.get();
  port.email = false;
  console.log("main");
  await pool.calculate(port,false);
}  

main()
