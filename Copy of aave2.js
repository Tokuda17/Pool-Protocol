//Imports
//const Web3 = require("web3");
//require("dotenv").config();
var BigNumber = require("big-number");
const erc20 = require("./erc20.js");
const utils = require("./utils.js");
//const wall = require("./wallet.js");
const web = require("./web3.js");
const maps = require("./maps.js");
const web3 = web.web3;

/*

Target API
getPositions(port)
deposit(port,"USDC",500)
withdraw(port,"USDC",500)
borrow(port,"USDC",500)
repay(port,"USDC",500)
getRatio() - gets current ratio or add params for updated ratio
getRewards(port)
*/

//**************************************
//ABIs
//**************************************
const AaveOracleABI = require("./ABI/AaveOracle.json");
const RewardsControllerABI = require("./ABI/RewardsController.json");
require("./ABI/AaveOracle.json");
const DebtTokenABI = require("./ABI/avaxDebtToken.json");
const ATokenAbi = require("./ABI/avaxAToken.json");
const aavePoolABI = require("./ABI/Pool.json");
const aavePoolAddressesProviderABI = require("./ABI/PoolAddressesProvider.json");
//**************************************
//Addresses
//**************************************
const aaveOarcleAddress = "0xEBd36016B3eD09D4693Ed4251c67Bd858c3c7C9C";
const rewardsControllerAddress = "0x929EC64c34a17401F460460D4B9390518E5B473e";
const poolAddressesProviderAddress =
  "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb";
const aTokenAddresses = [
  "0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8", //WETH
  "0x625E7708f30cA75bfd92586e17077590C60eb4cD", //USDC
  "0x6d80113e533a2C0fe82EaBD35f1875DcEA89Ea97", //WAVAX
];
const debtTokenAddresses = [
  "0x8619d80FB0141ba7F184CbF22fd724116D9f7ffC", //DAI
  "0xfb00AC187a8Eb5AFAE4eACE434F493Eb62672df7", //USDT
  "0x4a1c3aD6Ed28a636ee1751C69071f6be75DEb8B8", //WAVAX
  "0xFCCf3cAbbe80101232d343252614b6A3eE81C989", //USDC
  "0x0c84331e39d6658Cd6e6b9ba04736cC4c4734351", //WETH
];

const aaveTokenAddresses = [
  "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", //Weth
  "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", //USDC
  "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", //USDT
  "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70", //DAI
  "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", //WAVAX
];

const aaveRewardsAddress = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"; //WAVAX Reward


//**************************************
//A Token Functions
//**************************************
async function getATokenContract(address) {
  const aTokenContract = await new web3.obj.eth.Contract(ATokenAbi, address);
  return aTokenContract;
}
async function aTokenContractBalanceOf(aTokenContract, walletAddress) {
  const aTokenBalance = await aTokenContract.methods
    .balanceOf(walletAddress)
    .call({ nonce: await web3.obj.eth.getTransactionCount(walletAddress) })
    .catch(function (e) {
      console.log(e.message);
      throw new Error(e.message+" => getATokenContractBalanceOf failed");
    });
  return aTokenBalance;
}
//**************************************
//Debt Token Functions
//**************************************

async function getDebtTokenContract(address) {
  try {
    const debtTokenContract = await new web3.obj.eth.Contract(DebtTokenABI, address);
    return debtTokenContract;
  } catch(e) {
    console.log(e.message, "getDebtTokenContract failed");
    Error(e.message+" => getDebtTokenContract failed");
  }
}

async function debtTokenContractBalanceOf(debtTokenContract, walletAddress) {
  const debt = await debtTokenContract.methods
    .balanceOf(walletAddress)
    .call({ nonce: await web3.obj.eth.getTransactionCount(walletAddress) })
    .catch(function (e) {
      console.log(e.message);
      throw new Error(e.message+" => debtTokenContractBalanceOf failed");
    });
  return debt;
}

