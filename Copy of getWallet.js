const fs = require('fs');
const BigNumber = require("big-number");
const wall = require("./wallet.js");
const erc20 = require("./erc20.js");
const maps = require("./maps.js");

const DATA_PATH="/Users/phdlance/Google Drive/My Documents/Finance/Crypto/Spreadsheet Data/";

async function readFile(fname)
{
  let fullpath = DATA_PATH + "/" + fname;
  const e = fs.existsSync(fullpath);
  if (e)
  {
    console.log("file exists, reading file");
    const data = fs.readFileSync(fullpath);
    //console.log("data=",data);
    if (data.length == 0)
      return false;
    const json = JSON.parse(data);
    //console.log("read found",json);
    return json;
  }
  else
    return false;
}

function writeFile(fname,txt)
{
  try {
    let fullpath = DATA_PATH + "/" + fname;
    fs.writeFileSync(fullpath, txt, err => {
      if (err) {
        console.error(err);
        throw new Error("Could write to "+fullpath+" => fs.writeFile()");
      }
    });
  } catch (e) {
    console.log(e.message+" => writeFile() failed");
    throw new Error(e.message+" => writeFile() failed");
  }
}

async function getAmount(sym,tokenAddress,walletAddress)
{
  let amt;
  if (sym == "ETH")
  {
    amt = await wall.getBalance(walletAddress);
    //amt = parseInt(BigNumber(amt).div(BigNumber(10).pow(18-6)).toString())/1000000;
  }
  else
  {
    let c = await erc20.getContract(tokenAddress);
    amt = await erc20.balanceOf(c,walletAddress);
    //console.log("amt=",amt);
    //let decimals = await erc20.decimals(c);
    //amt = parseInt(BigNumber(amt).div(BigNumber(10).pow(decimals-6)).toString())/1000000;
  }
  console.log(sym+" amt=",amt);
  return amt;
}

async function getWalletTokens(tokens,walletAddress)
{
  let txt = "";
  for (let i=0;i<tokens.length;i++)
  {
    if (i>0)
      txt += "\n";
    const amt = await getAmount(tokens[i].symbol,tokens[i].address,walletAddress);
    txt += tokens[i].symbol+","+amt;
  }
  return txt;
}

async function main()
{
  const wname = "lance";
  const walletAddress = "0x0fFeb87106910EEfc69c1902F411B431fFc424FF";
  const wallet = await wall.init(wname,"eth");
  maps.addressMap.set("PENPIE","0x7DEdBce5a2E31E4c75f87FeA60bF796C17718715");
  //let amt;
  //amt = await getAmount("ETH",walletAddress);
  //amt = await getAmount("PENPIE",walletAddress);
  //console.log("PENPIE=",amt);
  let tokens = await readFile("primary_wallet.txt");
  let txt = await getWalletTokens(tokens,walletAddress);
  console.log("txt=",txt);
  await writeFile("primary_wallet_out.txt",txt);
}

main();
