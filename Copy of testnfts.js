const ankr = require("./ankr.js");

async function main()
{
  let nfts = await ankr.getNFTs('0x657E21723aE99C05c9C2a6032343C7865Bcb1940'); 
  //console.log("nfts");
}

main();