async function debtTokenUnderlyingAssetAddress(tokenContract) {
  const address = await tokenContract.methods
    .UNDERLYING_ASSET_ADDRESS()
    .call()
    .catch(function (e) {
      console.log(e.message);
      throw new Error(e.message+" => debtTokenUnderlyingAssetAddress failed");
    });
  return address;
}

function shouldRetry(msg)
{
  if (msg.search("Failed to check for transaction receipt")>=0)
    return 1;
  else if (msg.search("nonce too low")>=0)
    return 1;
  else if (msg.search("Cannot read properties of undefined")>=0)
    return 1;
  else if (msg.search("Invalid JSON RPC response")>=0)
    return 1;
  else return 0;
}

let MAX_RETRIES = 5;

async function debtTokenBorrowAllowance(
  debtTokenContract,
  aavePoolAddress,
  walletAddress,
  retries = 0
) {
  try {
  
    //console.log("debtTokenContract in debtTokenBorrowAllowance",debtTokenContract);
    console.log("aavePoolAddress",aavePoolAddress);
    //console.log("web3.obj",web3.obj);
    //txcount= await web3.obj.eth.getTransactionCount();
    console.log("owner",walletAddress);
    const tx = await debtTokenContract.methods
      .borrowAllowance(aavePoolAddress, walletAddress)
      .send({ from: walletAddress, gas: "400000", 
        nonce: await web3.obj.eth.getTransactionCount(walletAddress) })
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => debtTokenBorrowAllowance failed");
      });

    //console.log("debtTokenBorrowAllowance tx=",tx);
    if (tx.status) console.log(tx.status);
    //console.log("approved for Borrowing");
  } catch (e) {
    if (retries < MAX_RETRIES)
    {
      if (shouldRetry(e.message))
      {
        retries++;
        await utils.sleep(3 ** retries);
        return await debtTokenBorrowAllowance(  
          debtTokenContract,
          aavePoolAddress,
          walletAddress,
          retries);
      }
    }
    console.log(e.message);
    throw new Error(e.message+" => debtTokenBorrowAllowance failed");
  }
}
async function getDebtTokenMap() {
  try {
    var mypos = [];
    for (let i = 0; i < debtTokenAddresses.length; i++) {
      const erc20Contract = await erc20.getContract(debtTokenAddresses[i]);
      let sym = await erc20.symbol(erc20Contract);
      sym = sym.replace("variableDebtAva", "");
      let d = await erc20.decimals(erc20Contract);
      //decimalsMap.set(sym, d);
      const debtOfToken = {
        id: "aave-avalanche",
        symbol: sym,
        token: debtTokenAddresses[i],
        decimals: d,
      };
      mypos.push(debtOfToken);
    }
    return mypos;
  } catch (e) {
    console.log("getDebtTokenMap " + e.message);
    throw new Error(e.message+" => getDebtTokenMap failed");
  }
}
//**************************************
//Rewards Controller
//**************************************
async function getRewardsContract()
{
  try {
    const rewardsControllerContract = await new web3.obj.eth.Contract(
      RewardsControllerABI,
      rewardsControllerAddress
    );
    return rewardsControllerContract;
  } catch(e) {
      console.log(e.message);
      throw new Error(e.message+" => getPoolContract failed");
  };
}

async function getUserRewards(walletAddress)
{
  try {
    const c = await getRewardsContract();
    // console.log("Rewards contract", c);
    const a = debtTokenAddresses.concat(aTokenAddresses);
    console.log("getRewardsContract addresses", a);
    const rewards = await c.methods
        .getUserRewards(a,walletAddress,aaveRewardsAddress)
        .call()
        .catch(function (e) {
          console.log(e.message);
          throw new Error(e.message+" => rewardsController.getUserRewards failed");
        });

    var rewardArray = [];
    if (rewards > 0)
    {
 console.log("getUserRewards aaveRewardsAddress", aaveRewardsAddress);
      const sym = maps.symbolMap.get(aaveRewardsAddress.toLowerCase());
      rewardArray = [{ 
        id: "aaveRewards", 
        symbol: sym,
        amount: rewards, 
        decimals: maps.decimalsMap.get(sym) }];
    }
 console.log("rewardArray ", rewardArray);
    return rewardArray;
  } catch(e) {
      console.log(e.message);
      throw new Error(e.message+" => getUserRewards failed");
  };
}

