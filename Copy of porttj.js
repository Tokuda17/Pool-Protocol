
let portfolio = {
  email: "yield",  // tag to lookup who you should email.  false should not email
  tj: 
    {chain: "avax", 
     wname: "yield", 
     pair: { 
       vsym: "WAVAX", 
       ssym: "WETH.e", 
       threshRatio: 0.005,
       rebalance: 5,
       bins: 69,  // base was 49 bins with $350K
       binStep: 10, 
       value: 492857
     }}, 
  wallets: [
    {wname: "lance", chain: "avax", blocklist: ["AVAX"]} // looking up wallet addresses on different chains
    ],
  start: {
      timestamp: 1700466709,
      samt: 246.81174373218215,
      vamt: 6985.431885644035
    }
};


function get()
{
  return portfolio;
}

module.exports = Object.assign({
  get
});

