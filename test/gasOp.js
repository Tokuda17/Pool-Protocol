const axios = require("axios");

async function getMaxPriorityFee()
{
  let gasPrice = 100000000;
  try {
    const url = 'https://opt-mainnet.g.alchemy.com/v2/rHtq3eFE7jm_xUmUNJOOOg4LR9wngukb';
    const response = await axios.post(url, {id: 1,jsonrpc: "2.0",method: "eth_maxPriorityFeePerGas"}); 
    if (response && response.data && response.data.result)
    {
console.log("result=",response);
      gasPrice = parseInt(response.data.result,16);
//      if (gasPrice <= 100000000)
//        gasPrice = 100000000;
    }
    console.log("MaxPriorityFee=",gasPrice);
    return gasPrice;
  } catch (e) {
    console.log(e.message+" => gasArb.getMaxPriorityFee() failed");
    return gasPrice;
  }
}

//getMaxPriorityFee();

module.exports = Object.assign({
  getMaxPriorityFee
});