//**************************************
//Aave Protocol Functions
//**************************************
async function getPoolContract() {
  try {
    const poolAddressesProviderContract = await new web3.obj.eth.Contract(
      aavePoolAddressesProviderABI,
      poolAddressesProviderAddress
    );
    const poolAddress = await poolAddressesProviderContract.methods
      .getPool()
      .call()
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => getAavePoolContract failed");
      });
    const poolContract = await new web3.obj.eth.Contract(aavePoolABI, poolAddress);
    return poolContract;
  } catch(e) {
      console.log(e.message);
      throw new Error(e.message+" => getPoolContract failed");
  };
}
async function getPoolAddress() {
  try {
    const poolAddressesProviderContract = await new web3.obj.eth.Contract(
      aavePoolAddressesProviderABI,
      poolAddressesProviderAddress
      )
    const poolAddress = poolAddressesProviderContract.methods
      .getPool()
      .call()
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => getAavePoolAddress failed");
      });
    return poolAddress;
  } catch(e) {
      console.log(e.message);
      throw new Error(e.message+" => getPoolAddress failed");
  };
}

function findSymInMap(sym,tokenMap)
{
  for (let i=0;i<tokenMap.length;i++)
  {
    if (tokenMap[i].symbol.toUpperCase() == sym.toUpperCase())
      return tokenMap[i];
  }
  throw Error(sym+" not found => findSymInMap()");
}

let collateralMap = new Map();
collateralMap.set("WAVAX",0.68);
collateralMap.set("WETH.e",0.825);

// actions = [{action: "borrow",symbol: "WETH.e", usd: 325}];

function getRatio(port,actions=false)
{
  const pos = port.snapshot.positions;
  let collateral = 0;
  let debt = 0;
  for (let i=0;i<pos.length;i++)
  {
    if (pos[i].id != "aave-avalanche")
      continue;
    if (pos[i].usd > 0)
      collateral += pos[i].usd * collateralMap.get(pos[i].symbol);
    else if (pos[i].usd < 0)
      debt += -pos[i].usd;
  }
  if (actions)
  {
    let action;
    let symbol;
    let usd;
console.log("actions=",actions);
    for (let i=0;i<actions.length;i++)
    {
      action = actions[i].action;
      symbol = actions[i].symbol;
      usd = actions[i].usd;
console.log(actions[i]);
      
      if (action == "deposit")
      {
        collateral += usd * collateralMap.get(symbol);
      }
      else if (action == "withdraw")
      {
        collateral -= usd * collateralMap.get(symbol);
      }
      else if (action == "repay")
      {
        debt -= usd;  // if ratio is negative then not enough debt
      }
      else if (action == "borrow")
      {
        debt += usd;
      }
    }
  }
  const ratio = debt/collateral;
  return ratio;
}

async function borrow(port,sym,amt)
{
  const poolContract = await getPoolContract(); 
  const debtTokenMap = await getDebtTokenMap();
  console.log("debtTokenMap", debtTokenMap);
  let t = findSymInMap(sym, debtTokenMap);
  console.log("t=", t);
  const amount = BigNumber(Math.floor(amt * 1000000)).mult(BigNumber(10).pow(t.decimals-6)).toString();
  const walletAddress = port.wallets[0].walletAddress;
  await borrowInternal(poolContract, t.token, amount, walletAddress);
}

