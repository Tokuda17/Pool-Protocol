
let portfolio = {
  email: "multi",  // tag to lookup who you should email.  false should not email
  uniswapV3: 
    {chain: "poly", wname: "lance", 
     pair: { 
       vsym: "WETH", 
       ssym: "USDC", 
       span: 36, 
       spacing: 10, 
       fee: 0.005, 
       threshRatio: 0.01,
       spanThresh: 179,
       value: 1000,
       optRatio: 0.9
     }}, 
  wallets: [
    // {wname: "lance", chain: "op"}, // looking up wallet addresses on different chains
    {wname: "lance", chain: "poly"}
    // ,{wname: "lance", chain: "arb", includelist: ["ETH", "USDC","WETH"]}
    // ,{wname: "lance", chain: "eth", includelist: []}
    ],
  start: {
      timestamp: 1688937022,
      susd: 38079.662434,
      vamt: 32.795390827250515
    }
};


function get()
{
  return portfolio;
}

module.exports = Object.assign({
  get
});

