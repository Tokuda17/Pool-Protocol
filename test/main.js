//imports
//const Web3 = require("web3");
//require("dotenv").config();
//var BigNumber = require("big-number");
//const AVALANCHE_RPC_URL = process.env.AVALANCHE_RPC_URL;
//const web3 = new Web3(AVALANCHE_RPC_URL);
//imports modules
const debt = require("./adjustdebt");
//const erc = require("./erc20");
//const aave = require("./aave");
const wall = require("./wallet");
const np = require("./netPosition");
//adjustDebt(debtTokenFrom: any, amount: any, tokenTo: any): Promise<void>

async function main() {
  try {
    var wname = "default";
    if (process.argv.length >= 3) {
      wname = process.argv[2];
    }
    await np.initNetPosition(wname);
    console.log("symbol map", np.symbolMap);
    const wallet = await wall.initWallet(wname, false);
    walletAddress = wallet.address;
    // const test = await np.symbolMap;
    // console.log(test);
    await debt.adjustDebt("USDC", 25.7, "WAVAX", walletAddress);
  } catch (e) {
    console.log(e.message);
  }
}
main();
