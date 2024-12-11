import { ethers } from 'ethers'
import { toContractPrecision, BUCKET_X2, BUCKET_C0 } from '../utils.js'

// Connector Addresses Function
const connectorAddresses = async (dContracts, configProject) => {
  const multicall = dContracts.contracts.multicall
  const mocconnector = dContracts.contracts.mocconnector
  const appMode = configProject.appMode

  const listCalls = [
    { target: mocconnector.address, callData: mocconnector.interface.encodeFunctionData('mocState') },
    { target: mocconnector.address, callData: mocconnector.interface.encodeFunctionData('mocInrate') },
    { target: mocconnector.address, callData: mocconnector.interface.encodeFunctionData('mocExchange') },
    { target: mocconnector.address, callData: mocconnector.interface.encodeFunctionData('mocSettlement') }
  ]

  const returnTypes = [
    'address', // mocState
    'address', // mocInrate
    'address', // mocExchange
    'address' // mocSettlement
  ]

  if (appMode === 'MoC') {
    listCalls.push({ target: mocconnector.address, callData: mocconnector.interface.encodeFunctionData('docToken') })
    listCalls.push({ target: mocconnector.address, callData: mocconnector.interface.encodeFunctionData('bproToken') })
    listCalls.push({ target: mocconnector.address, callData: mocconnector.interface.encodeFunctionData('bproToken') })
    returnTypes.push('address') // docToken
    returnTypes.push('address') // bproToken
    returnTypes.push('address') // bproToken
  } else {
    listCalls.push({ target: mocconnector.address, callData: mocconnector.interface.encodeFunctionData('stableToken') })
    listCalls.push({ target: mocconnector.address, callData: mocconnector.interface.encodeFunctionData('riskProToken') })
    listCalls.push({ target: mocconnector.address, callData: mocconnector.interface.encodeFunctionData('reserveToken') })
    returnTypes.push('address') // stableToken
    returnTypes.push('address') // riskProToken
    returnTypes.push('address') // reserveToken
  }

  const [blockHeight, returnDataArray] = await multicall.tryBlockAndAggregate(false, listCalls)
  console.log('🚀 ~ connectorAddresses ~ blockHeight:', blockHeight)

  const listReturnData = returnDataArray.map((callResult, index) => {
    if (callResult.success) {
      return ethers.utils.defaultAbiCoder.decode([returnTypes[index]], callResult.returnData)[0]
    } else {
      // Handle failed call, e.g., return null or throw an error
      return null
    }
  })

  return listReturnData
}

