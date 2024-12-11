import { ethers } from 'ethers'
import abiDecoder from 'abi-decoder'

import { toContractPrecision } from './utils.js'

const addABI = (dContracts, appMode) => {
  // Abi decoder
  abiDecoder.addABI(dContracts.json.MoC.abi)
  abiDecoder.addABI(dContracts.json.MoCState.abi)
  abiDecoder.addABI(dContracts.json.MoCExchange.abi)
  abiDecoder.addABI(dContracts.json.MoCInrate.abi)
  abiDecoder.addABI(dContracts.json.MoCSettlement.abi)
  abiDecoder.addABI(dContracts.json.TP.abi)
  abiDecoder.addABI(dContracts.json.TC.abi)
  abiDecoder.addABI(dContracts.json.TG.abi)
  abiDecoder.addABI(dContracts.json.MoCVendors.abi)
  if (appMode === 'RRC20') {
    abiDecoder.addABI(dContracts.json.ReserveToken.abi)
  }

  if (process.env.CONTRACT_TOKEN_MIGRATOR) abiDecoder.addABI(dContracts.json.TokenMigrator.abi)
}

const addABIOMoC = (dContracts) => {
  abiDecoder.addABI(dContracts.json.IRegistry.abi)
  abiDecoder.addABI(dContracts.json.IStakingMachine.abi)
  abiDecoder.addABI(dContracts.json.IDelayMachine.abi)
  abiDecoder.addABI(dContracts.json.ISupporters.abi)
  abiDecoder.addABI(dContracts.json.IVestingMachine.abi)
  abiDecoder.addABI(dContracts.json.IVotingMachine.abi)
}

const addABIv1 = (dContracts) => {
  // Abi decoder
  abiDecoder.addABI(dContracts.json.WrappedCollateralAsset.abi)
  abiDecoder.addABI(dContracts.json.TokenPegged.abi)
  abiDecoder.addABI(dContracts.json.CollateralTokenCABag.abi)
  abiDecoder.addABI(dContracts.json.MocCABag.abi)
  abiDecoder.addABI(dContracts.json.MocCAWrapper.abi)
}

const renderEventField = (eveName, eveValue) => {
  const formatItemsWei = new Set([
    'amount',
    'reserveTotal',
    'reservePrice',
    'mocCommissionValue',
    'mocPrice',
    'commission',
    'mocCommissionValue',
    'mocPrice',
    'btcMarkup',
    'mocMarkup',
    'interests',
    'leverage',
    'value',
    'paidMoC',
    'paidReserveToken',
    'paidRBTC',
    'staking',
    'qTC_',
    'qAsset_',
    'qACfee_',
    'qAC_',
    'oldTPema_',
    'newTPema_',
    'qTP_',
    'TokenMigrated'
  ])

  if (formatItemsWei.has(eveName)) { eveValue = ethers.utils.formatEther(eveValue) }

  console.log('\x1b[32m%s\x1b[0m', `${eveName}: ${eveValue}`)
}

const renderEvent = (evente) => {
  console.log('')
  console.log('\x1b[35m%s\x1b[0m', `Event: ${evente.name}`)
  console.log('')
  evente.events.forEach(eve => renderEventField(eve.name, eve.value))
}

const decodeEvents = (receipt) => {
  const decodedLogs = abiDecoder.decodeLogs(receipt.logs)

  const filterIncludes = [
    'StableTokenMint',
    'StableTokenRedeem',
    'FreeStableTokenRedeem',
    'RiskProWithDiscountMint',
    'RiskProMint',
    'RiskProRedeem',
    'RiskProxMint',
    'RiskProxRedeem',
    'Transfer',
    'Approval',
    'VendorReceivedMarkup',
    'VendorStakeAdded',
    'VendorStakeRemoved',
    'TCMinted',
    'TCRedeemed',
    'TPMinted',
    'TPRedeemed',
    'TPSwappedForTP',
    'TPSwappedForTC',
    'TCSwappedForTP',
    'TCandTPRedeemed',
    'TCandTPMinted',
    'PeggedTokenChange',
    'SuccessFeeDistributed',
    'TPemaUpdated',
    'TCMintedWithWrapper',
    'TCRedeemedWithWrapper',
    'TPMintedWithWrapper',
    'TPRedeemedWithWrapper',
    'TCandTPMintedWithWrapper',
    'TCandTPRedeemedWithWrapper',
    'TPSwappedForTPWithWrapper',
    'TPSwappedForTCWithWrapper',
    'TCSwappedForTPWithWrapper'
  ]

  const filteredEvents = decodedLogs.filter(event =>
    filterIncludes.includes(event.name)
  )

  filteredEvents.forEach(evente => renderEvent(evente))

  return filteredEvents
}

const sendTransaction = async (provider, value, estimateGas, encodedCall, toContract) => {
  const userAddress = `${process.env.USER_ADDRESS}`.toLowerCase()
  const privateKey = process.env.USER_PK
  const gasMultiplier = process.env.GAS_MULTIPLIER

  console.log('Please wait... sending transaction... Wait until blockchain mine transaction!')

  const signer = new ethers.Wallet(privateKey, provider)

  let valueToSend = '0x'
  if (value) {
    valueToSend = toContractPrecision(value)
  }

  const gasPrice = await provider.getGasPrice()

  const tx = {
    from: userAddress,
    to: toContract,
    value: valueToSend,
    gasLimit: Math.floor(estimateGas * gasMultiplier),
    gasPrice: gasPrice,
    data: encodedCall
  }

  const signedTx = await signer.sendTransaction(tx)
  const receipt = await signedTx.wait()

  const filteredEvents = decodeEvents(receipt)

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

export {
  sendTransaction,
  addABI,
  addABIOMoC,
  addABIv1
}