async function borrowInternal(aavePoolContract, debtToken, amount, walletAddress, retries = 0) {
  try {
    console.log("aave borrow");
    const interestRateMode = 2; //variable debt
    const referralCode = 0; //must be 0 right now
  const onBehalfOf = walletAddress;
    //check to see if borrow is possible
    //approve borrow
    const debtTokenContract = await getDebtTokenContract(debtToken);
    //console.log("got debtTokenContract", debtTokenContract);
    const poolAddress = await getPoolAddress();
    console.log("got PoolAddress", poolAddress);
    const token = await debtTokenUnderlyingAssetAddress(debtTokenContract);
    console.log("got debtTokenUnderlyingAssetAddress", token);
    console.log("walletAddress", walletAddress);

    await debtTokenBorrowAllowance(debtTokenContract, poolAddress, walletAddress);
    console.log("got debtTokenBorrowAllowance");
    console.log("token", token);
    //console.log("aavePoolContract", aavePoolContract);
    await aavePoolContract.methods
      .borrow(
        token,
        amount.toString(),
        interestRateMode,
        referralCode,
        onBehalfOf
      )
      .send({ from: walletAddress, gas: "1000000", 
        nonce: await web3.obj.eth.getTransactionCount(walletAddress) })
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => aaveBorrow failed");
    });
    console.log("borrow completed");
  } catch (e) {
    if (retries < MAX_RETRIES)
    {
      if (shouldRetry(e.message))
      {
        retries++;
        await utils.sleep(3 ** retries);
        return await borrowInternal(aavePoolContract, debtToken, amount, walletAddress, retries);
      }
    }
  }
}

async function repay(port,sym,amt)
{
  const poolContract = await getPoolContract(); 
  const token = maps.addressMap.get(sym);
  const c = await erc20.getContract(token);
  const decimals = await erc20.decimals(c);
  const amount = BigNumber(Math.floor(amt * 1000000)).mult(BigNumber(10).pow(decimals-6)).toString();
  const walletAddress = port.wallets[0].walletAddress;
  console.log("repay",token,amount,walletAddress);
  await repayInternal(poolContract, c, token, amount, walletAddress);
}

async function repayInternal(
  aavePoolContract,
  erc20Contract,
  token,
  amount,
  walletAddress,
  retries = 0
) 
{
  try {
    const rateMode = 2; //variable debt
console.log("ri 1");
    const onBehalfOf = walletAddress;
    const poolAddress = await getPoolAddress();
console.log("ri 2");
    await erc20.approve(erc20Contract, onBehalfOf, poolAddress, amount.toString());
console.log("ri 3");
    await aavePoolContract.methods
      .repay(token, amount.toString(), rateMode, onBehalfOf)
      .send({ from: walletAddress, gas: "1000000", 
        nonce: await web3.obj.eth.getTransactionCount(walletAddress) })
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => repayInternal() failed");
    });
console.log("ri 4");
  } catch (e) {
    if (retries < MAX_RETRIES)
    {
      if (shouldRetry(e.message))
      {
        retries++;
        await utils.sleep(3 ** retries);
        return await repay( aavePoolContract, erc20Contract, token, 
          amount, walletAddress, retries);
      }
    }
    console.log(e.message);
    throw new Error(e.message+" => repayInternal() failed");
  }
}

async function deposit(port,sym,amt)
{
  const poolContract = await getPoolContract(); 
  const token = maps.addressMap.get(sym);
  const c = await erc20.getContract(token);
  const decimals = await erc20.decimals(c);
  const amount = BigNumber(Math.floor(amt * 1000000)).mult(BigNumber(10).pow(decimals-6)).toString();
  const walletAddress = port.wallets[0].walletAddress;
  await depositInternal(poolContract, c, token, amount, walletAddress);
}

async function depositInternal(
  aavePoolContract,
  tokenContract,
  token,
  amount,
  walletAddress
) {
  const poolAddress = await getPoolAddress();
  await erc20.approve(tokenContract, walletAddress, poolAddress, amount);
  await aavePoolContract.methods
    .supply(token, amount, walletAddress, 0)
    .send({ from: walletAddress, gas: "400000", 
      nonce: await web3.obj.eth.getTransactionCount(walletAddress) })
    .catch(function (e) {
      console.log(e.message);
      throw new Error(e.message+" => aaveDeposit failed");
    });
}

async function withdraw(port,sym,amt)
{
  const poolContract = await getPoolContract(); 
  const token = maps.addressMap.get(sym);
  const c = await erc20.getContract(token);
  const decimals = await erc20.decimals(c);
  const amount = BigNumber(Math.floor(amt * 1000000)).mult(BigNumber(10).pow(decimals-6)).toString();
  const walletAddress = port.wallets[0].walletAddress;
  await withdrawInternal(poolContract, token, amount, walletAddress);
}

