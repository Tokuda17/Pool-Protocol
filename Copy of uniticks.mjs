import { ethers } from 'ethers';
import * as fs from 'fs';

let pool = fs.readFileSync('/Users/phdlance/Google\ Drive/My\ Documents/Finance/Crypto/DeFi\ Project/lance/node_modules/@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');

const IUniswapV3PoolABI = JSON.parse(pool);
console.log("IUniswapV3PoolABI", IUniswapV3PoolABI);

let V3pool = '0x85149247691df622eaF1a8Bd0CaFd40BC45154a9';

const provider = new ethers.providers.JsonRpcProvider("https://opt-mainnet.g.alchemy.com/v2/rHtq3eFE7jm_xUmUNJOOOg4LR9wngukb");

let poolContract = new ethers.Contract(V3pool, IUniswapV3PoolABI.abi, provider);

var tickLow = await poolContract.ticks("-201280");
console.log("tickLow",tickLow);

export function test()
{
  console.log("TESTING");
}


/*
module.exports = Object.assign({
  test
});     
*/
