const BigNumber = require('big-number');
const txn = require("ethereumjs-tx");
const maps = require("./maps.js");
const axios = require("axios");
const wall = require("./wallet.js");
const utils = require("./utils.js");
const chain = require("./chain.js");
const web = require("./web3.js");
const erc20 = require("./erc20.js");
let web3;
const headers = { headers: { Authorization: "Bearer tRUaWIKLtctwTxWAATi82brXocuJbmQb", accept: "application/json" } };
const headers2 = { headers: {
  "Content-Type": "application/json", 
  Authorization: "Bearer tRUaWIKLtctwTxWAATi82brXocuJbmQb"
} };

let opEthAddr =   "0x4200000000000000000000000000000000000006";
let opAddr =      "0x4200000000000000000000000000000000000042";
let defaultAddr = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
let wavaxAddr = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
let wethAddr = "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB";
let usdcAddr = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
let pngAddr = "0x60781c2586d68229fde47564546784ab3faca982";
let swapParams;
let walletAddress;

//Step 5: Define Helper Functions

// Construct full API request URL
function apiRequestUrl(methodName, queryParams) {
  const chainId = chain.chainId();
  const apiBaseUrl = "https://api.1inch.dev/swap/v5.2/" + chainId;
  return apiBaseUrl + methodName + "?" + new URLSearchParams(queryParams).toString();
}

// Post raw transaction to the API and return transaction hash
async function broadCastRawTransaction(rawTransaction) {
  try {
    const chainId = chain.chainId();
    const broadcastApiUrl = "https://api.1inch.dev/tx-gateway/v1.1/" + chainId + "/broadcast";
    //let bu = web.getRpcUrl();
    //console.log("bu=",bu);
    let s = JSON.stringify({ rawTransaction });
    console.log(broadcastApiUrl,headers2);
    console.log("broadcast=",s);
    await utils.sleep(1);
    let response = await axios.post(broadcastApiUrl, s, headers2);
    //let response = await axios.post(bu, s, headers2);
    console.log("broadCastRawTransaction response=", response);
    return response.data.tx;
  } catch (e) {
    throw new Error(e.message+" => broadCastRawTransaction() failed");
  }
}

// Sign and post a transaction, return its hash
async function signAndSendTransaction(transaction) {
  try {
    const { rawTransaction } = await web3.eth.accounts.signTransaction(transaction,wall.getPrivateKey());

    let result = await broadCastRawTransaction(rawTransaction);
  } catch (e) {
    throw new Error(e.message+" => signAndSendTransaction() failed");
  }
}
async function signAndSendTransaction2(transaction) {
  try {
    const { rawTransaction } = await web3.eth.accounts.signTransaction(transaction,wall.getPrivateKey());
    //console.log("rawTx=",rawTransaction);

    let result = await web3.eth.sendSignedTransaction(rawTransaction);
    return result;
  } catch (e) {
    throw new Error(e.message+" => signAndSendTransaction2() failed");
  }
}

//Making the Swap
//Before proceeding with the swap, please confirm that your approval transaction has a status of "Success."

//Step 1: Set up your environment (same as before)

//Step 2: Implement Helper Functions (same as before)

//Step 3: Build the Body of the Transaction

async function buildTxForSwap(swapParams) {
  try {
  const url = apiRequestUrl("/swap", swapParams);
console.log("buildTxForSwap url=",url,headers);
  // Fetch the swap transaction details from the API
  let result = await axios.get(url, headers);
  console.log("after buildTxForSwap axios.get");
  console.log("buildTxForSwap result=",result);
  return result.data.tx;
  } catch (e) {
    console.log(e.message,"buildTxForSwap() failed");
    throw new Error(e.message+" => buildTxForSwap() failed");
  }
}

async function checkAllowance(tokenAddress, walletAddress)
{
  try {
    url = apiRequestUrl("/approve/allowance", {"tokenAddress": tokenAddress, "walletAddress": walletAddress})
    response = await axios.get(url, headers);
    data = response.data;
    return data.allowance;
  } catch (e) {
    throw new Error(e.message+" => checkAllowance() failed");
  }
}

