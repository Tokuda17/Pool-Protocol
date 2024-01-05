function getInit(wname)
{
  if (wname == "lance" || wname == "michael") 
  {
    init = {   
      wname: "lance",
      vsym: "WAVAX",
      ssym: "USDC",
      timestamp: 1679372917,
      email: "lance",
      //netValue:   1211800,
      //netValue:   1783715,
      //netValue:   1982284,
      //netValue:   1752284,
      //netValue:   1757284,
      //netValue:   1832284,
      //netValue:   1652284,
      //netValue:   1702284,
      //netValue:   1777284,
      //netValue:   1697284,
      //netValue:   1827284,
      //netValue:   1747284,
      //netValue:   1797284,
      //netValue:   1817284,
      //netValue:   1717284,
      //netValue:   1787284,
      //netValue:   1613211,
      //netValue:   1553211,
      netValue:   1453211,
      collateral: 2158000 
    };
  }
  else
  {
    init = {
      timestamp: 1676099813,
      netValue: 30.53561756,
      collateral: 7600
    };
  }
  return init;
}

module.exports = Object.assign({
  getInit
});

