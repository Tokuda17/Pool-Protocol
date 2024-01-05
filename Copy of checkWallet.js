const BigNumber = require("big-number");
const pool = require("./pool.js");
const inch = require("./1inch.js");
const wall = require("./wallet.js");
const erc20 = require("./erc20.js");
const maps = require("./maps.js");
const nodemailer = require("./nodemailer.js");

async function mailReminder(sym)
{
console.log("mailReminder",sym);
    nodemailer.init("default");
    nodemailer.setSubjectStartOption("IMPORTANT: Add more "+sym);
    body = "Add more "+sym+"\nCall Lance if you get four of these in a row! (15 min apart)";
    nodemailer.sendMail("",body);
}

async function checkWallet(addr,sym,targetAmt)
{
  let amt;
  if (sym == "AVAX")
  {
    amt = await wall.getBalance(addr);
    amt = parseInt(BigNumber(amt).div(BigNumber(10).pow(18-6)).toString())/1000000;
  }
  else
  {
    let c = await erc20.getContract(maps.addressMap.get(sym));
    amt = await erc20.balanceOf(c,addr);
    let decimals = await erc20.decimals(c);
    amt = parseInt(BigNumber(amt).div(BigNumber(10).pow(decimals-6)).toString())/1000000;
  }
  console.log(sym+" amt=",amt,targetAmt);
  if (amt < targetAmt) 
    return false;
  return true;
}

async function main()
{
  const wname = "lance";
  const wallet = await wall.init(wname);
  await inch.initMaps("avax");
  let status;
  status = await checkWallet(wallet.address,"AVAX",0.5);
  if (!status)
  {
    await mailReminder("AVAX");
    return;
  }
  status = await checkWallet(wallet.address,"WAVAX",300);
  if (!status)
  {
    await mailReminder("WAVAX");
    return;
  }
  status = await checkWallet(wallet.address,"USDC",7400);
  if (!status)
  {
    await mailReminder("USDC");
    return;
  }
}

main();
