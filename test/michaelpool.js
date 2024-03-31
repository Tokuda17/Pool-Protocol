//Imports

require("dotenv").config();
var BigNumber = require("big-number");
const maps = require("./maps.js");
const erc20 = require("./erc20.js");
const nodemailer = require("./nodemailer.js");
const aave = require("./aave.js");
const alpha = require("./alpha.js");
const pan = require("./pan.js");
const wall = require("./wallet.js");
const inch = require("./1inch.js");
const factory = require("./panFactory.js");
const web3 = require("./web3.js");
var wallet;

const TRADE_THRESHOLD = 1.2; // percent
const NATIVE_WALLET_RESERVE = wall.NATIVE_WALLET_RESERVE;
//*********************************************************************
// Misc support functions
//*********************************************************************
function printMap(name, map) {
  console.log(name);
  map.forEach((value, key) => {
    console.log(key, value);
  });
}

function isNativeEquivalent(sym) {
  return ["WAVAX", "AVAX"].includes(sym.toUpperCase());
}

function isNative(sym) {
  return ["AVAX"].includes(sym.toUpperCase());
}

function isStablecoin(sym) {
  //console.log("is stablecoin");
  //console.log(sym);
  return ["USDC", "USDT", "USDC.E", "DAI", "USDT.E", "DAI.E"].includes(
    sym.toUpperCase()
  );
}

function getSymbolFromArray(sym, a) {
  //console.log("getsymbolfromarray");
  //console.log(sym,a);
  for (let i = 0; i < a.length; i++) {
    if (a[i].symbol.toUpperCase() == sym.toUpperCase()) return a[i];
  }
  throw Error("getSymbolFromArray ", sym, " not found");
}

function getIdSymbolFromArray(id, sym, a) {
  //console.log("getsymbolidfromarray");
  //console.log(id,sym,a);
  for (let i = 0; i < a.length; i++) {
    if (a[i].id == id) {
      if (a[i].symbol.toUpperCase() == sym.toUpperCase()) return a[i];
    }
  }
  throw Error("getSymbolFromArray ", sym, " not found");
}

// divides two number and returns a decimal with decimal places of precision
function getDecimalDivision(numerator, denominator, decimal) {
  let n = BigNumber(numerator)
    .mult(10 ** decimal)
    .div(denominator)
    .toString();
  n = parseInt(n) / 10 ** decimal;
  return n;
}

