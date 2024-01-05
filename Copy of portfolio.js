
let portfolio = {
  email: "multi",  // tag to lookup who you should email.  false should not email
  uniswapV3: 
    {chain: "op", 
     wname: "lance", 
     pair: { 
       vsym: "OP", 
       ssym: "WETH", 
       span: 6, 
       spacing: 60, 
       poolFee: 3000,
       fee: 0.005, 
       threshRatio: 0.01,
       spanThresh: 170,
       value: 20000,
       optRatio: 0.9
     }}, 
  wallets: [
    {wname: "lance", chain: "op"}, // looking up wallet addresses on different chains
    //{wname: "lance", chain: "poly"}
    // ,{wname: "lance", chain: "arb", includelist: ["ETH", "USDC","WETH"]}
    // ,{wname: "lance", chain: "eth", includelist: []}
    ],
  start: {
      timestamp: 1695964953,
      samt: 15.895977132039016,
      vamt: 23488.440944073547

    }
};


function get()
{
  return portfolio;
}

module.exports = Object.assign({
  get
});

