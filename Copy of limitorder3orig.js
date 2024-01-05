// using node 14.21.12
const nf = require('node-fetch'); // specifically version node-fetch@2.6.7

const Web3 = require('web3');
const wall = require('./wallet.js');
const inch = require('@1inch/limit-order-protocol-utils');

const wallet = wall.init("lance","op");
/*
import {
    limitOrderProtocolAddresses,
    seriesNonceManagerContractAddresses,
    ChainId,
    Erc20Facade,
    LimitOrderBuilder,
    LimitOrderProtocolFacade,
    LimitOrderPredicateBuilder,
    NonceSeriesV2,  
    SeriesNonceManagerFacade,
    SeriesNonceManagerPredicateBuilder,
    Web3ProviderConnector, // used for interfaces
    PrivateKeyProviderConnector
} from '@1inch/limit-order-protocol-utils';
*/

let inchDevApiKey = "tRUaWIKLtctwTxWAATi82brXocuJbmQb";
const web3 = new Web3('https://rpc.ankr.com/optimism');
console.log("web3=",web3);
let pk = wall.getPrivateKey();
pk = pk.replace('0x','');
const connector = new inch.PrivateKeyProviderConnector(pk, web3); //it's usually best not to store the private key in the code as plain text, encrypting/decrypting it is a good practice
console.log("connector=",connector);
const walletAddress = "0x0fFeb87106910EEfc69c1902F411B431fFc424FF" // the public address associated with your private key
const chainId = 1; // suggested, or use your own number
const contractAddress = inch.limitOrderProtocolAddresses[chainId];
const seriesContractAddress = inch.seriesNonceManagerContractAddresses[chainId];


const fromToken = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';                  //this is the token address that you want to sell
const toToken = '0xdAC17F958D2ee523a2206206994597C13D831ec7';                    //this is the token address that you want to buy
const fromAmount = '100000';                                                          //this is the amount of tokens you want to sell, make sure it's in minimum divisible units
const toAmount =    '99000';                                                //this is how much of the to token you want to buy. make sure it's in minimum divisible units
const seconds = 60000;                                                              //this is how many seconds the order is active for, it can be any non-negative number


const limitOrderProtocolFacade = new inch.LimitOrderProtocolFacade(contractAddress, chainId, connector);
const seriesNonceManagerFacade = new inch.SeriesNonceManagerFacade(seriesContractAddress, chainId, connector);
const seriesNonceManagerPredicateBuilder = new inch.SeriesNonceManagerPredicateBuilder(seriesNonceManagerFacade);
const limitOrderPredicateBuilder = new inch.LimitOrderPredicateBuilder(limitOrderProtocolFacade);
const erc20Facade = new inch.Erc20Facade(connector);
// const limitOrderBuilder = new inch.LimitOrderBuilder(limitOrderProtocolFacade, erc20Facade);
const limitOrderBuilder = new inch.LimitOrderBuilder(contractAddress, chainId, connector);

const expiration = Math.floor(Date.now() / 1000) + seconds; // expiration in seconds
// const nonce = seriesNonceManagerFacade.getNonce(inch.NonceSeriesV2.LimitOrderV3, walletAddress).then((nonce) => nonce.toNumber());
// above doesn't work without an await so we'll temporarily hardcode the nonce
const nonce = 0;
// Creates predicate that restricts Limit Order invalidation conditions
// Because timestampBelowAndNonceEquals is method of another contract arbitraryStaticCall() is necessary
const simpleLimitOrderPredicate = limitOrderPredicateBuilder.arbitraryStaticCall( // is type LimitOrderPredicateCallData
    seriesNonceManagerPredicateBuilder.facade,
    seriesNonceManagerPredicateBuilder.timestampBelowAndNonceEquals(
        inch.NonceSeriesV2.LimitOrderV3,
        expiration,
        nonce,
        walletAddress,
    ),
);

const limitOrder = limitOrderBuilder.buildLimitOrder({
    makerAssetAddress: fromToken,
    takerAssetAddress: toToken,
    makerAddress: walletAddress,
    makingAmount: fromAmount,
    takingAmount: toAmount,
    predicate: simpleLimitOrderPredicate,
    salt: "" + Math.floor(Math.random()*100000000),
});

console.log(limitOrder)


async function getSignatureAndHash() {

    const limitOrderTypedData = limitOrderBuilder.buildLimitOrderTypedData(
        limitOrder,
    );
    const limitOrderSignature = await limitOrderBuilder.buildOrderSignature(
        connector,
        limitOrderTypedData,
    );

    const limitOrderHash = await limitOrderBuilder.buildLimitOrderHash(
        limitOrderTypedData
    );
    
    return [limitOrderSignature, limitOrderHash];
}

/*
    * The following code is for placing the order with a call to the 1inch API
    * this can be modified to take in the data, for now the data is hardcoded above
    @param limitOrderData: untyped data of the limit order (all are strings)
    @param limitOrderSignature: signature of the limit order
    @param limitOrderHash: hash of the limit order
*/

async function orderPlace() {

    const [limitOrderSignature, limitOrderHash] = await getSignatureAndHash();

    const signature = await limitOrderSignature;
    const data = {
        "orderHash": limitOrderHash,
        "signature": signature,
        "data": limitOrder
    }
    console.log(JSON.stringify(data, null, 2));

console.log("nf=",nf);
    let fetchPromise = await nf("https://api.1inch.dev/orderbook/v3.0/1", {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json",
            "Authorization": "Bearer " + inchDevApiKey,
        },
        "body": JSON.stringify(data),
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

