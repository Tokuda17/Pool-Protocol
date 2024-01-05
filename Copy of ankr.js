const axios = require('axios');

async function getNFTs(walletAddress)
{
console.log("getNFTs",walletAddress);
  const headers = { headers: { "Content-Type": "application/json" } };
  const url = 'https://rpc.ankr.com/multichain/3f4c7e785e4be776a14be9bac8d263d14b6fdf3b6877f582f0534efdb29f6549';
console.log("url=",url);
  let nextPageToken="";
  let nfts = [];
  let body;
  let response;
  let page = 0;
  while (true)
  {
    body = '{ "jsonrpc": "2.0", "method": "ankr_getNFTsByOwner", "params": { "blockchain": ["avalanche"], "walletAddress": "'+walletAddress+'", "pageSize": 50, "pageToken": "'+nextPageToken+'" }, "id": 1 }';
    response = await axios.post(url,body,headers);
console.log("response=",response);
    newnfts = response.data.result.assets;
    nfts = nfts.concat(newnfts);
    nextPageToken = response.data.result.nextPageToken;
    console.log("nfts=",nfts,nextPageToken);
    if (!nextPageToken)
      break;
  }
  console.log("final nfts=",nfts,nfts.length);
  if (Array.isArray(nfts))
    return nfts;
  else
    return [];
}

//getNFTs('0x0fFeb87106910EEfc69c1902F411B431fFc424FF');

module.exports = Object.assign({
  getNFTs
});
