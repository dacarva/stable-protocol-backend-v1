import { BigNumber } from 'bignumber.js'
import { ethers } from 'ethers'

import { toContractPrecision, BUCKET_X2 } from '../utils.js'
import { sendTransaction } from '../transaction.js'
import { addCommissions, calcMintInterest } from './moc-base.js'
import { statusFromContracts, userBalanceFromContracts } from './contracts.js'

const mintTP = async (provider, dContracts, configProject, tpAmount) => {
  // Mint Pegged token with collateral coin base

  const userAddress = `${process.env.USER_ADDRESS}`.toLowerCase()
  const vendorAddress = `${process.env.VENDOR_ADDRESS}`.toLowerCase()
  const mintSlippage = `${process.env.MINT_SLIPPAGE}`

  // Ensure is in correct app mode
  if (configProject.appMode !== 'MoC') throw new Error('This function is only for app mode = MoC')

  // Get information from contracts
  const dataContractStatus = await statusFromContracts(provider, dContracts, configProject)

  // Get user balance address
  const userBalanceStats = await userBalanceFromContracts(provider, dContracts, configProject, userAddress)

  // get reserve price from contract
  const reservePrice = new BigNumber(ethers.utils.formatEther(dataContractStatus.bitcoinPrice))

  // Pegged amount in reserve
  const reserveAmount = new BigNumber(tpAmount).div(reservePrice) // para 100 USD , reserveAmount = 0.0001 RBTC

  let valueToSend = await addCommissions(provider, dContracts, configProject, dataContractStatus, userBalanceStats, reserveAmount, 'DOC', 'MINT')

  // valueToSend = 0.00011

  // Add Slippage plus %
  const mintSlippageAmount = new BigNumber(mintSlippage).div(100).times(reserveAmount)

  // slippage amount 1% = 0.00000001

  valueToSend = new BigNumber(valueToSend).plus(mintSlippageAmount)

  // valueTosend = 0.000111

  console.log(`Mint Slippage using ${mintSlippage} %. Slippage amount: ${mintSlippageAmount.toString()} Total to send: ${valueToSend.toString()}`)

  // Verifications

  // User have sufficient reserve to pay?
  console.log(`To mint ${tpAmount} ${configProject.tokens.TP.name} you need > ${valueToSend.toString()} ${configProject.tokens.RESERVE.name} in your balance`)
  const userReserveBalance = new BigNumber(ethers.utils.formatEther(userBalanceStats.rbtcBalance))
  if (valueToSend.gt(userReserveBalance)) throw new Error(`Insufficient ${configProject.tokens.RESERVE.name} balance`)

  // There are sufficient PEGGED in the contracts to mint?
  const tpAvailableToMint = new BigNumber(ethers.utils.formatEther(dataContractStatus.docAvailableToMint))
  if (new BigNumber(tpAmount).gt(tpAvailableToMint)) throw new Error(`Insufficient ${configProject.tokens.TP.name} available to mint`)

  const moc = dContracts.contracts.moc

  // Calculate estimate gas cost
  const estimateGas = await moc.estimateGas.mintDocVendors(toContractPrecision(reserveAmount), vendorAddress, {
    value: toContractPrecision(valueToSend)
  })

  // encode function
  const encodedCall = moc.interface.encodeFunctionData('mintDocVendors', [toContractPrecision(reserveAmount), vendorAddress]) // 0.0001 RBTC, 0xTropykus

  // send transaction to the blockchain and get receipt
  const { receipt, filteredEvents } = await sendTransaction(provider, valueToSend, estimateGas, encodedCall, moc.address) 

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

const redeemTP = async (provider, dContracts, configProject, tpAmount) => {
  // Redeem pegged token receiving coin base

  const userAddress = `${process.env.USER_ADDRESS}`.toLowerCase()
  const vendorAddress = `${process.env.VENDOR_ADDRESS}`.toLowerCase()

  // Ensure is in correct app mode
  if (configProject.appMode !== 'MoC') throw new Error('This function is only for app mode = MoC')

  // Get information from contracts
  const dataContractStatus = await statusFromContracts(provider, dContracts, configProject)

  // Get user balance address
  const userBalanceStats = await userBalanceFromContracts(provider, dContracts, configProject, userAddress)

  // get Reserve price from contract
  const reservePrice = new BigNumber(ethers.utils.formatEther(dataContractStatus.bitcoinPrice))

  // Pegged amount in reserve
  const reserveAmount = new BigNumber(tpAmount).div(reservePrice)

  // Redeem function... no values sent
  const valueToSend = null

  // Verifications

  // User have sufficient PEGGED in balance?
  console.log(`Redeeming ${tpAmount} ${configProject.tokens.TP.name} ... getting approx: ${reserveAmount} ${configProject.tokens.RESERVE.name}... `)
  const userTPBalance = new BigNumber(ethers.utils.formatEther(userBalanceStats.docBalance))
  if (new BigNumber(tpAmount).gt(userTPBalance)) throw new Error(`Insufficient ${configProject.tokens.TP.name} user balance`)

  // There are sufficient Free Pegged in the contracts to redeem?
  const tpAvailableToRedeem = new BigNumber(ethers.utils.formatEther(dataContractStatus.docAvailableToRedeem))
  if (new BigNumber(tpAmount).gt(tpAvailableToRedeem)) throw new Error(`Insufficient ${configProject.tokens.RESERVE.name} available to redeem in contract`)

  const moc = dContracts.contracts.moc

  // Calculate estimate gas cost
  const estimateGas = await moc.estimateGas.redeemFreeDocVendors(toContractPrecision(new BigNumber(tpAmount)), vendorAddress)

  // encode function
  const encodedCall = moc.interface.encodeFunctionData('redeemFreeDocVendors', [toContractPrecision(new BigNumber(tpAmount)), vendorAddress])

  // send transaction to the blockchain and get receipt
  const { receipt, filteredEvents } = await sendTransaction(provider, valueToSend, estimateGas, encodedCall, moc.address)

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

const mintTC = async (provider, dContracts, configProject, tcAmount) => {
  // Mint Collateral Token with collateral coin base

  const userAddress = `${process.env.USER_ADDRESS}`.toLowerCase()
  const vendorAddress = `${process.env.VENDOR_ADDRESS}`.toLowerCase()
  const mintSlippage = `${process.env.MINT_SLIPPAGE}`

  // Ensure is in correct app mode
  if (configProject.appMode !== 'MoC') throw new Error('This function is only for app mode = MoC')

  // Get information from contracts
  const dataContractStatus = await statusFromContracts(provider, dContracts, configProject)

  // Get user balance address
  const userBalanceStats = await userBalanceFromContracts(provider, dContracts, configProject, userAddress)

  // Price of TC in RESERVE
  const tcPriceInReserve = new BigNumber(ethers.utils.formatEther(dataContractStatus.bproPriceInRbtc))

  // TC amount in reserve
  const reserveAmount = new BigNumber(tcAmount).times(tcPriceInReserve)

  let valueToSend = await addCommissions(provider, dContracts, configProject, dataContractStatus, userBalanceStats, reserveAmount, 'BPRO', 'MINT')

  // Add Slippage plus %
  const mintSlippageAmount = new BigNumber(mintSlippage).div(100).times(reserveAmount)

  valueToSend = new BigNumber(valueToSend).plus(mintSlippageAmount)

  console.log(`Mint Slippage using ${mintSlippage} %. Slippage amount: ${mintSlippageAmount.toString()} Total to send: ${valueToSend.toString()}`)

  // Verifications

  // User have sufficient reserve to pay?
  console.log(`To mint ${tcAmount} ${configProject.tokens.TC.name} you need > ${valueToSend.toString()} ${configProject.tokens.RESERVE.name} in your balance`)
  const userReserveBalance = new BigNumber(ethers.utils.formatEther(userBalanceStats.rbtcBalance))
  if (valueToSend.gt(userReserveBalance)) throw new Error(`Insufficient ${configProject.tokens.RESERVE.name} balance`)

  const moc = dContracts.contracts.moc

  // Calculate estimate gas cost
  const estimateGas = await moc.estimateGas.mintBProVendors(toContractPrecision(reserveAmount), vendorAddress, {
    value: toContractPrecision(valueToSend)
  })

  // encode function
  const encodedCall = moc.interface.encodeFunctionData('mintBProVendors', [toContractPrecision(reserveAmount), vendorAddress])

  // send transaction to the blockchain and get receipt
  const { receipt, filteredEvents } = await sendTransaction(provider, valueToSend, estimateGas, encodedCall, moc.address)

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

const redeemTC = async (provider, dContracts, configProject, tcAmount) => {
  // Redeem Collateral token receiving coin base

  const userAddress = `${process.env.USER_ADDRESS}`.toLowerCase()
  const vendorAddress = `${process.env.VENDOR_ADDRESS}`.toLowerCase()

  // Ensure is in correct app mode
  if (configProject.appMode !== 'MoC') throw new Error('This function is only for MoC Mode... are you using in your environment RIF projects?')

  // Get information from contracts
  const dataContractStatus = await statusFromContracts(provider, dContracts, configProject)

  // Get user balance address
  const userBalanceStats = await userBalanceFromContracts(provider, dContracts, configProject, userAddress)

  // Price of TC in RESERVE
  const tcPriceInReserve = new BigNumber(ethers.utils.formatEther(dataContractStatus.bproPriceInRbtc))

  // TC amount in reserve
  const reserveAmount = new BigNumber(tcAmount).times(tcPriceInReserve)

  // Redeem function... no values sent
  const valueToSend = null

  // Verifications

  // User have sufficient TC in balance?
  console.log(`Redeeming ${tcAmount} ${configProject.tokens.TC.name} ... getting approx: ${reserveAmount} ${configProject.tokens.RESERVE.name}... `)
  const userTCBalance = new BigNumber(ethers.utils.formatEther(userBalanceStats.bproBalance))
  if (new BigNumber(tcAmount).gt(userTCBalance)) throw new Error(`Insufficient ${configProject.tokens.TC.name} user balance`)

  // There are sufficient TC in the contracts to redeem?
  const tcAvailableToRedeem = new BigNumber(ethers.utils.formatEther(dataContractStatus.bproAvailableToRedeem))
  if (new BigNumber(tcAmount).gt(tcAvailableToRedeem)) throw new Error(`Insufficient ${configProject.tokens.TC.name} available to redeem in contract`)

  const moc = dContracts.contracts.moc

  // Calculate estimate gas cost
  const estimateGas = await moc.estimateGas.redeemBProVendors(toContractPrecision(new BigNumber(tcAmount)), vendorAddress)

  // encode function
  const encodedCall = moc.interface.encodeFunctionData('redeemBProVendors', [toContractPrecision(new BigNumber(tcAmount)), vendorAddress])

  // send transaction to the blockchain and get receipt
  const { receipt, filteredEvents } = await sendTransaction(provider, valueToSend, estimateGas, encodedCall, moc.address)

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

const mintTX = async (provider, dContracts, configProject, txAmount) => {
  // Mint Token X with collateral coin base

  const userAddress = `${process.env.USER_ADDRESS}`.toLowerCase()
  const vendorAddress = `${process.env.VENDOR_ADDRESS}`.toLowerCase()
  const mintSlippage = `${process.env.MINT_SLIPPAGE}`

  // Ensure is in correct app mode
  if (configProject.appMode !== 'MoC') throw new Error('This function is only for app mode = MoC')

  // Get information from contracts
  const dataContractStatus = await statusFromContracts(provider, dContracts, configProject)

  // Get user balance address
  const userBalanceStats = await userBalanceFromContracts(provider, dContracts, configProject, userAddress)

  // Price of TX in coinbase
  const txPriceInReserve = new BigNumber(ethers.utils.formatEther(dataContractStatus.bprox2PriceInRbtc))

  // TX amount in reserve
  const reserveAmount = new BigNumber(txAmount).times(txPriceInReserve)

  let valueToSend = await addCommissions(provider, dContracts, configProject, dataContractStatus, userBalanceStats, reserveAmount, 'BTCX', 'MINT')

  // Calc Interest to mint TX
  const mintInterest = await calcMintInterest(dContracts, reserveAmount)

  valueToSend = new BigNumber(valueToSend).plus(new BigNumber(ethers.utils.formatEther(mintInterest)))

  console.log(`Mint TX Interest ${mintInterest}`)

  // Add Slippage plus %
  const mintSlippageAmount = new BigNumber(mintSlippage).div(100).times(reserveAmount)

  valueToSend = new BigNumber(valueToSend).plus(mintSlippageAmount)

  console.log(`Mint Slippage using ${mintSlippage} %. Slippage amount: ${mintSlippageAmount.toString()} Total to send: ${valueToSend.toString()}`)

  // Verifications

  // User have sufficient reserve to pay?
  console.log(`To mint ${txAmount} ${configProject.tokens.TX.name} you need > ${valueToSend.toString()} ${configProject.tokens.RESERVE.name} in your balance`)
  const userReserveBalance = new BigNumber(ethers.utils.formatEther(userBalanceStats.rbtcBalance))
  if (valueToSend.gt(userReserveBalance)) throw new Error(`Insufficient ${configProject.tokens.RESERVE.name} balance`)

  // There are sufficient TX in the contracts to mint?
  const txAvailableToMint = new BigNumber(ethers.utils.formatEther(dataContractStatus.bprox2AvailableToMint))
  if (new BigNumber(txAmount).gt(txAvailableToMint)) throw new Error(`Insufficient ${configProject.tokens.TX.name} available to mint`)

  const moc = dContracts.contracts.moc

  // Calculate estimate gas cost
  const estimateGas = await moc.estimateGas.mintBProxVendors(BUCKET_X2, toContractPrecision(reserveAmount), vendorAddress, {
    value: toContractPrecision(valueToSend)
  })

  // encode function
  const encodedCall = moc.interface.encodeFunctionData('mintBProxVendors', [BUCKET_X2, toContractPrecision(reserveAmount), vendorAddress])

  // send transaction to the blockchain and get receipt
  const { receipt, filteredEvents } = await sendTransaction(provider, valueToSend, estimateGas, encodedCall, moc.address)

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

const redeemTX = async (provider, dContracts, configProject, txAmount) => {
  // Redeem token X receiving coin base

  const userAddress = `${process.env.USER_ADDRESS}`.toLowerCase()
  const vendorAddress = `${process.env.VENDOR_ADDRESS}`.toLowerCase()

  // Ensure is in correct app mode
  if (configProject.appMode !== 'MoC') throw new Error('This function is only for app mode = MoC')

  // Get information from contracts
  const dataContractStatus = await statusFromContracts(provider, dContracts, configProject)

  // Get user balance address
  const userBalanceStats = await userBalanceFromContracts(provider, dContracts, configProject, userAddress)

  // Price of TX in RESERVE
  const txPriceInReserve = new BigNumber(ethers.utils.formatEther(dataContractStatus.bprox2PriceInRbtc))

  // TX amount in reserve RESERVE
  const reserveAmount = new BigNumber(txAmount).times(txPriceInReserve)

  // Redeem function... no values sent
  const valueToSend = null

  // Verifications

  // User have sufficient TX in balance?
  console.log(`Redeeming ${txAmount} ${configProject.tokens.TX.name} ... getting approx: ${reserveAmount} ${configProject.tokens.RESERVE.name}... `)
  const userTXBalance = new BigNumber(ethers.utils.formatEther(userBalanceStats.bprox2Balance))
  if (new BigNumber(txAmount).gt(userTXBalance)) throw new Error(`Insufficient ${configProject.tokens.TX.name} user balance`)

  const moc = dContracts.contracts.moc

  // Calculate estimate gas cost
  const estimateGas = await moc.estimateGas.redeemBProxVendors(BUCKET_X2, toContractPrecision(new BigNumber(txAmount)), vendorAddress)

  // encode function
  const encodedCall = moc.interface.encodeFunctionData('redeemBProxVendors', [BUCKET_X2, toContractPrecision(new BigNumber(txAmount)), vendorAddress])

  // send transaction to the blockchain and get receipt
  const { receipt, filteredEvents } = await sendTransaction(provider, valueToSend, estimateGas, encodedCall, moc.address)

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

export {
  mintTP,
  redeemTP,
  mintTC,
  redeemTC,
  mintTX,
  redeemTX
}
