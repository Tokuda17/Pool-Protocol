let univ3 = require("./univ3.js");
const pool=require("./poolV3.js");
const portfolio=require("./portfolio.js");
  
async function main()
{
  let port = portfolio.get();
  port.snapshot = await pool.getPositions(port);
/*
  let tick = univ3.getTickFromPrice(1250);
  console.log("tick=",tick);
*/
  let price = await univ3.getEthPrice();
  console.log("ETH price=",price);
}

main();
