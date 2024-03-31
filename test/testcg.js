/*

outline:
while (time < timeout)
{
  while (swapRatio)
  {
    await getQuoteWithRetry()
    if (slippage ok)
    {
      executeSwap
      if (all swapped) return;
    }
    else
      swapRatio++;
  }
}


*/
const quote = require("./quote.js");
const maps = require("./maps.js");
const wall = require("./wallet.js");
const erc20 = require("./erc20.js");

const wavaxAddr = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
const usdcAddr = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
const usdceAddr = "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664";

const avaxAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

async function main() 
{
  try {
    let q;
    q = await quote.cgQuote('avalanche-2');
    q = await quote.cgQuote('pangolin');
    console.log("Quote=",q);
  } catch (e) {
    console.log(e.message);
  }
}

main()
