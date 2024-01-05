const pool = require("./poolV3tj.js");
const portfolio = require("./porttj.js");

async function main()
{     
  let port = portfolio.get(); 
  console.log("port=",port);
  let pos = await pool.calculate(port);
  //let await pool.addLiquidity(port);
} 

main()
