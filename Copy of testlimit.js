
const limit=require('@1inch/limit-order-protocol');
const fetch=require('node-fetch'); // specifically version node-fetch@2.6.7

const web = require("./web3.js");
const wall = require("./wallet.js");

const web3 = web.web3.obj;

//console.log("provider=",web3);
let pk = wall.getPrivateKey().toString();
console.log("pk",pk);
pk = pk.replace('0x','');
pk = new Buffer(pk,'hex');
//console.log("pk=",pk);

//it's usually best not to store the private key in the code as plain text, encrypting/decrypting it is a good practice
const connector = new limit.PrivateKeyProviderConnector(pk,web3); 
//console.log("connector=",connector);

const contractAddress = '0x119c71D3BbAC22029622cbaEc24854d3D32D2828'; //this is the limit order contract address for the mainnet
const walletAddress = '0x0fFeb87106910EEfc69c1902F411B431fFc424FF';   //your wallet address placing the order          
const chainId = 434114;

const limitOrderBuilder = new limit.LimitOrderBuilder(
    contractAddress,
    chainId,
    connector
);

const fromToken = '0x4200000000000000000000000000000000000042'; //OP    //this is the token address that you want to sell
const toToken   = '0x4200000000000000000000000000000000000006'; //WETH  //this is the token address that you want to buy
const fromAmount = '100000000';  //this is the amount of tokens you want to sell, make sure it's in minimum divisible units
const toAmount = '3617';         //this is how much of the to token you want to buy. make sure it's in minimum divisible units
const seconds = 60000000;        //this is how many seconds the order is active for, it can be any non-negative number


const limitOrderProtocolFacade = new limit.LimitOrderProtocolFacade(
    contractAddress,
    connector
);

const limitOrderPredicateBuilder = new limit.LimitOrderPredicateBuilder(
    limitOrderProtocolFacade
);

console.log("lopb=",limitOrderPredicateBuilder);
const {
    timestampBelow,
    nonceEquals,
    and
} = limitOrderPredicateBuilder;

console.log("assign=",timestampBelow,nonceEquals,and);

const timeStamp = timestampBelow(Math.round(Date.now() / 1000) + seconds);
console.log("timestamp=",timeStamp);
const nonce = nonceEquals(walletAddress, 0);
console.log("nonce=",nonce);
const predicateCallData = and(timeStamp, nonce);

console.log("pcd=",predicateCallData);

const limitOrder = limitOrderBuilder.buildLimitOrder({
    makerAssetAddress: fromToken,
    takerAssetAddress: toToken,
    makerAddress: walletAddress,
    takerAddress: '0x0000000000000000000000000000000000000000',
    makerAmount: fromAmount,
    takerAmount: toAmount,
    predicate: predicateCallData,
    permit: '0x',
    interaction: '0x',
    // allowedSender: '0x0000000000000000000000000000000000000000',

    // makerAssetData: '0x',
    // takerAssetData: '0x',
});

console.log("limitOrder=",limitOrder);

let limitOrderTypedData = limitOrderBuilder.buildLimitOrderTypedData(
    limitOrder
);

console.log("limitOrderTypedData=",limitOrderTypedData);

const limitOrderSignature = limitOrderBuilder.buildOrderSignature(
    walletAddress,
    limitOrderTypedData
);

console.log("limitOrderSignature=",limitOrderTypedData);

const limitOrderHash = limitOrderBuilder.buildLimitOrderHash(
    limitOrderTypedData
);

console.log("limitOrderHash=",limitOrderHash);

/*
    * The following code is for placing the order with a call to the 1inch API
    * this can be modified to take in the data, for now the data is hardcoded above
*/
async function orderPlace() {

    await wall.init("lance","op");
console.log("orderPlace begin");
    const signature = await limitOrderSignature;
console.log("signature",signature);
    const data = {
        orderHash: limitOrderHash,
        //orderMaker: walletAddress,
        //createDateTime: Date.now(),
        signature: signature,
        //makerAmount: fromAmount,
        //takerAmount: toAmount,
        data: limitOrder,
        // orderType: 'active',
        // chainId: chainId
    };
    console.log("!!data=",JSON.stringify(data, null, 2));

    let fetchPromise = await fetch("https://limit-orders.1inch.io/v2.0/1/limit-order",data, {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json",
        },
        "data": JSON.stringify(data),
        "method": "POST"
    }).then((res) => {
        console.log(res.status);
        return res.json()
    }).then((jsonData => {
        console.log(jsonData);
    }));

    try {
        console.log("\n\n" + (fetchPromise.data));
    } catch (e) { }
}

orderPlace();
