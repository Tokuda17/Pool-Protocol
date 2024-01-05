const user=require("./user.js");
const wall=require("./wallet.js");
const utils = require("./utils.js");
const maps = require("./maps.js");
const erc20 = require("./erc20.js");
const fs = require('fs');
const DATA_PATH="/Users/phdlance/Google Drive/My Documents/Finance/Crypto/Spreadsheet Data";

function writeFile(fname,val)
{
  try {
    let path = DATA_PATH;
    fs.mkdirSync(path, { recursive: true });
console.log("path=",path);
    //fs.appendFile(path+"/"+id+".json", json+"\n\n", err => {
    fs.writeFileSync(path+"/"+fname+".txt", val, err => {
      if (err) {
        console.error(err);
        throw new Error("Could write to "+fname+" => fs.writeFile()");
      }
    });
  } catch (e) {
    console.log(e.message+" => writeFile() failed");
    throw new Error(e.message+" => writeFile() failed");
  }
}

const tokenAddresses = [
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // avax
  "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // wavax
  "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", // weth.e
  "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // usdc
  "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", // usdc.e
  "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", // usdt
  "0xc7198437980c041c805A1EDcbA50c1Ce5db95118", // usdt.e
  "0x60781C2586D68229fde47564546784ab3fACA982"  // png
];

async function main()
{
  try {
    let init = user.getInit("lance");
console.log("user.getInit()");
    await erc20.initMaps(tokenAddresses);
console.log("erc20.initMaps()");
    await wall.initInit(init);
console.log("wall.initInit(init)");
    let newpos = await wall.getPositions(init.walletAddress,maps.addressMap);
console.log(newpos);
    let txt = "";
    for (let i=0;i<newpos.length;i++)
    {
      txt += newpos[i].symbol+","+newpos[i].amount+"\n";
    }
    writeFile("avax_wallet_out",txt);
  } catch (e) {
    console.log(e.message);
  }
}

main()
