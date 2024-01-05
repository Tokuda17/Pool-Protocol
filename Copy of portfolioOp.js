
let portfolio = {
  email: "op",  // tag to lookup who you should email.  false should not email
  uniswapV3: 
    {chain: "op", wname: "lance", 
     pair: { 
       vsym: "WETH", 
       ssym: "USDC", 
       span: 18, 
       spacing: 10, 
       fee: 0.005, 
       threshRatio: 0.01,
       spanThresh: 90,
       value: 10000,
       optRatio: 0.9
     }}, 
  wallets: [
    {wname: "lance", chain: "op"}
    //, // looking up wallet addresses on different chains
    //{wname: "lance", chain: "poly"}
    // ,{wname: "lance", chain: "arb", includelist: ["ETH", "USDC","WETH"]}
    // ,{wname: "lance", chain: "eth", includelist: []}
    ],
  start: {
      timestamp: 1686104422,
      susd: 46144.637658,
      vamt: 26.482017198597546
    }
};


function get()
{
  return portfolio;
}

module.exports = Object.assign({
  get
});