async function withdrawInternal(aavePoolContract, token, amount, walletAddress) {
  await aavePoolContract.methods
    .withdraw(token, amount, walletAddress)
    .send({ from: walletAddress, gas: "500000",
            nonce: await web3.obj.eth.getTransactionCount(walletAddress) })
    .catch(function (e) {
      console.log(e.message);
      throw new Error(e.message+" => aaveWithdraw failed");
    });
}
async function getUserAccountData(poolContract, walletAddress) {
  const data = await poolContract.methods
    .getUserAccountData(walletAddress)
    .call({ nonce: await web3.obj.eth.getTransactionCount(walletAddress) })
    .catch(function (e) {
      console.log(e.message);
      throw new Error(e.message+" => getUserAccountData failed");
    });
  return data;
}
async function canBorrowMoney(token, amount, walletAddress) {
  try {
    if (BigNumber(amount).lte(0)) return true;
    const poolContract = await getPoolContract();

    const data = await getUserAccountData(poolContract, walletAddress);
    console.log(data.availableBorrowsBase);
    const availableBorrowBase = BigNumber(data.availableBorrowsBase)
      .mult(10000000000)
      .toString();
    const borrowAmount = await convertToUSD(token, amount, walletAddress);
    console.log(availableBorrowBase);
    console.log(borrowAmount);
    const test = BigNumber(availableBorrowBase).gt(BigNumber(borrowAmount));

    return test;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => canBorrowMoney failed");
  }
}
async function isDebtAvailableToRepay(
  tokenFrom,
  amount,
  tokenTo,
  walletAddress
) {
  try {
    //console.log("getting amount from");

    const amountFrom = await convertToUSD(tokenFrom, amount, walletAddress);
    const aaveOracleContract = await getOracleContract();
    const debtByToken = await getDebtByToken(walletAddress);

    let debt;
    for (let i = 0; i < debtByToken.length; i++) {
      if (debtByToken[i].token == tokenTo) {
        debt = BigNumber(debtByToken[i].amount).mult(BigNumber(-1)).toString();
        break;
      }
    }
    debt = await convertToUSD(tokenTo, debt, walletAddress);

    return BigNumber(amountFrom).lt(debt);
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => isDebtAvailableToRepay failed");
  }
}
async function getOracleContract() {
  const aaveOracleContract = new web3.obj.eth.Contract(
    AaveOracleABI,
    aaveOarcleAddress
  );
  return aaveOracleContract;
}
async function getPriceOfToken(aaveOracleContract, token, walletAddress) {
  try {
    //console.log("entering getPriceOfToken");
    //console.log("token",token);
    //console.log("walletAddress",walletAddress);
    const tokenPrice = await aaveOracleContract.methods
      .getAssetPrice(token)
      .call({ nonce: await web3.obj.eth.getTransactionCount(walletAddress) })
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+
          " => getPriceOfTokenAave failed, likey because you are not using a token native to the Aave platform"
        );
      });
    //console.log("token price = ", tokenPrice);
    return tokenPrice; //divides the amount by 10 ^ 8 because aave comes in 8 decimals
  } catch (e) {
    console.log(e.message + " => getPriceOfToken ");
    throw new Error(e.message+" => getPriceOfToken failed");
  }
  //This most likely happens because you are not using a token native to the AAVE platform
}
async function getPriceOfAllTokens(walletAddress) {
  try {
    const aaveOracleContract = await getOracleContract();

    //console.log("Entering getPriceOfAllTokens",walletAddress);
    var tokenToPrice = [];
    for (let i = 0; i < aaveTokenAddresses.length; i++) {
    //console.log("First token ",aaveTokenAddresses[i]);
      const price = await getPriceOfToken(
        aaveOracleContract,
        aaveTokenAddresses[i],
        walletAddress
      );
    //console.log("got priceoftoken ",price)
      const erc20Contract = await erc20.getContract(aaveTokenAddresses[i]);
    //console.log("got erc20contract ");
      let sym = await erc20.symbol(erc20Contract);
    //console.log("sym ", sym);
      let d = await erc20.decimals(erc20Contract);
    //console.log("d ",d);
      tokenToPrice.push({ id: "aave-oracle", symbol: sym, token: aaveTokenAddresses[i], price: price, decimals: d });
    }
    return tokenToPrice;
  } catch (e) {
    console.log("getPriceOfAllTokensAave " + e.message);
    throw new Error(e.message+" => getPriceOfAllTokensAave failed");
  }
}
async function convertToUSD(token, amount, walletAddress) {
  try {
    console.log("convertToUSD walletAddress", walletAddress);
    const tokenContract = await erc20.getContract(token); //gets token contract
    const decimals = await erc20.decimals(tokenContract, token); //gets decimals of token
    const factor = 18 - decimals; //gets the factor to reach 18 decimals
    //console.log("1");
    const amountInDecimal = BigNumber(amount)
      .mult(BigNumber(10).pow(factor))
      .toString(); //gets the amount in 18 decimals
    //console.log("2");
    const aaveOracleContract = await getOracleContract(); //gets the aave oracle
    const tokenPrice = Math.floor(
      await getPriceOfToken(aaveOracleContract, token, walletAddress)
    ); //gets the token price
    //console.log("3");
    const amountInUSD = BigNumber(tokenPrice)
      .mult(amountInDecimal)
      .div(BigNumber(10).pow(8))
      .toString();
    //console.log("4");
    //multiples the 18 decimal amount by the token price
    return amountInUSD;
  } catch (e) {
    console.log("convertToUSD " + e.message);
    throw new Error(e.message+" => convertToUSD failed");
  }
}
async function convertFromTokenToToken(tokenFrom, tokenTo, amount,walletAddress) {
  try {
    console.log ("convertFromTokenToToken",tokenFrom,tokenTo,amount,walletAddress);
    const tokenToContract = await erc20.getContract(tokenTo); //gets token contract of token to
    const oracle = await getOracleContract(); //gets oracle contract
    const tokenFromUSD = await convertToUSD(tokenFrom, amount,walletAddress); //converts the tokenFrom to USD
    const decimals = await erc20.decimals(tokenToContract, tokenTo); //gets the decimals of the token to
    const factor = 18 - decimals; //gets the factor amount
    const priceTo = Math.floor(await getPriceOfToken(oracle, tokenTo, walletAddress));

    //gets the price of the token to.

    const convertedAmount = BigNumber(tokenFromUSD)
      .mult(100000000)
      .div(priceTo)
      .div(BigNumber(10).pow(factor))
      .toString();

    // const a = BigNumber(tokenFromUSD)
    //   .div(priceTo)
    //   .div(BigNumber(10).pow(factor))
    //   .toString(); //takes tokenFromUSD, divides it by the price per coin to, divides it by 18 - the number of decimals

    return convertedAmount;
  } catch (e) {
    console.log("convertFromTokenToToken " + e.message);
    throw new Error(e.message+" => convertFromTokenToToken failed");
  }
}
//remove this at some point
async function getDebtByToken(walletAddress) {
  try {
    var mypos = [];
    console.log("debtTokenAddresses=",debtTokenAddresses);
    for (let i = 0; i < debtTokenAddresses.length; i++) {
      const debtTokenContract = await getDebtTokenContract(
        debtTokenAddresses[i]
      );
      const debt = await debtTokenContractBalanceOf(
        debtTokenContract,
        walletAddress
      );
      const address = await debtTokenUnderlyingAssetAddress(debtTokenContract);
      const erc20Contract = await erc20.getContract(address);
      const d = await erc20.decimals(erc20Contract);
      const amt = parseInt(BigNumber(debt).mult(-1).div(BigNumber(10).pow(d-6)).toString())/1000000;
      if (debt > 0) {
        let sym = await erc20.symbol(erc20Contract);
        let d = await erc20.decimals(erc20Contract);
        //decimalsMap.set(sym, d);
        const debtOfToken = {
          id: "aave-avalanche",
          symbol: sym,
          token: address,
          amount: BigNumber(debt).mult(-1).toString(),
          amt: amt,
          decimals: d,
          usd: amt * maps.priceMap.get(sym.toUpperCase())
        };
        mypos.push(debtOfToken);
      }
    }
    return mypos;
  } catch (e) {
    console.log("getDebtByToken " + e.message);
    throw new Error(e.message+" => getDebtByToken failed");
  }
}