async function confirmTransaction(hash)
{     
  console.log("Confirming transaction hash=",hash);
  const start = parseInt(Date.now()/1000);
  let now = parseInt(Date.now()/1000);
  const TIMEOUT = 300;
  const SLEEP = 1;
  let status = false;
  while (start + TIMEOUT > now)
  {   
      
    status = await web3.eth.getTransactionReceipt(hash);
    console.log("status=",status,"hash=",hash);
    if (status !== null)
    {
      return status;
    }
    await utils.sleep(SLEEP);
    now = parseInt(Date.now()/1000);
  }
  throw new Error("Transaction not confirmed in 1inch.confirmTransaction()");
} 
async function swap(sym0,sym1,amt,walletAddress='0x0fFeb87106910EEfc69c1902F411B431fFc424FF')
{
  try {
    web3 = web.web3.obj;
    let amount;
    let src;
    let dst;
    const chainId = chain.chainId();
    if (chainId == 43114)
    {
      if (sym0 == "WAVAX")
      {
        src = wavaxAddr;
        if (sym1.toUpperCase() == "WETH.E")
          dst = wethAddr;
        else
          dst = usdcAddr;
        amount = BigNumber(Math.floor(amt*1000000)).mult(BigNumber(10).pow(18-6)).toString();
      }
      else if (sym0 == "PNG")
      {
        src = pngAddr;
        dst = usdcAddr;
        amount = BigNumber(Math.floor(amt*1000000)).mult(BigNumber(10).pow(18-6)).toString();
      }
      else if (sym1 == "WAVAX")
      {
        if (sym0.toUpperCase() == 'WETH.E')
        {
          src = wethAddr;
          amount = BigNumber(Math.floor(amt*1000000)).mult(BigNumber(10).pow(18-6)).toString();
        }
        else
        {
          src = usdcAddr;
          amount = BigNumber(Math.floor(amt*1000000)).toString();
        }
        dst = wavaxAddr;
      }
      else
        throw new Error("Unsupported exchange from "+sym0+" to "+sym1+" => 1inchnew.swap() failed");
    }
    else if (chainId == 10)
    {
      if (sym0 == "OP")
      {
        src = opAddr;
        dst = opEthAddr;
        amount = BigNumber(Math.floor(amt*1000000)).mult(BigNumber(10).pow(18-6)).toString();
      }
      else if (sym1 == "OP")
      {
        src = opEthAddr;
        dst = opAddr;
        amount = BigNumber(Math.floor(amt*1000000)).mult(BigNumber(10).pow(18-6)).toString();
      }
      else if (sym0 == "WETH" && sym1 == "ETH")
      {
        src = opEthAddr;
        dst = defaultAddr;
        amount = BigNumber(Math.floor(amt*1000000)).mult(BigNumber(10).pow(18-6)).toString();
      }
      else
        throw new Error("Unsupported exchange from "+sym0+" to "+sym1+" => 1inchnew.swap() failed");
    }
    else
      throw new Error("Unsupported exchange from "+sym0+" to "+sym1+" => 1inchnew.swap() failed");
    //let allow = await checkAllowance(src,walletAddress);
    //console.log("allow=",allow);
    swapParams = {
      src: src, // Token address of 1INCH
      dst: dst, // Token address of DAI
      amount: amount, // Amount of 1INCH to swap (in wei)
      from: walletAddress,
      slippage: 0.5, // Maximum acceptable slippage percentage for the swap (e.g., 1 for 1%)
      disableEstimate: false, // Set to true to disable estimation of swap details
      allowPartialFill: false, // Set to true to allow partial filling of the swap order
    };
    console.log("swapParams=",swapParams);

    //const allowance = await checkAllowance(swapParams.src, walletAddress);
    //console.log("Allowance: ", allowance);

    //Step 4: Define API URLs, Your API Key here and initialize Web3 libraries
    const swapTransaction = await buildTxForSwap(swapParams);
    console.log("Transaction for swap: ", swapTransaction);
    //Step 4: Confirm and Send the Transaction
    let gasPrice = swapTransaction.gasPrice;
    gasPrice = parseInt(gasPrice).toString(16);
    swapTransaction.gasPrice = '0x'+gasPrice;
    let value = swapTransaction.value;
    value = parseInt(value).toString(16);
    swapTransaction.value = '0x'+value;
  
    const swapTxHash = await signAndSendTransaction2(swapTransaction);
    console.log("Swap tx hash: ", swapTxHash);
    await confirmTransaction(swapTxHash.transactionHash);
    console.log("confirmed");
    return true;
  } catch (e) {
    throw new Error(e.message+" => 1inchnew.swap() failed");
  }
}
//swap("WAVAX","USDC",0.1);
module.exports = Object.assign({
  swap
});   
