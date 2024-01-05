const BigNumber = require("big-number");
const tj2 = require('@traderjoe-xyz/sdk-v2');
const tj = require('@traderjoe-xyz/sdk');
const tjc = require('@traderjoe-xyz/sdk-core');
const ep = require('@ethersproject/contracts');
const tjABI = require('./ABI/TraderJoe.json');
const ethers = require('ethers');
const emulti = require('ethers-multicall');
const chain = require('./chain.js');
const web = require('./web3.js');
const web3 = web.web3;
const wall = require('./wallet.js');
const prov = require('@ethersproject/providers');

wall.init("lance","avax");

//const AVAX_URL = 'https://api.avax.network/ext/bc/C/rpc';
const AVAX_URL = 'https://rpc.ankr.com/avalanche';
//const CHAIN_ID = tj.ChainId.AVALANCHE;
const CHAIN_ID = 43114;
const chainId = 43114;
let PROVIDER = new prov.JsonRpcProvider(AVAX_URL);
//PROVIDER = new emulti.Provider(PROVIDER);
//const WALLET_PK = "{"+wall.getPrivateKey()+"}";
const WALLET_PK = wall.getPrivateKey();
console.log("new Wallet",WALLET_PK, PROVIDER);
console.log("ethers=",ethers.Wallet);
const SIGNER = new ethers.Wallet(WALLET_PK, PROVIDER);
let ACCOUNT;

const TJ_ADDRESS = '0xb4315e873dbcf96ffd0acd8ea43f689d8c20fb30';

async function getContract() {
  try {
    const contract = await new web3.obj.eth.Contract(tjABI, TJ_ADDRESS);
    return contract;
  } catch (e) {
      console.log(e.message+" getContract failed");
      throw Error(e.message+" => getContract failed");
  } 
}

async function getContractABI(address,ABI) {
  try {
    const contract = await new web3.obj.eth.Contract(ABI, address);
    return contract;
  } catch (e) {
      console.log(e.message+" getContractABI() failed");
      throw Error(e.message+" => getContractABI() failed");
  } 
}

async function swapExactTokensForTokens(contract, amountIn, amountOutMin, tokenPath, walletAddress, deadline, retries=0)
{
  //console.log("contract=",contract);
  const MAX_RETRIES=3;
  let params;
  params = {
    from: walletAddress,
    gas: "800000",
    nonce: await web3.obj.eth.getTransactionCount(walletAddress),
    value: 0
  };
  console.log("params=",params);
  console.log("args=",amountIn,amountOutMin,tokenPath,walletAddress,deadline);
  const tx = await contract.methods
    .swapExactTokensForTokens(amountIn, amountOutMin, tokenPath, walletAddress, deadline)
    .send(params)
    .catch(function (e) {
      if (retries < MAX_RETRIES) // xxx should retry once this works
      {
        if (utils.shouldRetry(e.message))
        {
          retries++;
          return swapExactTokensForTokens(contract, amountIn, amountOutMin, tokenPath, walletAddress, deadline, retries);
        }
      }
      console.log(e.message);
      throw new Error(e.message+" => swapExactTokensForTokens() failed");
    });
  return tx;
}


const isExactIn = true

const WAVAX = tjc.WNATIVE[chainId];

const USDC = new tjc.Token(
    chainId,
    '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    6,
    'USDC',
    'USD Coin'
)

const USDT = new tjc.Token(
    chainId,
    '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    6,
    'USDT',
    'Tether USD'
)

const BASES = [WAVAX, USDC, USDT];

async function findBestPathFromAmountIn(c,route,amt)
{
  //console.log("findBestPathFromAmount",c);
  console.log("findBestPathFromAmount",route,amt);
  try {
    const r = await c.methods.findBestPathFromAmountIn(route,amt)
      .call()
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => findBestPathFromAmountIn() failed");
      });
    console.log("findBestPathFromAmountIn()",r);
    return r;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => findBestPathFromAmountIn() failed");
  }

}

async function processCalls(calls)
{
  let result = new Array();
  for (let i=0;i<calls.length;i++)
  {
    const c = await getContractABI(calls[i].address,calls[i].abi);
    if (calls[i].functionName == "findBestPathFromAmountIn")
    {
      const amt = BigInt(calls[i].args[1]).toString();
      const r = await findBestPathFromAmountIn(c,calls[i].args[0],amt);
      result = result.concat(Array(r));
      //result.push(r);
    }
  }
console.log("processCalls=",result);
  return result;
}

