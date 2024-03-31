const Web3 = require('web3');
const yesno = require('yesno');
const axios = require('axios');
require('dotenv').config();
//console.log("After dotenv\n");
//console.log(process.env);

const RPC_URL = process.env.RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY

const chainId = 137;
const broadcastApiUrl = 'https://tx-gateway.1inch.io/v1.1/' + chainId + '/broadcast';
const apiBaseUrl = 'https://api.1inch.io/v4.0/' + chainId;
const web3RpcUrl = RPC_URL;
const privateKey = PRIVATE_KEY;
const web3 = new Web3(web3RpcUrl);
const wallet = web3.eth.accounts.wallet.add(PRIVATE_KEY)
const walletAddress = wallet.address;

const swapParams = {
    fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // MATIC
    toTokenAddress: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', // DAI
    amount: '100000000000000000',
    fromAddress: wallet.address,
    slippage: 1,
    disableEstimate: false,
    allowPartialFill: false,
};

function apiRequestUrl(methodName, queryParams) {
    return apiBaseUrl + methodName + '?' + (new URLSearchParams(queryParams)).toString();
}

function checkAllowance(tokenAddress, walletAddress) {
    //console.log("Before axios.get\n");
    return axios.get(apiRequestUrl('/approve/allowance', {tokenAddress, walletAddress})).then(res => res.data.allowance);
//    return axios.get(apiRequestUrl('/approve/allowance', {tokenAddress, walletAddress}));
}

async function broadCastRawTransaction(rawTransaction) {
    const data = JSON.stringify({rawTransaction});
    console.log("DATA is : ", data);
    return axios.post(
      broadcastApiUrl, 
      data,
      {
        headers: {'Content-Type': 'application/json'}
      })
        .then(res => {
            return res.data.transactionHash;
        });
}

async function signAndSendTransaction(transaction) {
    const {rawTransaction} = await web3.eth.accounts.signTransaction(transaction, privateKey);

    return await broadCastRawTransaction(rawTransaction);
}

async function buildTxForApproveTradeWithRouter(tokenAddress, amount) {
    console.log("Wallet address: ", walletAddress);
    console.log("Token address: ", tokenAddress);
    const url = apiRequestUrl(
        '/approve/transaction',
        amount ? {tokenAddress, amount} : {tokenAddress}
    );

    console.log("url: ", url);
    const transaction = await axios.get(url).then(res => res.data);

    console.log("Transaction: ", transaction);
    const gasLimit = await web3.eth.estimateGas({
        ...transaction,
        from: walletAddress
    });

    console.log("step3");
    return {
        ...transaction,
        gas: gasLimit
    };
}

async function buildTxForSwap(swapParams) {
    const url = apiRequestUrl('/swap', swapParams);

    return axios.get(url).then(res => res.data.tx);
}

async function main()
{

// First, let's build the body of the transaction
/*
const transactionForSign = await buildTxForApproveTradeWithRouter(swapParams.fromTokenAddress);
console.log('Transaction for approve: ', transactionForSign);

const ok = await yesno({
    question: 'Do you want to send a transaction to approve trade with 1inch router?'
});

*/
// Before signing a transaction, make sure that all parameters in it are specified correctly
/*
if (!ok) {
    console.log("REJECTION");
    return false;
}
else {
    console.log("OK Confirmed");
}
*/
// Send a transaction and get its hash
/*
const approveTxHash = await signAndSendTransaction(transactionForSign);

console.log('Approve tx hash: ', approveTxHash);
*/

// First, let's build the body of the transaction
const swapTransaction = await buildTxForSwap(swapParams);
console.log('Transaction for swap: ', swapTransaction);

const ok = await yesno({
    question: 'Do you want to send a transaction to exchange with 1inch router?'
});

// Before signing a transaction, make sure that all parameters in it are specified correctly
if (!ok) {
    return false;
}

// Send a transaction and get its hash
const swapTxHash = await signAndSendTransaction(swapTransaction);
console.log('Swap transaction hash: ', swapTxHash);

}

main();
