const kucoin = require("./kucoin.js");
const quote = require("./quote.js");
const inchnew = require("./1inchnew.js");
const chain = require("./chain.js");
const wall = require("./wallet.js");
const swap = require("./swap.js");
const erc20 = require("./erc20.js");
const BigNumber = require("big-number");

async function main() 
{
  try {
    var wname = "lance";
    let wallet = await wall.init(wname,"avax");
    inchnew.swap("PNG","USDC",0.1);    
  } catch (e) {
    console.log(e.message);
  }
}

main()
