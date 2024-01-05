const web = require("./web3.js");
const wall = require("./wallet.js");
const erc20 = require("./erc20.js");
const BigNumber = require("big-number");

const web3 = web.web3;
const limitABI = require("./ABI/1inchLimit.json");
const seriesABI = require("./ABI/1inchSeries.json");

// The limit order contract address
const limitOrderAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582"  
const chainId = 10  // The chain ID of the network you are using

async function getContract()
{
  const contract = await new web3.obj.eth.Contract(limitABI, limitOrderAddress);
  return contract;
}

/*
async function totalSupply(c)
{         
  try { 
    const t = await c.methods
      .totalSupply()
      .call()
      .catch(function (e) {
        console.log(e.message);
        throw new Error(e.message+" => totalSupply() failed");
      });
    console.log("totalSupply()",t);
    return t;
  } catch (e) {
    console.log(e.message);
    throw new Error(e.message+" => totalSupply() failed");
  }
}
*/

const walletAddress = '0x0fFeb87106910EEfc69c1902F411B431fFc424FF';
const makerAddress = web3.obj.utils.toChecksumAddress(walletAddress);
const takerAddress = "0x0000000000000000000000000000000000000000";

const opAddress = '0x4200000000000000000000000000000000000042';
const usdcAddress = '0x7F5c764cBc14f9669B88837ca1490cCa17c31607';
const seriesAddress = '0x32d12a25f539e341089050e2d26794f041fc9df8';

async function getSeriesContract()
{
  const contract = await new web3.obj.eth.Contract(seriesABI, seriesAddress);
  return contract;
}

async function arbitraryStaticCallEncode(c,snmContract,nmc)
{
    const data = await c.methods.arbitraryStaticCall(snmContract,nmc).encodeABI();
    return data; 
}

async function timestampBelowEncode(c,expiration)
{
    const tb = await c.methods.timestampBelow(expiration).encodeABI();
    return tb; 
}

function getOffsets(interactions)
{
  let lengthArray = [];
  for (let i=0;i<interactions.length;i++)
  {
    if (interactions[i].substring(0,1) == '0x')
      lengthArray.push(Math.floor(interactions[i].length/2-1));
    else
      lengthArray.push(Math.floor(interactions[i].length/2));
  }
  let cumulativeSum = 0;
  let bytesAccumularot = 0;
  let index = 0;
  let UINT32_BITS = 32;
  for (let i=0;i<lengthArray.length;i++)
  {
    cumulativeSum += lengthArray[i];
    bytesAccumularot += cumulativeSum << (UINT32_BITS * index);
    index += 1;
  }
  let offsets = bytesAccumularot;
  return offsets;
}

function fixDataTypes(data,types)
{
  let fixedData = {};
  for (let i=0;i<types.length;i++)
  {
    if (types[i].type == "bytes")
    {
      let value = data[types[i].name];
console.log("data["+types[i].name+"]=",value);
      //value = Buffer.from(value);
      console.log("value=",value);
      //value = value.toString('hex');
      console.log("value=",value);
      fixedData[types[i].name] = value;
    }
    else 
      fixedData[types[i].name] = data[types[i].name];
  }
  return fixedData;
}

