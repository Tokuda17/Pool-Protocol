const pool=require("./poolOp.js");
const multi=require("./multiswap.js");
const wall=require("./wallet.js");

async function main()
{
  let port = {
    email: "multi",  // tag to lookup who you should email. false should not email
    uniswapV3: {chain: "op",wname: "lance"}, // where to create Uniswap V3 positions
    wallets: [
      {wname: "lance", chain: "op"}, // looking up wallet addresses on different chains
      {wname: "lance", chain: "poly"}
      ]
  };
  let pos = await pool.adjustMulti(port,false);
  //await multi.swap(port,"USDC","ETH",1);
}

main();
