const ethers = require("ethers");
require("dotenv").config();
const chain = require("./chain.js");

const AVALANCHE_RPC_URL = process.env.AVALANCHE_RPC_URL;
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const OPTIMISM_RPC_URL = process.env.OPTIMISM_RPC_URL;
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL;
const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL;

//const providerOp = new ethers.providers.JsonRpcProvider("https://opt-mainnet.g.alchemy.com/v2/rHtq3eFE7jm_xUmUNJOOOg4LR9wngukb");
const providerOp = new ethers.AlchemyProvider("optimism","rHtq3eFE7jm_xUmUNJOOOg4LR9wngukb");
const providerPoly = new ethers.AlchemyProvider("matic","AmllS7MVSHEnkL8dxIWD0QiDQhMWe5Ry");
const providerArb = new ethers.AlchemyProvider("arbitrum","-aIjTJiAjkaQVE7aJio0ew42h0b39iZf");
const providerEth = new ethers.AlchemyProvider("homestead","0cbue9UUJ2iTntNKop8bnJTujqtNAwbS");