//get collateral
async function getCollateralByToken(walletAddress) {
  try {
    var mypos = [];
    for (let i = 0; i < aTokenAddresses.length; i++) {
      const aTokenContract = await getATokenContract(aTokenAddresses[i],walletAddress);
      //console.log("Getting balance of: " + aTokenAddresses[i]);
      const balance = await aTokenContractBalanceOf(aTokenContract,walletAddress);
      //console.log("GETCOLLATERBYTOKEN balance=",balance);
      const address = await debtTokenUnderlyingAssetAddress(aTokenContract);
      const erc20Contract = await erc20.getContract(address);
      //console.log("getCollateralByToken balance=",balance);
      if (balance > 0) {
        let sym = await erc20.symbol(erc20Contract);
        let d = await erc20.decimals(erc20Contract);
        let amt = parseInt(BigNumber(balance).div(BigNumber(10).pow(d-6)).toString())/1000000;
        //decimalsMap.set(sym, d);
        const balanceOfToken = {
          id: "aave-avalanche",
          symbol: sym,
          token: address,
          amount: balance,
          amt: amt,
          decimals: d,
          usd: amt * maps.priceMap.get(sym.toUpperCase())
        };
      //console.log("getCollateralByToken end balance=",balanceOfToken.amount);
        mypos.push(balanceOfToken);
      }
    }
    return mypos;
  } catch (e) {
    console.log("getCollateralByToken " + e.message);
    throw new Error(e.message+" => getCollateralByToken failed");
  }
}

