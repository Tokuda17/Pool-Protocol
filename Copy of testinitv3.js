const web=require("./web3.js");
const alchemy=require("alchemy-sdk");
const pool=require("./poolMulti.js");
const multi=require("./multiswap.js");
const unic=require("./unicache.js");
const univ3=require("./univ3.js");
const wall=require("./wallet.js");
const portfolio=require("./portfolio.js");

function testmod(port)
{
  port.testattribute = "here i am";
}
async function main()
{
  let port = portfolio.get();
  web.init("poly");
  let {iVamt,iSusd} =  univ3.getInitPosition(200970,51416174681361);
  console.log("main",iVamt,iSusd);
}

main();