function addCommas(n, dollar) {
  if (dollar === true) dollar = "$";
  else dollar = "";
  if (n < 0) {
    minus = "-";
    n = -n;
  } else minus = "";
  if (n < 1000) {
    n = Math.floor(n * 100) / 100.0;
    return minus + dollar + n;
  } else {
    n = Math.floor(n);
    return minus + dollar + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
}

// creates addressMap, symbolMap, and decimalsMap from an array of positions
// a position is { symbol: <sym>, token: <address>, decimals: <decimals> }
// xxx possibly remove the maps and just pass around the values in the positions
function addPositionsToMaps(pos) {
  //console.log("CREATE MAPS",pos.length);
  for (let i = 0; i < pos.length; i++) {
    if (pos[i].symbol !== undefined) {
      if (pos[i].token !== undefined) {
        //console.log("sym",pos[i].symbol,"token",pos[i].token);
        maps.addressMap.set(pos[i].symbol, pos[i].token);
        maps.symbolMap.set(pos[i].token, pos[i].symbol);
      }
      if (pos[i].decimals !== undefined) {
        maps.decimalsMap.set(pos[i].symbol, pos[i].decimals);
        //console.log("dec",pos[i].decimals);
      }
    }
  }
  //console.log ("MAPS CREATED");
}

function initMaps() {
  maps.addressMap.set("PNG", "0x60781C2586D68229fde47564546784ab3fACA982");
  maps.symbolMap.set("0x60781C2586D68229fde47564546784ab3fACA982", "PNG");
  maps.addressMap.set(
    "AVAX-USDC.e",
    "0xbd918Ed441767fe7924e99F6a0E0B568ac1970D9"
  );
  maps.symbolMap.set(
    "0xbd918Ed441767fe7924e99F6a0E0B568ac1970D9",
    "AVAX-USDC.e"
  );
}

async function exchangeRewards(
  wname,
  owner,
  walletPng,
  toAddress = "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664"
) {
  if (wname == "lance") {
    // convert to WETH instead of USDC.e
    toAddress = "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB";
  }
  //console.log("EXCHANGE REWARDS:", walletPng);
  try {
    //console.log("Inside Try:");
    const threshold = alpha.getClaimThreshold(wname);
    //console.log("Threshold:", threshold);
    const amount = parseInt(
      BigNumber(walletPng.amount).div(BigNumber(10).pow(walletPng.decimals))
    );
    if (amount >= threshold) {
      console.log("Need to SELL PNG:", walletPng);
      pAddress = maps.addressMap.get("PNG");
      console.log("Calling swap");
      pContract = await erc20.getContract(pAddress);
      await inch.swap(pContract, pAddress, toAddress, walletPng.amount, owner);
      console.log("Swapping PNG for USDC.e or other token");
    }
  } catch (e) {
    console.log("exchangeRewards " + e.message);
    throw new Error(e.message + " => exchangeRewards failed");
  }
}

async function calculateNetPositions(wname, owner) {
  try {
    console.log("calculateNetPositions", wname, owner);
    initMaps();
    console.log("initMaps");
    //const ct = await alpha.getClaimThreshold(wname);
    //console.log("getclaimthresh",ct);

    const alphaPos = await alpha.getPositions(owner);
    console.log("getPositions");
    const alphaRewards = alphaPos.rewards;
    //console.log("ALPHA REWARDS:", alphaRewards);
    await alpha.claimRewards(wname, owner, alphaRewards);
    var pos = alphaPos.positions;
    var pos2 = await aave.getPositions(owner);
    pos = pos.concat(pos2);
    addPositionsToMaps(pos); // addressMap and other maps filled in here
    var pos3 = await wall.getPositions(owner, maps.addressMap);
    pos = pos.concat(pos3);
    let walletPng = getIdSymbolFromArray("wallet", "PNG", pos);
    await exchangeRewards(wname, owner, walletPng);
    let usd = 0;
    let native = 0;
    for (let i = 0; i < pos.length; i++) {
      //console.log("i=",i);
      let sym = pos[i].symbol;
      let id = pos[i].id;
      if (id == "rewards") continue;
      //console.log("sym=",sym);
      if (isStablecoin(sym)) {
        usd = BigNumber(usd).add(pos[i].amount).toString();
      } else if (isNativeEquivalent(sym)) {
        native = BigNumber(native).add(pos[i].amount).toString();
      } else {
      }
    }
    let netpos = [
      { id: "net", symbol: "USD", amount: usd, decimals: 6 },
      { id: "net", symbol: "AVAX", amount: native, decimals: 18 },
      { id: "rewards", rewards: alphaRewards },
    ];
    netpos = netpos.concat(pos);

    return netpos;
  } catch (e) {
    console.log("calculateNetPositions " + e.message);
    throw new Error(e.message + " => calculateNetPositions failed");
  }
}

async function calculateAndAdjust(wname, addr, mailResults = true) {
  try {
    let netPosition = await calculateNetPosition(wname, addr, true);
    let avVal = netPosition.variableValue;
    let avTokens = netPosition.borrowVariableTokens;
    let uVal = netPosition.stableValue;
    let spread = netPosition.tradeThreshold;
    let netVal = netPosition.netVal;
    let printNetVal = addCommas(netVal, true);
    let printAvTokens = addCommas(avTokens);
    let printAvVal = addCommas(avVal, true);
    let printSpread = addCommas(spread, true);
    if (avVal > spread) {
      console.log("YOU ARE LONG AVAX!  TRADING ...", wname);
      if (wname != "lance") {
        console.log("calling adjustDebt");
        await adjustDebt("WAVAX", avTokens, "USDC", addr);
        if (mailResults)
          await nodemailer.sendMail(
            "SELLING " + printAvTokens + " AVAX",
            "You are LONG " + printAvVal + ". Net Value = " + printNetVal
          );
      } else {
        if (mailResults)
          await nodemailer.sendMail(
            "SELLING " + printAvTokens + " AVAX",
            "Not trading lance's wallet. You are LONG " +
              printAvVal +
              ". Net Value = " +
              printNetVal
          );
      }
      //avTokens = addCommas(avTokens);
      //avVal = addCommas(avVal,true);
      //console.log("You are LONG, SELL", avTokens, "AVAX = $", avVal);
      //console.log("USD=$", uVal);
    } else if (avVal < -spread) {
      let printMavTokens = addCommas(-avTokens);
      let printMavVal = addCommas(-avVal, true);
      console.log("YOU ARE SHORT AVAX!  TRADING ...");
      if (wname != "lance") {
        await adjustDebt("USDC", -avVal, "WAVAX", addr);
        if (mailResults)
          await nodemailer.sendMail(
            "BUYING " + printMavVal + " of AVAX",
            "You are SHORT " +
              printMavTokens +
              " AVAX. Net Value = " +
              printNetVal
          );
      } else {
        if (mailResults)
          await nodemailer.sendMail(
            "BUYING " + printMavVal + " of AVAX",
            "Not trading lance's wallet. You are SHORT " +
              printMavTokens +
              " AVAX. Net Value = " +
              printNetVal
          );
      }
      //avTokens = addCommas(-avTokens);
      //avVal = addCommas(-avVal,true);
      //console.log("You are SHORT", avTokens, "AVAX, BUY", avVal, "of AVAX");
      //console.log("USD=$", uVal);
    } else {
      console.log("Your AVAX postion is", avTokens);
      //      if (wname == "lance")
      //      {
      //        if (mailResults)
      nodemailer.sendMail(
        "Your AVAX postion is " + avTokens,
        "AVAX = " +
          printAvVal +
          ", Net Value = " +
          printNetVal +
          ", Spread = " +
          printSpread
      );
      //      }
    }
  } catch (e) {
    console.log(e.message);
    nodemailer.sendMail(
      "calculateAndAdjust() failed",
      e.message + " => calculateAndAdjust failed"
    );
    throw Error(e.message + " => calculateAndAdjust failed");
  }
}

async function calculateNetPosition(wname, addr) {
  try {
    const netPos = await calculateNetPositions(wname, addr);
    console.log(netPos);

    const tokenToPrice = await aave.getPriceOfAllTokens(addr);

    const avaxTokenToPrice = getSymbolFromArray("WAVAX", tokenToPrice);
    let avaxPrice = avaxTokenToPrice.price * 100000000;

    let av = getIdSymbolFromArray("net", "AVAX", netPos);
    let avVal = BigNumber(av.amount)
      .mult(avaxPrice)
      .div(BigNumber(10).power(av.decimals))
      .div(BigNumber(10).power(8))
      .toString();
    // avTokens is the number of AVAX tokens to two decimal places
    let avTokens = getDecimalDivision(
      av.amount,
      BigNumber(10).power(av.decimals).toString(),
      2
    );

    let u = getSymbolFromArray("usd", netPos);
    // uVal = net dollar value of all stablecoin positions
    let uVal = BigNumber(u.amount)
      .div(BigNumber(10).power(u.decimals))
      .toString();

    let ad = getIdSymbolFromArray("aave-avalanche", "WAVAX", netPos);
    // adVal = value of AVAX debt from Aave
    let adVal = BigNumber(ad.amount)
      .mult(-1)
      .mult(avaxPrice)
      .div(BigNumber(10).power(8))
      .div(BigNumber(10).power(18))
      .toString();

    // spread is a % of Aave AVAX debt used to determine if a trade should be executed
    let spread = BigNumber(adVal)
      .mult(parseInt(TRADE_THRESHOLD * 1000))
      .div(1000)
      .div(100)
      .toString();

    // netVal is the sum of the net AVAX and USD positions
    let netVal = BigNumber(avVal)
      .add(uVal * 100000000)
      .toString();

    const netPosition = {
      variableValue: parseInt(avVal) / 100000000,
      tradeThreshold: parseInt(spread) / 100000000,
      borrowVariableTokens: avTokens,
      stableValue: uVal,
      netVal: parseInt(netVal) / 100000000,
    };
    console.log("Net Position:", netPosition);
    return netPosition;
  } catch (e) {
    console.log(e.message);
    nodemailer.sendMail("calculateNetPosition() failed", e.message);
    throw Error(e.message + " => calculateNetPosition failed");
  }
}

//await adjustDebt("USDC", 25.7, "WAVAX", wallet.address);
async function adjustDebt(debtTokenSym, amount, tokenToSym, walletAddress) {
  try {
    console.log("adjustDebt", debtTokenSym, amount, tokenToSym, walletAddress);
    //getting contracts
    const debtTokenMap = await aave.getDebtTokenMap();
    let decimals;
    var repayAmount;
    let debtTokenFrom;
    amount = Math.floor(amount * 1000000);
    const tokenTo = maps.addressMap.get(tokenToSym);
    for (let i = 0; i < debtTokenMap.length; i++) {
      if (debtTokenMap[i].symbol == debtTokenSym) {
        debtTokenFrom = debtTokenMap[i].token;
        decimals = debtTokenMap[i].decimals - 6;
        break;
      }
    }
    const minimum = BigNumber(10)
      .pow(decimals + 6)
      .toString();

    amount = BigNumber(amount).mult(BigNumber(10).pow(decimals)).toString();
    console.log("debtTokenFrom", debtTokenFrom);
    console.log("amount", amount);
    console.log("tokenTo", tokenTo);
    const debtTokenContract = await aave.getDebtTokenContract(debtTokenFrom); //gets debt token contract
    const poolContract = await aave.getPoolContract(); // gets pool contract
    const tokenFrom = await aave.debtTokenUnderlyingAssetAddress(
      debtTokenContract
    );
    //gets the underlying address of the debt token
    const tokenFromContract = await erc20.getContract(tokenFrom); //gets the token contract of the from token using the underlying address
    const tokenToContract = await erc20.getContract(tokenTo); //gets the token contract of the to address
    //check to see if Adjust Debt it possible
    const amountOfTokensFromInWallet = await erc20.balanceOf(
      tokenFromContract,
      walletAddress
    ); //get balance of tokens from in wallet

    let borrowAmount = BigNumber(amount)
      .minus(BigNumber(amountOfTokensFromInWallet))
      .toString();
    //subtract the balance of wallet from the amount that is needed to be borrowed.
    const amountOfTokensToInWallet = await erc20.balanceOf(
      tokenToContract,
      walletAddress
    ); //get balance of tokens to in wallet
    tokensToRepay = await Math.floor(
      await aave.convertFromTokenToToken(
        tokenFrom,
        tokenTo,
        amount,
        walletAddress
      )
    );
    const amountOfTokensNeededToRepay = await BigNumber(tokensToRepay)
      .minus(BigNumber(amountOfTokensToInWallet))
      .toString(); //get the remaining amount of tokens needed to repay
    const convertedToken = await aave.convertFromTokenToToken(
      tokenTo,
      tokenFrom,
      amountOfTokensToInWallet,
      walletAddress
    );

    if (amountOfTokensNeededToRepay < minimum) borrowAmount = -1;
    //if you already have enough tokens to repay then you do not need to borrow any
    else {
      borrowAmount = await BigNumber(borrowAmount)
        .minus(BigNumber(convertedToken))
        .toString(); //decreases the amount of tokens needed to borrow since you already have some
    }
    const borrowMoney = await aave.canBorrowMoney(
      tokenFrom,
      borrowAmount,
      walletAddress
    ); //checks if borrowing money is allowed based on liquidation
    const availableDebtToRepay = await aave.isDebtAvailableToRepay(
      //checks if there is enough debt to repay
      tokenFrom,
      amount,
      tokenTo,
      walletAddress
    );
    console.log(borrowMoney);
    console.log(availableDebtToRepay);
    //if repayAmount < 0 set borrow amount to -1, ignore swap, convert amountFrom to AmountTo, repay that
    if (!borrowMoney) throw Error("Not enough collateral in wallet"); //change to throwing error, im not sure how to do this.
    if (!availableDebtToRepay) throw Error("Not enough debt in wallet");
    if (borrowAmount > minimum) {
      //execute adjustDebt
      //if borrow amount is less than 0 we skip this step
      console.log("Borrowing from aave");
      await aave.borrow(
        poolContract,
        debtTokenFrom,
        borrowAmount,
        walletAddress
      );
    }
    console.log("checking if swap required");
    if (amountOfTokensNeededToRepay > minimum) {
      //if amount needed to repay is less than 0 we skip this step
      console.log("swapping on Uniswap");

      repayAmount = await erc20.balanceOf(tokenFromContract, walletAddress);
      if (
        BigNumber(repayAmount).gt(
          BigNumber(amount).minus(BigNumber(convertedToken))
        )
      )
        repayAmount = BigNumber(amount)
          .minus(BigNumber(convertedToken))
          .toString();
      //const repayAmount = await Math.floor(
      //  Math.min(
      //    (BigNumber(amount).minus(BigNumber(convertedToken)).toString(),
      //    await erc.balanceOf(tokenFromContract, walletAddress))
      //  )
      //);
      // console.log("swap tokenContract", tokenFromContract);
      console.log("tokenFrom", tokenFrom);
      console.log("tokenTo", tokenTo);
      console.log("repayAmount", repayAmount);
      //console.log("wallet", walletAddress);
      await inch.swap(
        tokenFromContract,
        tokenFrom,
        tokenTo,
        repayAmount,
        walletAddress
      );
    }
    console.log("repaying on aave");
    tokensToRepay = await erc20.balanceOf(tokenToContract, walletAddress);
    if (BigNumber(repayAmount).gt(tokensToRepay))
      tokensToRepay = tokensToRepay.toString();
    //tokensToRepay = Math.floor(
    //Math.floor to prevent decimal errors inside of solidity
    //  Math.min(
    //   await erc.balanceOf(tokenToContract, walletAddress),
    //   tokensToRepay
    // ).toString() //incase there are not enough tokens in the wallet due to slippage, i take the minimum of the two
    await aave.repay(
      poolContract,
      tokenToContract,
      tokenTo,
      tokensToRepay,
      walletAddress
    );
    console.log("DEBT ADJUSTED!!!");
  } catch (e) {
    console.log("Error Adjusting debt: " + e.message);
    throw new Error(e.message + " => adjustDebt failed");
  }
}

async function adjustPosition(
  walletAddress,
  id,
  borrowStableTokenSym,
  borrowVariableTokenSym,
  poolStableTokenSym,
  poolVariableTokenSym
) {
  try {
    const poolContract = await aave.getPoolContract();
    const bankContract = await alpha.getBankContract();
    const routerContract = await factory.getRouterContract();
    const factoryContract = await factory.getFactoryContract();
    const debtTokenMap = await aave.getDebtTokenMap();
    let stableDebtToken;
    let variableDebtToken;
    let unwrap = false;
    const borrowStableToken = await maps.addressMap.get(borrowStableTokenSym);
    const borrowVariableToken = await maps.addressMap.get(borrowVariableTokenSym);
    const poolStableToken = await maps.addressMap.get(poolStableTokenSym);
    let poolVariableToken = await maps.addressMap.get(poolVariableTokenSym);
    if ((poolVariableTokenSym = "AVAX")) {
      poolVariableToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
      unwrap = true;
    }
    for (let i = 0; i < debtTokenMap.length; i++) {
      if (debtTokenMap[i].symbol == borrowStableTokenSym) {
        stableDebtToken = debtTokenMap[i].token;
      }
      if (debtTokenMap[i].symbol == borrowVariableTokenSym) {
        variableDebtToken = debtTokenMap[i].token;
      }
    }
    const borrowStableTokenContract = await erc20.getContract(borrowStableToken);
    const borrowVariableTokenContract = await erc20.getContract(borrowVariableToken);
    const poolStableTokenContract = await erc20.getContract(poolStableToken);
    const poolVariableTokenContract = await erc20.getContract(poolVariableToken);

    let borrowStableTokenBal = await erc20.balanceOf(
      borrowStableTokenContract,
      walletAddress
    );
    let borrowVariableTokenBal = await erc20.balanceOf(
      borrowVariableTokenContract,
      walletAddress
    );
    let poolStableTokenBal = await erc20.balanceOf(
      poolStableTokenContract,
      walletAddress
    );
    let poolVariableTokenBal;
    if (unwrap) {
      poolVariableTokenBal = await wall.getSpendableBalance(walletAddress);
    } else {
      poolVariableTokenBal = await erc20.balanceOf(
        poolVariableTokenContract,
        walletAddress
      );
    }
    //await alpha.bankWithdraw(bankContract, id, walletAddress);
    const debtRatio = await aave.getDebtRatio(poolContract, walletAddress);

    if (debtRatio <= 63 || debtRatio >= 69) {
      //Adjust Aave Debt();
      await adjustAaveDebt(
        poolContract,
        borrowVariableToken,
        borrowStableToken,
        variableDebtToken,
        stableDebtToken,
        borrowVariableTokenBal,
        borrowStableTokenBal
      );
    } else {
      console.log("Skip Adjusting Aave Debt");
    }
    borrowStableTokenBal = await erc20.balanceOf(borrowStableTokenContract, walletAddress);
    borrowVariableTokenBal = await erc20.balanceOf(
      borrowVariableTokenContract,
      walletAddress
    );

    //Getting Borrowing Amounts From AAVE
    //Sending Borrowed Amounts over to Pangolin/ALPHA
    if (BigNumber(borrowVariableTokenBal).gt(0)) {
      await inch.swap(
        "",
        borrowVariableToken,
        poolVariableToken,
        borrowVariableTokenBal,
        walletAddress
      );
    }
    if (BigNumber(borrowStableTokenBal).gt(0)) {
      await inch.swap(
        "",
        borrowStableToken,
        poolStableToken,
        borrowStableTokenBal,
        walletAddress
      );
    }
    //Creating equal positions to create liquidity on Pangolin
    poolStableTokenBal = await erc20.balanceOf(
      poolStableTokenContract,
      walletAddress
    );
    if (unwrap) {
      poolVariableTokenBal = await wall.getSpendableBalance(walletAddress);
    } else {
      poolVariableTokenBal = await erc20.balanceOf(
        poolVariableTokenContract,
        walletAddress
      );
    }
    const variableUSD = await aave.convertToUSD(
      borrowVariableToken,
      poolVariableTokenBal,
      walletAddress
    );
    const stableUSD = await aave.convertToUSD(
      borrowStableToken,
      poolStableTokenBal,
      walletAddress
    );
    console.log(poolVariableTokenBal);
    console.log(variableUSD, stableUSD);

    const difference = BigNumber(variableUSD)
      .minus(BigNumber(stableUSD))
      .abs()
      .toString();

    if (BigNumber(difference).gt(BigNumber(10).pow(18))) {
      if (BigNumber(variableUSD).gt(BigNumber(stableUSD))) {
        let amtSwap = BigNumber(variableUSD)
          .minus(BigNumber(stableUSD))
          .div(2)
          .toString();

        amtSwap = await aave.convertFromTokenToToken(
          "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70", //dai 18 decimal stable coin
          borrowVariableToken,
          amtSwap,
          walletAddress
        );
        await inch.swap(
          "",
          poolVariableToken,
          poolStableToken,
          amtSwap,
          walletAddress
        );
      } else {
        let amtSwap = BigNumber(stableUSD)
          .minus(BigNumber(variableUSD))
          .div(2)
          .toString();
        amtSwap = await aave.convertFromTokenToToken(
          "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70", //dai 18 decimal stable coin
          borrowStableToken,
          amtSwap,
          walletAddress
        );
        await inch.swap(
          "",
          poolStableToken,
          poolVariableToken,
          amtSwap,
          walletAddress
        );
      }
    } else {
      console.log("Skip balancing liquidity");
    }
    poolStableTokenBal = await erc20.balanceOf(
      poolStableTokenContract,
      walletAddress
    );
    if (unwrap) {
      poolVariableTokenBal = await wall.getSpendableBalance(walletAddress);
    } else {
      poolVariableTokenBal = await erc20.balanceOf(
        poolVariableTokenContract,
        walletAddress
      );
    }

    if (unwrap) {
      if (
        BigNumber(poolVariableTokenBal).gt(0) &&
        BigNumber(poolStableTokenBal).gt(0)
      ) {
        await factory.addPanLiquidityAVAX(
          routerContract,
          poolStableToken,
          poolStableTokenBal,
          "0",
          poolVariableTokenBal,
          "0",
          walletAddress
        );
      } else {
        //throw Error("Cannot create liquidity position with 0 tokens");
      }
      poolVariableToken = borrowVariableToken;
    }

    //Depositing into ALPHA
    const lp = await factory.getPanPair(
      factoryContract,
      poolStableToken,
      poolVariableToken
    );
    console.log(lp);
    //throw Error();
    const lpContract = await erc20.getContract(lp);
    const amtLP = await erc20.balanceOf(lpContract, walletAddress);
    const panPoolData = await pan.getPoolTokens("pooltokens", lp, amtLP);
    console.log(panPoolData);
    const stableAlphaBorrowAmount = Math.floor(
      BigNumber(panPoolData[0].amount).mult(18).div(10)
    ).toString();
    const variableAlphaBorrowAmount = Math.floor(
      BigNumber(panPoolData[1].amount).mult(18).div(10)
    ).toString();
    // throw Error("pass");
    console.log(
      walletAddress,
      poolStableToken,
      stableAlphaBorrowAmount,
      poolVariableToken,
      variableAlphaBorrowAmount,
      "amount LP " + amtLP
    );
    await alpha.bankDeposit(
      bankContract,
      walletAddress,
      poolStableToken,
      "0",
      stableAlphaBorrowAmount,
      BigNumber(stableAlphaBorrowAmount).mult(99).div(100).toString(),
      poolVariableToken,
      "0",
      variableAlphaBorrowAmount,
      BigNumber(variableAlphaBorrowAmount).mult(99).div(100).toString(),
      amtLP,
      0,
      9
    );

    console.log("Position Adjusted!!!");
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message + " => adjustPosition failed");
  }
}

