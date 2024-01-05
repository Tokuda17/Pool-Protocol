const axios = require("axios");
const web = require('./web3.js');
const inch = require('@1inch/limit-order-protocol-utils');
const wall = require('./wallet.js');

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

let limitOrderBuilder;
let limitOrder;
let connector;
const inchDevApiKey = 'tRUaWIKLtctwTxWAATi82brXocuJbmQb';

async function main()
{
let wallet = wall.init("lance","op");
let web3 = web.web3.obj;
let pk = wall.getPrivateKey(); 
console.log("pk=",pk);
pk = pk.replace('0x','');
connector = new inch.PrivateKeyProviderConnector(pk, web3); //it's usually best not to store the private key in the code as plain text, encrypting/decrypting it is a good practice
const walletAddress = "0x0fFeb87106910EEfc69c1902F411B431fFc424FF" // the public address associated with your private key
const chainId = 10; // suggested, or use your own number
const contractAddress = inch.limitOrderProtocolAddresses[chainId];
const seriesContractAddress = inch.seriesNonceManagerContractAddresses[chainId];

console.log("1. ca=",contractAddress,seriesContractAddress);

const fromToken = '0x4200000000000000000000000000000000000042';
const toToken = '0x4200000000000000000000000000000000000006';                    //this is the token address that you want to buy
const fromAmount = '100000000000000000';                                                          //this is the amount of tokens you want to sell, make sure it's in minimum divisible units
const toAmount = '81000000000000';                                                //this is how much of the to token you want to buy. make sure it's in minimum divisible units
const seconds = 60;                                                              //this is how many seconds the order is active for, it can be any non-negative number


const limitOrderProtocolFacade = new inch.LimitOrderProtocolFacade(contractAddress, chainId, connector);
const seriesNonceManagerFacade = new inch.SeriesNonceManagerFacade(seriesContractAddress, chainId, connector);
const seriesNonceManagerPredicateBuilder = new inch.SeriesNonceManagerPredicateBuilder(seriesNonceManagerFacade);
const limitOrderPredicateBuilder = new inch.LimitOrderPredicateBuilder(limitOrderProtocolFacade);
const erc20Facade = new inch.Erc20Facade(connector);
// const limitOrderBuilder = new inch.LimitOrderBuilder(limitOrderProtocolFacade, erc20Facade);
limitOrderBuilder = new inch.LimitOrderBuilder(contractAddress, chainId, connector);

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

limitOrder = limitOrderBuilder.buildLimitOrder({
    makerAssetAddress: fromToken,
    takerAssetAddress: toToken,
    makerAddress: walletAddress,
    makingAmount: fromAmount,
    takingAmount: toAmount,
    predicate: simpleLimitOrderPredicate,
    salt: "" + Math.floor(Math.random()*100000000),
});

console.log(limitOrder)
await orderPlace();

}

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

console.log("2. lotd=",limitOrderTypedData,limitOrderSignature,limitOrderHash);
    
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

console.log("3. los=",limitOrderSignature,"loh=",limitOrderHash);

    const signature = limitOrderSignature;
    const data = {
        "orderHash": limitOrderHash,
        "signature": signature,
        "data": limitOrder
    }
console.log("4. sig=",signature,data);
exit();
    console.log(JSON.stringify(data, null, 2));

    let orderResult = await axios.post("https://api.1inch.dev/orderbook/v3.0/1", 
        data,
        {
          "headers": {
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json",
            "Authorization": "Bearer " + inchDevApiKey,
          }
        });

    console.log("\n\n" + orderResult);
}

main();
