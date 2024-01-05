const fusion = require("@1inch/fusion-sdk");
const limit=require('@1inch/limit-order-protocol-utils');

// using node 14.21.12
web = require("./web3.js");
web.init("eth");
const web3=web.web3.obj;

const wall = require("./wallet.js");

fetch = require('node-fetch'); // specifically version node-fetch@2.6.7


/*
// don't forget to install ts-node and tslib
import Web3 from 'web3';
import {
    limirOrderProtocolAdresses, // deliberately misspelled
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

const pk = wall.getPrivateKey();
const connector = new fusion.PrivateKeyProviderConnector(pk, web3); //it's usually best not to store the private key in the code as plain text, encrypting/decrypting it is a good practice

//console.log("pk=",pk,connector);

const walletAddress = "0x0fFeb87106910EEfc69c1902F411B431fFc424FF";
const chainId = 1; // suggested, or use your own number
//const contractAddress = limit.limirOrderProtocolAdresses[chainId];
const contractAddress = '0x119c71D3BbAC22029622cbaEc24854d3D32D2828'; //this is the limit order contract address for the mainnet

const seriesContractAddress = limit.seriesNonceManagerContractAddresses[chainId];


const fromToken = '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e';                  //this is the token address that you want to sell
const toToken = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';                    //this is the token address that you want to buy
const fromAmount = '100000000';                                                          //this is the amount of tokens you want to sell, make sure it's in minimum divisible units
const toAmount =   '300000000';                                                //this is how much of the to token you want to buy. make sure it's in minimum divisible units
const seconds = 60000000;                                                              //this is how many seconds the order is active for, it can be any non-negative number


const limitOrderProtocolFacade = new limit.LimitOrderProtocolFacade(contractAddress, chainId, connector);
const seriesNonceManagerFacade = new limit.SeriesNonceManagerFacade(seriesContractAddress, chainId, connector);
const seriesNonceManagerPredicateBuilder = new limit.SeriesNonceManagerPredicateBuilder(seriesNonceManagerFacade);
const limitOrderPredicateBuilder = new limit.LimitOrderPredicateBuilder(limitOrderProtocolFacade);
const erc20Facade = new limit.Erc20Facade(connector);
const limitOrderBuilder = new limit.LimitOrderBuilder(contractAddress, chainId, connector);

const expiration = Math.floor(Date.now() / 1000) + seconds; // expiration in seconds
// const nonce = seriesNonceManagerFacade.getNonce(limit.NonceSeriesV2.LimitOrderV3, walletAddress).then((nonce) => nonce.toNumber());
// above doesn't work without an await so we'll temporarily hardcode the nonce
const nonce = 0;
// Creates predicate that restricts Limit Order invalidation conditions
// Because timestampBelowAndNonceEquals is method of another contract arbitraryStaticCall() is necessary
const simpleLimitOrderPredicate = limitOrderPredicateBuilder.arbitraryStaticCall( // is type LimitOrderPredicateCallData
    seriesNonceManagerPredicateBuilder.facade,
    seriesNonceManagerPredicateBuilder.timestampBelowAndNonceEquals(
        limit.NonceSeriesV2.LimitOrderV3,
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
    salt: Math.floor(Math.random()*100000000),
});

console.log(limitOrder)


async function getSignatureAndHash() {

    const limitOrderTypedData = limitOrderBuilder.buildLimitOrderTypedData(
        limitOrder,
    );
    const limitOrderSignature = await limitOrderBuilder.buildOrderSignature(
        walletAddress,
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
        "data": limitOrder // defined outside the scope of this function (above)
    }
    console.log(JSON.stringify(data, null, 2));

    let fetchPromise = await fetch("https://limit-orders.1inch.io/v3.0/1/limit-order", {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json",
        },
        "data": JSON.stringify(data),
        "method": "POST"
    }).then((res) => {
        return res.json()
    }).then((jsonData => {
        console.log(jsonData);
    }));


    try {
        console.log("\n\n" + (fetchPromise.data));
    } catch (e) { }
}

orderPlace();