async function swap(sym0,sym1,amt)
{
console.log("swap",sym0,sym1,amt);
  ACCOUNT = await SIGNER.getAddress();
  let inputToken;
  let outputToken;

  if (sym0 == "USDC")
  {
    inputToken = USDC;
    outputToken = WAVAX;
  }
  else
  {
    inputToken = WAVAX;
    outputToken = USDC;
  }
  console.log("inputToken.decimals",inputToken.decimals,amt);
  const amount = BigNumber(Math.floor(amt * 1000000)).mult(BigNumber(10).pow(inputToken.decimals)).div(1000000).toString();
console.log("amount=",amount);

console.log("Bigamount=",BigInt(amount));
  const amountIn = new tjc.TokenAmount(inputToken, BigInt(amount));

  // get all [Token, Token] combinations 
  const allTokenPairs = tj2.PairV2.createAllTokenPairs(
    inputToken,
    outputToken,
    BASES
  );

  // init PairV2 instances for the [Token, Token] pairs
  const allPairs = tj2.PairV2.initPairs(allTokenPairs) 

  // generates all possible routes to consider
  const allRoutes = tj2.RouteV2.createAllRoutes(
    allPairs,
    inputToken,
    outputToken,
    2 // maxHops 
  ); 

  const isAvaxIn = false // set to 'true' if swapping from AVAX; otherwise, 'false';
  const isAvaxOut = false // set to 'true' if swapping to AVAX; otherwise, 'false';

  // generates all possible TradeV2 instances
  const calls = await tj2.TradeV2.getTradesExactIn1(
    allRoutes,
    amountIn,
    outputToken,
    isAvaxIn,
    isAvaxOut, 
    PROVIDER,
    chainId
  );
console.log("getTradesExactIn1=",calls);

  const reads = await processCalls(calls);

  const trades = await tj2.TradeV2.getTradesExactIn2(
    reads,
    allRoutes,
    amountIn,
    outputToken,
    isAvaxIn,
    isAvaxOut, 
    PROVIDER,
    chainId
  );
console.log("getTradesExactIn2=",trades);
  exit();
  // chooses the best trade 
  const bestTrade = tj2.TradeV2.chooseBestTrade(trades, isExactIn)

  // print useful information about the trade, such as the quote, executionPrice, fees, etc
  console.log("bestTrade=",bestTrade);

  // get trade fee information
  const { totalFeePct, feeAmountIn } = await bestTrade.getTradeFee(PROVIDER);
  console.log('Total fees percentage', totalFeePct.toSignificant(6), '%');
  console.log(`Fee: ${feeAmountIn.toSignificant(6)} ${feeAmountIn.token.symbol}`)

  // set slippage tolerance
  // xxx const userSlippageTolerance = new tjc.Percent(tj.JSBI.BigInt(50), tj.JSBI.BigInt(10000)); // 0.5%
  const userSlippageTolerance = new tjc.Percent(tj.JSBI.BigInt(50), tj.JSBI.BigInt(10000)); // 0.5%

  // set deadline for the transaction
  const currenTimeInSec =  Math.floor((new Date().getTime()) / 1000)
  const deadline = currenTimeInSec + 3600

  // set swap options
  const swapOptions = {
    recipient: ACCOUNT, 
    allowedSlippage: userSlippageTolerance, 
    deadline,
    feeOnTransfer: false // or true
  }

  console.log("swapOptions=",swapOptions);
  // generate swap method and parameters for contract call
  const {
    methodName, // e.g. swapExactTokensForAVAX,
    args,       // e.g.[amountIn, amountOut, binSteps, path, to, deadline]
    value       // e.g. 0x0
  } = bestTrade.swapCallParameters(swapOptions)

  console.log("methodName=",methodName,args,value);

  console.log("routeraddress=",tj2.LB_ROUTER_V21_ADDRESS[CHAIN_ID]);
  //console.log("routerABI=",tj2.LBRouterV21ABI);

  const router = await getContractABI(tj2.LB_ROUTER_V21_ADDRESS[CHAIN_ID], tj2.LBRouterV21ABI);

  //console.log("router=",router);

  // estimate gas
  const gasOptions = value && !tj2.isZero(value) ? { value } : {} 
  //const gasEstimate = await router.estimateGas[methodName](...args, options)
  const gasEstimate = 800000;

console.log("tokenPath=",args[2]);
  result = await swapExactTokensForTokens(router,args[0],args[1],args[2], args[3], args[4]);
  console.log("result=",result);
}

module.exports = Object.assign({
  swap
});
        
swap("USDC","WAVAX",1);
//swap("WAVAX","USDC",0.1);