async function getPositions(port) {
  try {
    const walletAddress = port.wallets[0].walletAddress;
console.log("walletAddress=",walletAddress,port);
    const debt = await getDebtByToken(walletAddress);
console.log("debt=",debt);
    const collateral = await getCollateralByToken(walletAddress);
    const pos = collateral.concat(debt);
    return pos;
  } catch (e) {
    console.log("getAavePositions " + e.message);
    throw new Error(e.message+" => getAavePositions failed");
  }
}

async function getHealthFactor(poolContract, walletAddress) {
  const data = await getUserAccountData(poolContract, walletAddress);
  return data.healthFactor;
}

async function getDebtRatio(poolContract, walletAddress) {
  try {
    const data = await getUserAccountData(poolContract, walletAddress);
    const debtRatio = BigNumber(data.totalDebtBase)
      .mult(100)
      .div(BigNumber(data.totalCollateralBase))
      .toString();
    return debtRatio;
  } catch (e) {
    throw new Error(e.message + " => getDebtRatio failed");
  }
}
async function getCollateralBase(poolContract, walletAddress) {
  const data = await getUserAccountData(poolContract, walletAddress);
  return data.totalCollateralBase;
}

module.exports = Object.assign({
  getPositions,
  borrow,
  repay,
  deposit,
  withdraw,
  getRatio,
  getUserRewards,
  getDebtRatio,
  getCollateralBase,
  getHealthFactor,
  getATokenContract,
  aTokenContractBalanceOf,
  getDebtTokenContract,
  debtTokenContractBalanceOf,
  debtTokenUnderlyingAssetAddress,
  debtTokenBorrowAllowance,
  getPoolContract,
  getPoolAddress,
  getUserAccountData,
  canBorrowMoney,
  isDebtAvailableToRepay,
  getOracleContract,
  getPriceOfToken,
  getPriceOfAllTokens,
  convertToUSD,
  convertFromTokenToToken,
  getDebtByToken,
  getDebtTokenMap,
});
