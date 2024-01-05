
let portfolio = {
  chain: "avax",
  email: "lance",  // tag to lookup who you should email.  false should not email
  wallets: [
    {wname: "lance", chain: "avax"} // looking up wallet addresses on different chains
    ],
  start: {
      timestamp: 1700341687,
      samt: 5.761657052133425,
      vamt: 792.8026716930023
    }
};


function get()
{
  return portfolio;
}

module.exports = Object.assign({
  get
});