// Contract Status Function
const contractStatus = async (dContracts, configProject) => {
  const appMode = configProject.appMode
  const appProject = configProject.appProject

  const multicall = dContracts.contracts.multicall
  const moc = dContracts.contracts.moc
  const mocstate = dContracts.contracts.mocstate
  const mocinrate = dContracts.contracts.mocinrate
  const mocsettlement = dContracts.contracts.mocsettlement

  console.log('Reading contract status ...')

  let listCalls = []
  let returnTypes = []

  if (appMode === 'MoC') {
    listCalls = [
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBitcoinPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getMoCPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('absoluteMaxBPro') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('maxBProx', [BUCKET_X2]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('absoluteMaxDoc') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('freeDoc') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('leverage', [BUCKET_C0]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('cobj') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('leverage', [BUCKET_X2]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('rbtcInSystem') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBitcoinMovingAverage') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getInrateBag', [BUCKET_C0]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBucketNBTC', [BUCKET_C0]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBucketNDoc', [BUCKET_C0]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBucketNBPro', [BUCKET_C0]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBucketNBTC', [BUCKET_X2]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBucketNDoc', [BUCKET_X2]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBucketNBPro', [BUCKET_X2]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('globalCoverage') },
      { target: moc.address, callData: moc.interface.encodeFunctionData('getReservePrecision') },
      { target: moc.address, callData: moc.interface.encodeFunctionData('getMocPrecision') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('coverage', [BUCKET_X2]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('bproTecPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('bproUsdPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('bproSpotDiscountRate') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('maxBProWithDiscount') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('bproDiscountPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('bucketBProTecPrice', [BUCKET_X2]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('bproxBProPrice', [BUCKET_X2]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('spotInrate') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('MINT_BPRO_FEES_RBTC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('REDEEM_BPRO_FEES_RBTC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('MINT_DOC_FEES_RBTC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('REDEEM_DOC_FEES_RBTC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('MINT_BTCX_FEES_RBTC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('REDEEM_BTCX_FEES_RBTC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('MINT_BPRO_FEES_MOC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('REDEEM_BPRO_FEES_MOC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('MINT_DOC_FEES_MOC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('REDEEM_DOC_FEES_MOC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('MINT_BTCX_FEES_MOC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('REDEEM_BTCX_FEES_MOC') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('dayBlockSpan') },
      { target: mocsettlement.address, callData: mocsettlement.interface.encodeFunctionData('getBlockSpan') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('blocksToSettlement') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('state') },
      { target: moc.address, callData: moc.interface.encodeFunctionData('paused') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getLiquidationEnabled') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getProtected') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getMoCToken') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getMoCPriceProvider') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBtcPriceProvider') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getMoCVendors') }
    ]

    returnTypes = [
      'uint256', // 0
      'uint256', // 1
      'uint256', // 2
      'uint256', // 3
      'uint256', // 4
      'uint256', // 5
      'uint256', // 6
      'uint256', // 7
      'uint256', // 8
      'uint256', // 9
      'uint256', // 10
      'uint256', // 11
      'uint256', // 12
      'uint256', // 13
      'uint256', // 14
      'uint256', // 15
      'uint256', // 16
      'uint256', // 17
      'uint256', // 18
      'uint256', // 19
      'uint256', // 20
      'uint256', // 21
      'uint256', // 22
      'uint256', // 23
      'uint256', // 24
      'uint256', // 25
      'uint256', // 26
      'uint256', // 27
      'uint256', // 28
      'uint256', // 29
      'uint256', // 30
      'uint256', // 31
      'uint256', // 32
      'uint256', // 33
      'uint256', // 34
      'uint256', // 35
      'uint256', // 36
      'uint256', // 37
      'uint256', // 38
      'uint256', // 39
      'uint256', // 40
      'uint256', // 41
      'uint256', // 42
      'uint256', // 43
      'uint256', // 44
      'uint256', // 45
      'bool', // 46
      'bool', // 47
      'uint256', // 48
      'address', // 49
      'address', // 50
      'address', // 51
      'address' // 52
    ]
  } else {
    listCalls = [
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getReserveTokenPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getMoCPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('absoluteMaxRiskPro') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('maxRiskProx', [BUCKET_X2]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('absoluteMaxStableToken') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('freeStableToken') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('leverage', [BUCKET_C0]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('cobj') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('leverage', [BUCKET_X2]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('reserves') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getExponentalMovingAverage') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getInrateBag', [BUCKET_C0]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBucketNReserve', [BUCKET_C0]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBucketNStableToken', [BUCKET_C0]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBucketNRiskPro', [BUCKET_C0]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBucketNReserve', [BUCKET_X2]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBucketNStableToken', [BUCKET_X2]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBucketNRiskPro', [BUCKET_X2]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('globalCoverage') },
      { target: moc.address, callData: moc.interface.encodeFunctionData('getReservePrecision') },
      { target: moc.address, callData: moc.interface.encodeFunctionData('getMocPrecision') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('coverage', [BUCKET_X2]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('riskProTecPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('riskProUsdPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('riskProSpotDiscountRate') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('maxRiskProWithDiscount') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('riskProDiscountPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('bucketRiskProTecPrice', [BUCKET_X2]) },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('riskProxRiskProPrice', [BUCKET_X2]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('spotInrate') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('MINT_RISKPRO_FEES_RESERVE') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('REDEEM_RISKPRO_FEES_RESERVE') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('MINT_STABLETOKEN_FEES_RESERVE') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('REDEEM_STABLETOKEN_FEES_RESERVE') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('MINT_RISKPROX_FEES_RESERVE') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('REDEEM_RISKPROX_FEES_RESERVE') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('MINT_RISKPRO_FEES_MOC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('REDEEM_RISKPRO_FEES_MOC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('MINT_STABLETOKEN_FEES_MOC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('REDEEM_STABLETOKEN_FEES_MOC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('MINT_RISKPROX_FEES_MOC') },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('REDEEM_RISKPROX_FEES_MOC') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('dayBlockSpan') },
      { target: mocsettlement.address, callData: mocsettlement.interface.encodeFunctionData('getBlockSpan') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('blocksToSettlement') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('state') },
      { target: moc.address, callData: moc.interface.encodeFunctionData('paused') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getLiquidationEnabled') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getProtected') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getMoCToken') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getMoCPriceProvider') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBtcPriceProvider') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getMoCVendors') }
    ]

    returnTypes = [
      'uint256', // 0
      'uint256', // 1
      'uint256', // 2
      'uint256', // 3
      'uint256', // 4
      'uint256', // 5
      'uint256', // 6
      'uint256', // 7
      'uint256', // 8
      'uint256', // 9
      'uint256', // 10
      'uint256', // 11
      'uint256', // 12
      'uint256', // 13
      'uint256', // 14
      'uint256', // 15
      'uint256', // 16
      'uint256', // 17
      'uint256', // 18
      'uint256', // 19
      'uint256', // 20
      'uint256', // 21
      'uint256', // 22
      'uint256', // 23
      'uint256', // 24
      'uint256', // 25
      'uint256', // 26
      'uint256', // 27
      'uint256', // 28
      'uint256', // 29
      'uint256', // 30
      'uint256', // 31
      'uint256', // 32
      'uint256', // 33
      'uint256', // 34
      'uint256', // 35
      'uint256', // 36
      'uint256', // 37
      'uint256', // 38
      'uint256', // 39
      'uint256', // 40
      'uint256', // 41
      'uint256', // 42
      'uint256', // 43
      'uint256', // 44
      'uint256', // 45
      'bool', // 46
      'bool', // 47
      'uint256', // 48
      'address', // 49
      'address', // 50
      'address', // 51
      'address' // 52
    ]
  }

  // Execute Multicall
  const [blockHeight, returnDataArray] = await multicall.tryBlockAndAggregate(false, listCalls)

  // Decode Return Data
  const listReturnData = returnDataArray.map((callResult, index) => {
    if (callResult.success) {
      return ethers.utils.defaultAbiCoder.decode([returnTypes[index]], callResult.returnData)[0]
    } else {
      // Handle failed call, e.g., return null or throw an error
      return null
    }
  })

  // Populate dMocState Object
  const dMocState = {}
  dMocState.blockHeight = blockHeight
  dMocState.bitcoinPrice = listReturnData[0]
  dMocState.mocPrice = listReturnData[1]
  dMocState.bproAvailableToRedeem = listReturnData[2]
  dMocState.bprox2AvailableToMint = listReturnData[3]
  dMocState.docAvailableToMint = listReturnData[4]
  dMocState.docAvailableToRedeem = listReturnData[5]
  dMocState.b0Leverage = listReturnData[6]
  dMocState.b0TargetCoverage = listReturnData[7]
  dMocState.x2Leverage = listReturnData[8]
  dMocState.totalBTCAmount = listReturnData[9]
  dMocState.bitcoinMovingAverage = listReturnData[10]
  dMocState.b0BTCInrateBag = listReturnData[11]
  dMocState.b0BTCAmount = listReturnData[12]
  dMocState.b0DocAmount = listReturnData[13]
  dMocState.b0BproAmount = listReturnData[14]
  dMocState.x2BTCAmount = listReturnData[15]
  dMocState.x2DocAmount = listReturnData[16]
  dMocState.x2BproAmount = listReturnData[17]
  dMocState.globalCoverage = listReturnData[18]
  dMocState.reservePrecision = listReturnData[19]
  dMocState.mocPrecision = listReturnData[20]
  dMocState.x2Coverage = listReturnData[21]
  dMocState.bproPriceInRbtc = listReturnData[22]
  dMocState.bproPriceInUsd = listReturnData[23]
  dMocState.bproDiscountRate = listReturnData[24]
  dMocState.maxBproWithDiscount = listReturnData[25]
  dMocState.bproDiscountPrice = listReturnData[26]
  dMocState.bprox2PriceInRbtc = listReturnData[27]
  dMocState.bprox2PriceInBpro = listReturnData[28]
  dMocState.spotInrate = listReturnData[29]

  // Commission Rates Types
  const commissionRatesTypes = {}

  if (appMode === 'MoC') {
    commissionRatesTypes.MINT_BPRO_FEES_RBTC = listReturnData[30]
    commissionRatesTypes.REDEEM_BPRO_FEES_RBTC = listReturnData[31]
    commissionRatesTypes.MINT_DOC_FEES_RBTC = listReturnData[32]
    commissionRatesTypes.REDEEM_DOC_FEES_RBTC = listReturnData[33]
    commissionRatesTypes.MINT_BTCX_FEES_RBTC = listReturnData[34]
    commissionRatesTypes.REDEEM_BTCX_FEES_RBTC = listReturnData[35]
    commissionRatesTypes.MINT_BPRO_FEES_MOC = listReturnData[36]
    commissionRatesTypes.REDEEM_BPRO_FEES_MOC = listReturnData[37]
    commissionRatesTypes.MINT_DOC_FEES_MOC = listReturnData[38]
    commissionRatesTypes.REDEEM_DOC_FEES_MOC = listReturnData[39]
    commissionRatesTypes.MINT_BTCX_FEES_MOC = listReturnData[40]
    commissionRatesTypes.REDEEM_BTCX_FEES_MOC = listReturnData[41]
  } else {
    commissionRatesTypes.MINT_RISKPRO_FEES_RESERVE = listReturnData[30]
    commissionRatesTypes.REDEEM_RISKPRO_FEES_RESERVE = listReturnData[31]
    commissionRatesTypes.MINT_STABLETOKEN_FEES_RESERVE = listReturnData[32]
    commissionRatesTypes.REDEEM_STABLETOKEN_FEES_RESERVE = listReturnData[33]
    commissionRatesTypes.MINT_RISKPROX_FEES_RESERVE = listReturnData[34]
    commissionRatesTypes.REDEEM_RISKPROX_FEES_RESERVE = listReturnData[35]
    commissionRatesTypes.MINT_RISKPRO_FEES_MOC = listReturnData[36]
    commissionRatesTypes.REDEEM_RISKPRO_FEES_MOC = listReturnData[37]
    commissionRatesTypes.MINT_STABLETOKEN_FEES_MOC = listReturnData[38]
    commissionRatesTypes.REDEEM_STABLETOKEN_FEES_MOC = listReturnData[39]
    commissionRatesTypes.MINT_RISKPROX_FEES_MOC = listReturnData[40]
    commissionRatesTypes.REDEEM_RISKPROX_FEES_MOC = listReturnData[41]
  }

  dMocState.commissionRatesTypes = commissionRatesTypes
  dMocState.dayBlockSpan = listReturnData[42]
  dMocState.blockSpan = listReturnData[43]
  dMocState.blocksToSettlement = listReturnData[44]
  dMocState.state = listReturnData[45]
  dMocState.lastPriceUpdateHeight = 0
  dMocState.paused = listReturnData[46]
  dMocState.liquidationEnabled = listReturnData[47]
  dMocState.protected = listReturnData[48]
  dMocState.getMoCToken = listReturnData[49]
  dMocState.getMoCPriceProvider = listReturnData[50]
  dMocState.getBtcPriceProvider = listReturnData[51]
  dMocState.getMoCVendors = listReturnData[52]

  // Commission Rates Calculation
  let listCallsRates = []
  let returnTypesRates = []

  if (appMode === 'MoC') {
    listCallsRates = [
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.MINT_BPRO_FEES_RBTC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.REDEEM_BPRO_FEES_RBTC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.MINT_DOC_FEES_RBTC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.REDEEM_DOC_FEES_RBTC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.MINT_BTCX_FEES_RBTC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.REDEEM_BTCX_FEES_RBTC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.MINT_BPRO_FEES_MOC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.REDEEM_BPRO_FEES_MOC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.MINT_DOC_FEES_MOC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.REDEEM_DOC_FEES_MOC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.MINT_BTCX_FEES_MOC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.REDEEM_BTCX_FEES_MOC]) }
    ]

    returnTypesRates = [
      'uint256', // 0
      'uint256', // 1
      'uint256', // 2
      'uint256', // 3
      'uint256', // 4
      'uint256', // 5
      'uint256', // 6
      'uint256', // 7
      'uint256', // 8
      'uint256', // 9
      'uint256', // 10
      'uint256' // 11
    ]
  } else {
    listCallsRates = [
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.MINT_RISKPRO_FEES_RESERVE]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.REDEEM_RISKPRO_FEES_RESERVE]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.MINT_STABLETOKEN_FEES_RESERVE]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.REDEEM_STABLETOKEN_FEES_RESERVE]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.MINT_RISKPROX_FEES_RESERVE]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.REDEEM_RISKPROX_FEES_RESERVE]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.MINT_RISKPRO_FEES_MOC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.REDEEM_RISKPRO_FEES_MOC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.MINT_STABLETOKEN_FEES_MOC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.REDEEM_STABLETOKEN_FEES_MOC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.MINT_RISKPROX_FEES_MOC]) },
      { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('commissionRatesByTxType', [commissionRatesTypes.REDEEM_RISKPROX_FEES_MOC]) }
    ]

    returnTypesRates = [
      'uint256', // 0
      'uint256', // 1
      'uint256', // 2
      'uint256', // 3
      'uint256', // 4
      'uint256', // 5
      'uint256', // 6
      'uint256', // 7
      'uint256', // 8
      'uint256', // 9
      'uint256', // 10
      'uint256' // 11
    ]
  }

  const [blockHeight_, returnDataRatesArray] = await multicall.tryBlockAndAggregate(false, listCallsRates)
  console.log('🚀 ~ contractStatus ~ blockHeight:', blockHeight_)

  const listReturnDataRates = returnDataRatesArray.map((callResult, index) => {
    if (callResult.success) {
      return ethers.utils.defaultAbiCoder.decode([returnTypesRates[index]], callResult.returnData)[0]
    } else {
      // Handle failed call, e.g., return null or throw an error
      return null
    }
  })

  const commissionRates = {}

  if (appMode === 'MoC') {
    commissionRates.MINT_BPRO_FEES_RBTC = listReturnDataRates[0]
    commissionRates.REDEEM_BPRO_FEES_RBTC = listReturnDataRates[1]
    commissionRates.MINT_DOC_FEES_RBTC = listReturnDataRates[2]
    commissionRates.REDEEM_DOC_FEES_RBTC = listReturnDataRates[3]
    commissionRates.MINT_BTCX_FEES_RBTC = listReturnDataRates[4]
    commissionRates.REDEEM_BTCX_FEES_RBTC = listReturnDataRates[5]
    commissionRates.MINT_BPRO_FEES_MOC = listReturnDataRates[6]
    commissionRates.REDEEM_BPRO_FEES_MOC = listReturnDataRates[7]
    commissionRates.MINT_DOC_FEES_MOC = listReturnDataRates[8]
    commissionRates.REDEEM_DOC_FEES_MOC = listReturnDataRates[9]
    commissionRates.MINT_BTCX_FEES_MOC = listReturnDataRates[10]
    commissionRates.REDEEM_BTCX_FEES_MOC = listReturnDataRates[11]
  } else {
    commissionRates.MINT_RISKPRO_FEES_RESERVE = listReturnDataRates[0]
    commissionRates.REDEEM_RISKPRO_FEES_RESERVE = listReturnDataRates[1]
    commissionRates.MINT_STABLETOKEN_FEES_RESERVE = listReturnDataRates[2]
    commissionRates.REDEEM_STABLETOKEN_FEES_RESERVE = listReturnDataRates[3]
    commissionRates.MINT_RISKPROX_FEES_RESERVE = listReturnDataRates[4]
    commissionRates.REDEEM_RISKPROX_FEES_RESERVE = listReturnDataRates[5]
    commissionRates.MINT_RISKPRO_FEES_MOC = listReturnDataRates[6]
    commissionRates.REDEEM_RISKPRO_FEES_MOC = listReturnDataRates[7]
    commissionRates.MINT_STABLETOKEN_FEES_MOC = listReturnDataRates[8]
    commissionRates.REDEEM_STABLETOKEN_FEES_MOC = listReturnDataRates[9]
    commissionRates.MINT_RISKPROX_FEES_MOC = listReturnDataRates[10]
    commissionRates.REDEEM_RISKPROX_FEES_MOC = listReturnDataRates[11]
  }

  dMocState.commissionRates = commissionRates

  // Early return if appProject is 'bnb'
  if (appProject === 'bnb') return dMocState // need archive

  // Historics Price 24hs ago
  const d24BlockHeights = dMocState.blockHeight - dMocState.dayBlockSpan

  let listCallsHistoric = []
  let returnTypesHistoric = []

  if (appMode === 'MoC') {
    listCallsHistoric = [
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getBitcoinPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getMoCPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('bproUsdPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('bucketBProTecPrice', [BUCKET_X2]) }
    ]

    returnTypesHistoric = [
      'uint256', // bitcoinPrice
      'uint256', // mocPrice
      'uint256', // bproPriceInUsd
      'uint256' // bprox2PriceInRbtc
    ]
  } else {
    listCallsHistoric = [
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getReserveTokenPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('getMoCPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('riskProUsdPrice') },
      { target: mocstate.address, callData: mocstate.interface.encodeFunctionData('bucketRiskProTecPrice', [BUCKET_X2]) }
    ]

    returnTypesHistoric = [
      'uint256', // reserveTokenPrice
      'uint256', // mocPrice
      'uint256', // riskProUsdPrice
      'uint256' // bucketRiskProTecPrice
    ]
  }

  // Encode the Multicall function
  const multicallInterface = multicall.interface
  const multicallDataHistoric = multicallInterface.encodeFunctionData('tryBlockAndAggregate', [false, listCallsHistoric])

  const provider = multicall.provider

  // Perform the call at the specific block
  const rawResultHistoric = await provider.call({
    to: multicall.address,
    data: multicallDataHistoric
  }, d24BlockHeights)

  // Decode the result
  const decodedResultHistoric = multicallInterface.decodeFunctionResult('tryBlockAndAggregate', rawResultHistoric)

  const [blockHeightHistoric, returnDataHistoricArray] = decodedResultHistoric
  console.log('🚀 ~ contractStatus ~ blockHeightHistoric:', blockHeightHistoric)

  const listReturnDataHistoric = returnDataHistoricArray.map((callResult, index) => {
    if (callResult.success) {
      return ethers.utils.defaultAbiCoder.decode([returnTypesHistoric[index]], callResult.returnData)[0]
    } else {
      // Handle failed call, e.g., return null or throw an error
      return null
    }
  })

  const historic = {}
  if (appMode === 'MoC') {
    historic.bitcoinPrice = listReturnDataHistoric[0]
    historic.mocPrice = listReturnDataHistoric[1]
    historic.bproPriceInUsd = listReturnDataHistoric[2]
    historic.bprox2PriceInRbtc = listReturnDataHistoric[3]
  } else {
    historic.reserveTokenPrice = listReturnDataHistoric[0]
    historic.mocPrice = listReturnDataHistoric[1]
    historic.riskProUsdPrice = listReturnDataHistoric[2]
    historic.bucketRiskProTecPrice = listReturnDataHistoric[3]
  }
  historic.blockHeight = d24BlockHeights

  dMocState.historic = historic

  return dMocState
}

// User Balance Function
const userBalance = async (dContracts, userAddress, configProject) => {
  const appMode = configProject.appMode

  const multicall = dContracts.contracts.multicall
  const moc = dContracts.contracts.moc
  const mocinrate = dContracts.contracts.mocinrate
  const tg = dContracts.contracts.tg
  const tc = dContracts.contracts.tc
  const tp = dContracts.contracts.tp

  console.log(`Reading user balance ... account: ${userAddress}`)

  const listCalls = [
    { target: tg.address, callData: tg.interface.encodeFunctionData('balanceOf', [userAddress]) },
    { target: tg.address, callData: tg.interface.encodeFunctionData('allowance', [userAddress, moc.address]) },
    { target: tp.address, callData: tp.interface.encodeFunctionData('balanceOf', [userAddress]) },
    { target: tc.address, callData: tc.interface.encodeFunctionData('balanceOf', [userAddress]) }
  ]

  const returnTypes = [
    'uint256', // 0
    'uint256', // 1
    'uint256', // 2
    'uint256' // 3
  ]

  if (appMode === 'MoC') {
    listCalls.push({ target: multicall.address, callData: multicall.interface.encodeFunctionData('getEthBalance', [userAddress]) })
    listCalls.push({ target: moc.address, callData: moc.interface.encodeFunctionData('docAmountToRedeem', [userAddress]) })
    listCalls.push({ target: moc.address, callData: moc.interface.encodeFunctionData('bproxBalanceOf', [BUCKET_X2, userAddress]) })
    listCalls.push({ target: multicall.address, callData: multicall.interface.encodeFunctionData('getEthBalance', [userAddress]) })
    returnTypes.push('uint256') // 4
    returnTypes.push('uint256') // 5
    returnTypes.push('uint256') // 6
    returnTypes.push('uint256') // 7
  } else {
    const reservetoken = dContracts.contracts.reservetoken
    listCalls.push({ target: reservetoken.address, callData: reservetoken.interface.encodeFunctionData('balanceOf', [userAddress]) })
    listCalls.push({ target: moc.address, callData: moc.interface.encodeFunctionData('stableTokenAmountToRedeem', [userAddress]) })
    listCalls.push({ target: moc.address, callData: moc.interface.encodeFunctionData('riskProxBalanceOf', [BUCKET_X2, userAddress]) })
    listCalls.push({ target: reservetoken.address, callData: reservetoken.interface.encodeFunctionData('allowance', [userAddress, moc.address]) })
    returnTypes.push('uint256') // 4
    returnTypes.push('uint256') // 5
    returnTypes.push('uint256') // 6
    returnTypes.push('uint256') // 7
  }

  // Token migrator
  if (dContracts.contracts.tp_legacy) {
    const tpLegacy = dContracts.contracts.tp_legacy
    const tokenMigrator = dContracts.contracts.token_migrator
    listCalls.push({ target: tpLegacy.address, callData: tpLegacy.interface.encodeFunctionData('balanceOf', [userAddress]) })
    listCalls.push({ target: tpLegacy.address, callData: tpLegacy.interface.encodeFunctionData('allowance', [userAddress, tokenMigrator.address]) })
    returnTypes.push('uint256') // 8
    returnTypes.push('uint256') // 9
  }

  const [blockHeight, returnDataArray] = await multicall.tryBlockAndAggregate(false, listCalls)

  const listReturnData = returnDataArray.map((callResult, index) => {
    if (callResult.success) {
      return ethers.utils.defaultAbiCoder.decode([returnTypes[index]], callResult.returnData)[0]
    } else {
      // Handle failed call, e.g., return null or throw an error
      return null
    }
  })

  const userBalanceObj = {}
  userBalanceObj.blockHeight = blockHeight
  userBalanceObj.mocBalance = listReturnData[0]
  userBalanceObj.mocAllowance = listReturnData[1]
  userBalanceObj.docBalance = listReturnData[2]
  userBalanceObj.bproBalance = listReturnData[3]
  userBalanceObj.rbtcBalance = listReturnData[4]
  userBalanceObj.docToRedeem = listReturnData[5]
  userBalanceObj.bprox2Balance = listReturnData[6]
  userBalanceObj.spendableBalance = listReturnData[4]
  userBalanceObj.reserveAllowance = listReturnData[7]

  if (dContracts.contracts.tp_legacy) {
    userBalanceObj.tpLegacyBalance = listReturnData[8]
    userBalanceObj.tpLegacyAllowance = listReturnData[9]
  }

  userBalanceObj.potentialBprox2MaxInterest = '0'
  userBalanceObj.bProHoldIncentive = '0'
  userBalanceObj.estimateGasMintBpro = '2000000'
  userBalanceObj.estimateGasMintDoc = '2000000'
  userBalanceObj.estimateGasMintBprox2 = '2000000'
  userBalanceObj.userAddress = userAddress

  // Calculate potentialBprox2MaxInterest
  const calcMintInterest = await mocinrate.calcMintInterestValues(BUCKET_X2, userBalanceObj.rbtcBalance)
  userBalanceObj.potentialBprox2MaxInterest = calcMintInterest.toString()

  return userBalanceObj
}

// Calculate Commission Function
const calcCommission = async (dContracts, dataContractStatus, reserveAmount, token, action) => {
  const vendorAddress = `${process.env.VENDOR_ADDRESS}`.toLowerCase()

  const multicall = dContracts.contracts.multicall
  const mocinrate = dContracts.contracts.mocinrate

  let mocType
  let reserveType
  switch (token) {
    case 'DOC':
      if (action === 'MINT') {
        reserveType = dataContractStatus.commissionRatesTypes.MINT_DOC_FEES_RBTC
        mocType = dataContractStatus.commissionRatesTypes.MINT_DOC_FEES_MOC
      } else {
        reserveType = dataContractStatus.commissionRatesTypes.REDEEM_DOC_FEES_RBTC
        mocType = dataContractStatus.commissionRatesTypes.REDEEM_DOC_FEES_MOC
      }
      break
    case 'BPRO':
      if (action === 'MINT') {
        reserveType = dataContractStatus.commissionRatesTypes.MINT_BPRO_FEES_RBTC
        mocType = dataContractStatus.commissionRatesTypes.MINT_BPRO_FEES_MOC
      } else {
        reserveType = dataContractStatus.commissionRatesTypes.REDEEM_BPRO_FEES_RBTC
        mocType = dataContractStatus.commissionRatesTypes.REDEEM_BPRO_FEES_MOC
      }
      break
    case 'BTCX':
      if (action === 'MINT') {
        reserveType = dataContractStatus.commissionRatesTypes.MINT_BTCX_FEES_RBTC
        mocType = dataContractStatus.commissionRatesTypes.MINT_BTCX_FEES_MOC
      } else {
        reserveType = dataContractStatus.commissionRatesTypes.REDEEM_BTCX_FEES_RBTC
        mocType = dataContractStatus.commissionRatesTypes.REDEEM_BTCX_FEES_MOC
      }
      break
    case 'STABLE':
      if (action === 'MINT') {
        reserveType = dataContractStatus.commissionRatesTypes.MINT_STABLETOKEN_FEES_RESERVE
        mocType = dataContractStatus.commissionRatesTypes.MINT_STABLETOKEN_FEES_MOC
      } else {
        reserveType = dataContractStatus.commissionRatesTypes.REDEEM_STABLETOKEN_FEES_RESERVE
        mocType = dataContractStatus.commissionRatesTypes.REDEEM_STABLETOKEN_FEES_MOC
      }
      break
    case 'RISKPRO':
      if (action === 'MINT') {
        reserveType = dataContractStatus.commissionRatesTypes.MINT_RISKPRO_FEES_RESERVE
        mocType = dataContractStatus.commissionRatesTypes.MINT_RISKPRO_FEES_MOC
      } else {
        reserveType = dataContractStatus.commissionRatesTypes.REDEEM_RISKPRO_FEES_RESERVE
        mocType = dataContractStatus.commissionRatesTypes.REDEEM_RISKPRO_FEES_MOC
      }
      break
    case 'RISKPROX':
      if (action === 'MINT') {
        reserveType = dataContractStatus.commissionRatesTypes.MINT_RISKPROX_FEES_RESERVE
        mocType = dataContractStatus.commissionRatesTypes.MINT_RISKPROX_FEES_MOC
      } else {
        reserveType = dataContractStatus.commissionRatesTypes.REDEEM_RISKPROX_FEES_RESERVE
        mocType = dataContractStatus.commissionRatesTypes.REDEEM_RISKPROX_FEES_MOC
      }
      break
    default:
      throw new Error(`Unsupported token type: ${token}`)
  }

  // Prepare Multicall for Commission Calculation
  const listCalls = [
    { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('calcCommissionValue', [toContractPrecision(reserveAmount), reserveType]) },
    { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('calcCommissionValue', [toContractPrecision(reserveAmount), mocType]) },
    { target: mocinrate.address, callData: mocinrate.interface.encodeFunctionData('calculateVendorMarkup', [vendorAddress, toContractPrecision(reserveAmount)]) }
  ]

  const returnTypes = [
    'uint256', // commission_reserve
    'uint256', // commission_moc
    'uint256' // vendorMarkup
  ]

  const [blockHeight, returnDataArray] = await multicall.tryBlockAndAggregate(false, listCalls)
  console.log('🚀 ~ calcCommission ~ blockHeight:', blockHeight)

  const listReturnData = returnDataArray.map((callResult, index) => {
    if (callResult.success) {
      return ethers.utils.defaultAbiCoder.decode([returnTypes[index]], callResult.returnData)[0]
    } else {
      // Handle failed call, e.g., return null or throw an error
      return null
    }
  })

  const commission = {}
  commission.commission_reserve = listReturnData[0]
  commission.commission_moc = listReturnData[1]
  commission.vendorMarkup = listReturnData[2]

  return commission
}

export {
  contractStatus,
  connectorAddresses,
  userBalance,
  calcCommission
}
