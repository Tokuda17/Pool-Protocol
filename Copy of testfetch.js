const f = require("node-fetch");

async function main()
{
  let response = await f(url);
  let txt = await response.text();
  console.log(txt);

}
main();
