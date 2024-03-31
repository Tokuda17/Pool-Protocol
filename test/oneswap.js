const Web3 = require('web3');
//import fetch from 'node-fetch';
//const fetch = require('node-fetch');
const yesno = require('yesno');
const axios = require('axios');
require('dotenv').config();
console.log(process.env);

const RPC_URL = process.env.RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY

const chainId = 137;
const web3RpcUrl = RPC_URL;
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

const broadcastApiUrl = 'https://tx-gateway.1inch.io/v1.1/' + chainId + '/broadcast';
const apiBaseUrl = 'https://api.1inch.io/v4.0/' + chainId;

function apiRequestUrl(methodName, queryParams) {
    return apiBaseUrl + methodName + '?' + (new URLSearchParams(queryParams)).toString();
}

function checkAllowance(tokenAddress, walletAddress) {
    return axios.get(apiRequestUrl('/approve/allowance', {tokenAddress, walletAddress}));
//    return axios.get(apiRequestUrl('/approve/allowance', {tokenAddress, walletAddress}));
}

async function main ()
{
  const allowance = await checkAllowance(swapParams.fromTokenAddress, walletAddress);

  console.log('Allowance: ', allowance.data.allowance);
}

main();

/*
async function swapper(){
    try{
        const response = await axios.get(`https://api.1inch.exchange/v4.0/137/swap?fromTokenAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&toTokenAddress=0x8f3cf7ad23cd3cadbd9735aff958023239c6a063&amount=1000000000000000000&fromAddress=${wallet.address}&slippage=0.1&disableEstimate=true`)
  console.log(response);
        if(response.data){
            data = response.data
            data.tx.gas = 1000000
            tx = await web3.eth.sendTransaction(data.tx)
            if(tx.status){
                console.log("Swap Successfull! :)")
            }
        }
    }catch(err){
        console.log("swapper encountered an error below")
        console.log(err)
    }

}

async function main(){
    await swapper()
}

main()
*/