async function adjustAaveDebt(
  poolContract,
  borrowVariableToken,
  borrowStableToken,
  variableDebtToken,
  stableDebtToken,
  borrowVariableTokenBal,
  borrowStableTokenBal
) {
  try {
    const collateral = await aave.getCollateralBase(
      poolContract,
      walletAddress
    );
    const stableDebtTokenContract = erc20.getContract(stableDebtToken);
    const variableDebtTokenContract = erc20.getContract(variableDebtToken);

    const nativePrice = await aave.convertFromTokenToToken(
      borrowVariableToken,
      borrowStableToken,
      BigNumber(NATIVE_WALLET_RESERVE).div(2),
      walletAddress
    );
    //ideal stable borrowing amount
    const idealSB = BigNumber(collateral)
      .mult(6666)
      .div(10000)
      .div(100)
      .div(2)
      .minus(nativePrice) // xxx michael had add but should be subtract
      .toString();
    //ideal variable Borrowing amount
    const idealVB = await BigNumber(
      aave.convertFromTokenToToken(
        borrowStableToken,
        borrowVariableToken,
        idealSB,
        walletAddress
      )
    ).add(NATIVE_WALLET_RESERVE).div(2); // xxx michael had subtract but should be add

    let stableDebtBal = await erc20.balanceOf(
      stableDebtTokenContract,
      walletAddress
    );
    let variableDebtBal = await erc20.balanceOf(
      variableDebtTokenContract,
      walletAddress
    );
    let stableRepayAmount = BigNumber(stableDebtBal)
      .minus(BigNumber(idealSB))
      .toString();
    let variableRepayAmount = BigNumber(variableDebtBal)
      .minus(BigNumber(idealVB))
      .toString();

// xxx there should be a threshold factor added here to support reentrance
// xxx possibly the params for tokens should be: aaveUsdOut,aaveVarOut,poolUsdIn,poolVarIn,alphaNativeOut(true/false)
    if (BigNumber(variableDebtBal).gt(BigNumber(idealVB))) {
      if (BigNumber(borrowVariableTokenBal).gt(0)) {
        variableRepayAmount = BigNumber(variableRepayAmount)
          .minus(borrowVariableTokenBal)
          .toString();
        await aave.repay(
          poolContract,
          borrowVariableTokenContract,
          borrowVariableToken,
          borrowVariableTokenBal,
          walletAddress
        );
      }
      if (BigNumber(variableRepayAmount).gt(0)) {
        await inch.swap(
          "",
          poolVariableToken,
          borrowVariableToken,
          variableRepayAmount,
          walletAddress
        );
        borrowVariableTokenBal = await erc20.balanceOf(
          borrowVariableTokenContract,
          walletAddress
        );
        await aave.repay(
          poolContract,
          borrowVariableTokenContract,
          borrowVariableToken,
          borrowVariableTokenBal,
          walletAddress
        );
        borrowVariableTokenBal = 0;
      }
    }
    if (BigNumber(stableDebtBal).gt(BigNumber(idealSB))) {
// xxx did not understand the two if conditions
      if (BigNumber(borrowStableTokenBal).gt(0)) {
        console.log("Repaying Using Tokens in Wallet");
        stableRepayAmount = BigNumber(stableRepayAmount)
          .minus(borrowStableTokenBal)
          .toString();
        await aave.repay(
          poolContract,
          borrowStableTokenContract,
          borrowStableToken,
          borrowStableTokenBal,
          walletAddress
        );
        borrowStableTokenBal = 0;
      }
// xxx did not understand the two if conditions
      if (BigNumber(stableRepayAmount).gt(0)) {
        console.log("Repaying through 1inch swap");
        await inch.swap(
          "",
          poolStableToken,
          borrowStableToken,
          stableRepayAmount,
          walletAddress
        );
        borrowStableTokenBal = await erc20.balanceOf(
          borrowStableTokenContract,
          walletAddress
        );
        await aave.repay(
          poolContract,
          borrowStableTokenContract,
          borrowStableToken,
          borrowStableTokenBal,
          walletAddress
        );
        borrowStableTokenBal = 0;
      }
    }
    if (BigNumber(variableDebtBal).lt(BigNumber(idealVB).mult(99).div(100))) {
      await aave.borrow(
        poolContract,
        variableDebtToken,
        BigNumber(variableRepayAmount).mult(-1).toString(),
        walletAddress
      );
    }
    if (BigNumber(stableDebtBal).lt(BigNumber(idealSB).mult(99).div(100))) {
      await aave.borrow(
        poolContract,
        stableDebtToken,
        BigNumber(stableRepayAmount).mult(-1).toString(),
        walletAddress
      );
    }
  } catch (e) {
    console.log(e.message + " => adjustAaveDebt() failed");
    throw new Error(e);
  }
}