async function createLimitOrder(sym0,sym1,amt0,amt1)
{
  let wallet = await wall.init("lance","op");
  let addr0;
  let addr1;
  let makerAmount;
  let takerAmount;
  if (sym0 == "OP")
  {
    addr0 = opAddress;
    addr1 = usdcAddress;
  }
  else
  {
    addr0 = usdcAddress;
    addr1 = opAddress;
  }
  const makerAsset = addr0;
  const takerAsset = addr1;
  const makerAssetContract = await erc20.getContract(addr0);
  const takerAssetContract = await erc20.getContract(addr1);
  console.log("makerContract",makerAssetContract);
  const dec0 = await erc20.decimals(makerAssetContract);
  const dec1 = await erc20.decimals(takerAssetContract);
  makerAmount = BigNumber(amt0 * 1000000).mult(BigNumber(10).pow(dec0-6)).toString();
  takerAmount = BigNumber(amt1 * 1000000).mult(BigNumber(10).pow(dec1-6)).toString();
  const makerAssetData = '0x';
  const getMakingAmount = '0x';
  const getTakingAmount = '0x';
  const takerAssetData = '0x';
  console.log("assets",makerAsset,takerAsset,makerAmount,takerAmount);
  const expiration = Math.floor(Date.now() / 1000) + 3600 * 365; // expires in 1 year
  const nonce = await web3.obj.eth.getTransactionCount(walletAddress);
  const seriesContract = await getSeriesContract();
  const series = 0;
  const nonceManagerCalldata = await timestampBelowEncode(seriesContract,expiration);
  console.log("nmc=",nonceManagerCalldata);  
  const limitOrderContract = await getContract();
  const predicate = await arbitraryStaticCallEncode(limitOrderContract, seriesAddress, nonceManagerCalldata);

  const permit = '0x';
  const preInteraction = '0x';
  const postInteraction = '0x';
  let allInteractions = [makerAssetData,takerAssetData,getMakingAmount,getTakingAmount,predicate,preInteraction,postInteraction];
  let interactions = '0x';
  let offsets = getOffsets(allInteractions);
  for (let i=0;i<allInteractions.length;i++)
  {
    interactions += allInteractions[i].replace("0x","");
  }
  console.log("interactions=",interactions);
/*
  let orderData = {
    "salt": 0,
    "makerAsset": makerAsset,
    "takerAsset": takerAsset,
    "maker": makerAddress,
    "receiver": takerAddress,
    "allowedSender": "0x0000000000000000000000000000000000000000",
    "makerAmount": makerAmount,
    "takerAmount": takerAmount,
    "offsets": offsets,
    "interactions": interactions
  };
  let orderTypes = [
    {"name": "salt", "type": "uint256"},
    {"name": "makerAsset", "type": "address"},
    {"name": "takerAsset", "type": "address"},
    {"name": "maker", "type": "address"},
    {"name": "receiver", "type": "address"},
    {"name": "allowedSender", "type": "address"},
    {"name": "makerAmount", "type": "uint256"},
    {"name": "takerAmount", "type": "uint256"},
    {"name": "offsets", "type": "uint256"},
    {"name": "interactions", "type": "bytes"},
  ];
  console.log("orderData=",orderData);
  let fixedData = fixDataTypes(orderData,orderTypes);
  console.log("fixedData=",fixedData);
  const eip712Data = {
    "primaryType": "Order",
    "types": {
        "EIP712Domain": [
            {"name": "name", "type": "string"},
            {"name": "version", "type": "string"},
            {"name": "chainId", "type": "uint256"},
            {"name": "verifyingContract", "type": "address"},
        ],
        "Order": orderTypes
    },
    "domain": {
        "name": "1inch Aggregation Router",
        "version": "5",
        "chainId": chainId,
        "verifyingContract": limitOrderAddress
    },
    "message": fixDataTypes(orderData, orderTypes),
  };
*/
  let domain = {
    "name": "1inch Aggregation Router",
    "version": "5",
    "chainId": chainId,
    "verifyingContract": limitOrderAddress
  };
  let types = {
    "Order": [
      {"name": "salt", "type": "uint256"},
      {"name": "makerAsset", "type": "address"},
      {"name": "takerAsset", "type": "address"},
      {"name": "maker", "type": "address"},
      {"name": "receiver", "type": "address"},
      {"name": "allowedSender", "type": "address"},
      {"name": "makerAmount", "type": "uint256"},
      {"name": "takerAmount", "type": "uint256"},
      {"name": "offsets", "type": "uint256"},
      {"name": "interactions", "type": "bytes"}
    ]
  };
  let values = {
    "salt": 0,
    "makerAsset": makerAsset,
    "takerAsset": takerAsset,
    "maker": makerAddress,
    "receiver": takerAddress,
    "allowedSender": "0x0000000000000000000000000000000000000000",
    "makerAmount": makerAmount,
    "takerAmount": takerAmount,
    "offsets": offsets,
    "interactions": interactions
  };
  //console.log("eip712Data=",eip712Data);
  console.log("wallet=",web3.ethers["op"].wallet);
  const sign = await web3.ethers["op"].wallet._signTypedData(domain,types,values);
  console.log("sign=",sign);
}

createLimitOrder("USDC","OP",1,0.097);


