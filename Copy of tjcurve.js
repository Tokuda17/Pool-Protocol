/*

  impermanent loss on $300 with uniform distribution ($150) across 2 ticks vs
  200 100 allocation 

ETH price vs USDC
  2000
  1900 $150 USDC
  1800 $150 USDC

  2000
  1900 $200 USDC
  1800 $100 USDC

  2000
  1900 $100 USDC
  1800 $200 USDC

  2000
  1900  $50 USDC
  1800 $250 USDC

Starting wallet = $300 USDC, ETH price = $2000
Ending ETH price = $1800

Case 1:
  150/1950 = 0.07692
  150/1850 = 0.08108
  ETH = 0.158004 (-$15.5)
  
Case 2:
  200/1950 = 0.10256
  100/1850 = 0.05405
  ETH = 0.15661

Case 3:
  100/1950 = 0.05128
  200/1850 = 0.10810
  ETH = 0.15939 (-$14)

Case 4:
*/
