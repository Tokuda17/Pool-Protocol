const axios = require("axios");

async function main()
{
  const config = {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': "macOS",
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Cookie': '_tt_enable_cookie=1; _ttp=34309717-beda-4a35-b5df-efcb667be241; intercom-id-zgn72x6y=b54bc79d-3f36-415f-b776-74a1def5ff3f; _ga_CYSMXG40WS=GS1.1.1658721448.22.0.1658721452.56; intercom-device-id-zgn72x6y=052a6093-42c7-4981-8b7d-83b7abf62cdd; _ga_N26MP432JT=GS1.1.1682722756.10.0.1682722760.0.0.0; _ga=GA1.1.2119616609.1654656199; mp_4767a8d022395a530c849570ad9828f6_mixpanel=%7B%22distinct_id%22%3A%20%2218558f4e028cf3-0c87e886181917-17525635-3f4800-18558f4e0291bc3%22%2C%22%24device_id%22%3A%20%2218558f4e028cf3-0c87e886181917-17525635-3f4800-18558f4e0291bc3%22%2C%22%24initial_referrer%22%3A%20%22https%3A%2F%2Fapp.1inch.io%2F%22%2C%22%24initial_referring_domain%22%3A%20%22app.1inch.io%22%7D; _gcl_au=1.1.1490423820.1686787677; _ga_L6TP23N370=GS1.1.1688146249.77.1.1688146254.55.0.0; _ga_9D763FF898=GS1.1.1688146202.327.1.1688146277.45.0.0; __cf_bm=qoUzvQBL_ZMWk11EL17cMGw0uZq7Ut7YTf4DSGnzmDw-1689040055-0-AVj+lhZ/CijAG5PEpBa2msDT+SM6lZz6GAqf86dzWjmrlTBDsPqfXhu/k7G4rkp31XQbr2V7TW/FTou9bhp/J1Q='
    }
  };
  let instance = axios.create({ withCredentials: true });
  //let txt = await instance.get(url,config);
  let txt = await axios.get(url,config);
  console.log(txt);
}
main();
