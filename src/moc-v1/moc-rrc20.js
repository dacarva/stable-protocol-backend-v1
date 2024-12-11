import { ethers } from 'ethers'
import BigNumber from 'bignumber.js'

import { toContractPrecision, BUCKET_X2 } from '../utils.js'
import { addCommissions, calcMintInterest } from './moc-base.js'
import { statusFromContracts, userBalanceFromContracts } from './contracts.js'

// Updated sendTransaction function for Ethers.js
const sendTransaction = async (contractMethod, overrides = {}) => {
  try {
    const txResponse = await contractMethod(overrides)
    console.log(`Transaction submitted: ${txResponse.hash}`)
    const receipt = await txResponse.wait()
    console.log(`Transaction confirmed: ${receipt.transactionHash}`)

    // Extract filtered events if necessary
    const filteredEvents = receipt.events?.filter(event => event.event) || []

    return { receipt, filteredEvents }
  } catch (error) {
    console.error('Transaction failed:', error)
    throw error
  }
}

// AllowanceUseReserveToken Function
const AllowanceUseReserveToken = async (dContracts, allow, configProject) => {
  // Ensure correct app mode
  if (configProject.appMode !== 'RRC20') throw new Error('This function is only for app mode = RRC20')

  const userAddress = process.env.USER_ADDRESS.toLowerCase()
  const reservetoken = dContracts.contracts.reservetoken
  const mocAddress = dContracts.contracts.moc.address

  let amountAllowance = ethers.constants.Zero
  if (allow) {
    amountAllowance = ethers.constants.MaxUint256
  }

  // Approve transaction
  const approveTx = reservetoken.approve(mocAddress, amountAllowance)

  // Send transaction and get receipt
  const { receipt, filteredEvents } = await sendTransaction(approveTx, {
    from: userAddress,
    gasLimit: 100000 // You can adjust the gas limit as needed
  })

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

// mintTPRRC20 Function
const mintTPRRC20 = async (dContracts, configProject, tpAmount) => {
  // Mint pegged token with collateral RRC20

  const userAddress = process.env.USER_ADDRESS.toLowerCase()
  const vendorAddress = process.env.VENDOR_ADDRESS.toLowerCase()
  const mintSlippage = new BigNumber(process.env.MINT_SLIPPAGE)

  // Ensure correct app mode
  if (configProject.appMode !== 'RRC20') throw new Error('This function is only for app mode = RRC20')

  // Get information from contracts
  const dataContractStatus = await statusFromContracts(dContracts, configProject)

  // Get user balance address
  const userBalanceStats = await userBalanceFromContracts(dContracts, configProject, userAddress)

  // Get reserve price from contract
  const reservePrice = new BigNumber(ethers.utils.formatEther(dataContractStatus.bitcoinPrice))

  // Pegged amount in reserve
  const reserveAmount = new BigNumber(tpAmount).div(reservePrice)

  // Add commissions
  let valueToSend = await addCommissions(dContracts, configProject, dataContractStatus, userBalanceStats, reserveAmount, 'STABLE', 'MINT')

  // Add Slippage plus %
  const mintSlippageAmount = mintSlippage.div(100).times(reserveAmount)
  valueToSend = new BigNumber(valueToSend).plus(mintSlippageAmount)

  console.log(`Mint Slippage using ${mintSlippage}%. Slippage amount: ${mintSlippageAmount.toString()} Total to send: ${valueToSend.toString()}`)

  // Verifications

  // User has sufficient reserve to pay
  console.log(`To mint ${tpAmount} ${configProject.tokens.TP.name} you need > ${valueToSend.toString()} ${configProject.tokens.RESERVE.name} in your balance`)
  const userReserveBalance = new BigNumber(ethers.utils.formatEther(userBalanceStats.rbtcBalance))
  if (valueToSend.gt(userReserveBalance)) throw new Error(`Insufficient ${configProject.tokens.RESERVE.name} balance`)

  // Allowance
  console.log(`Allowance: To mint ${tpAmount} ${configProject.tokens.TP.name} you need > ${valueToSend.toString()} ${configProject.tokens.RESERVE.name} in your spendable balance`)
  const userSpendableBalance = new BigNumber(ethers.utils.formatEther(userBalanceStats.reserveAllowance))
  if (valueToSend.gt(userSpendableBalance)) throw new Error('Insufficient spendable balance... please make an allowance to the MoC contract')

  // Sufficient PEGGED in the contracts to mint
  const tpAvailableToMint = new BigNumber(ethers.utils.formatEther(dataContractStatus.docAvailableToMint))
  if (new BigNumber(tpAmount).gt(tpAvailableToMint)) throw new Error(`Insufficient ${configProject.tokens.TP.name} available to mint`)

  // Mint PEGGED RRC20 function... no values sent
  const moc = dContracts.contracts.moc

  // Mint transaction
  const mintTx = moc.mintStableTokenVendors(toContractPrecision(reserveAmount), vendorAddress)

  // Send transaction and get receipt
  const { receipt, filteredEvents } = await sendTransaction(mintTx, {
    from: userAddress,
    gasLimit: 2000000 // Adjust as needed
  })

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

// redeemTPRRC20 Function
const redeemTPRRC20 = async (dContracts, configProject, tpAmount) => {
  // Redeem pegged token receiving coin base

  const userAddress = process.env.USER_ADDRESS.toLowerCase()
  const vendorAddress = process.env.VENDOR_ADDRESS.toLowerCase()

  // Ensure correct app mode
  if (configProject.appMode !== 'RRC20') throw new Error('This function is only for app mode = RRC20')

  // Get information from contracts
  const dataContractStatus = await statusFromContracts(dContracts, configProject)

  // Get user balance address
  const userBalanceStats = await userBalanceFromContracts(dContracts, configProject, userAddress)

  // Get reserve price from contract
  const reservePrice = new BigNumber(ethers.utils.formatEther(dataContractStatus.bitcoinPrice))

  // Pegged amount in reserve
  const reserveAmount = new BigNumber(tpAmount).div(reservePrice)

  // Verifications

  // User has sufficient PEGGED Token in balance
  console.log(`Redeeming ${tpAmount} ${configProject.tokens.TP.name} ... getting approx: ${reserveAmount} ${configProject.tokens.RESERVE.name}...`)
  const userTPBalance = new BigNumber(ethers.utils.formatEther(userBalanceStats.docBalance))
  if (new BigNumber(tpAmount).gt(userTPBalance)) throw new Error(`Insufficient ${configProject.tokens.TP.name} user balance`)

  // Sufficient Free Pegged Token in the contracts to redeem
  const tpAvailableToRedeem = new BigNumber(ethers.utils.formatEther(dataContractStatus.docAvailableToRedeem))
  if (new BigNumber(tpAmount).gt(tpAvailableToRedeem)) throw new Error(`Insufficient ${configProject.tokens.TP.name} available to redeem in contract`)

  const moc = dContracts.contracts.moc

  // Redeem transaction
  const redeemTx = moc.redeemFreeStableTokenVendors(toContractPrecision(tpAmount), vendorAddress)

  // Send transaction and get receipt
  const { receipt, filteredEvents } = await sendTransaction(redeemTx, {
    from: userAddress,
    gasLimit: 2000000 // Adjust as needed
  })

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

// mintTCRRC20 Function
const mintTCRRC20 = async (dContracts, configProject, tcAmount) => {
  // Mint Collateral token with collateral RRC20

  const userAddress = process.env.USER_ADDRESS.toLowerCase()
  const vendorAddress = process.env.VENDOR_ADDRESS.toLowerCase()
  const mintSlippage = new BigNumber(process.env.MINT_SLIPPAGE)

  // Ensure correct app mode
  if (configProject.appMode !== 'RRC20') throw new Error('This function is only for app mode = RRC20')

  // Get information from contracts
  const dataContractStatus = await statusFromContracts(dContracts, configProject)

  // Get user balance address
  const userBalanceStats = await userBalanceFromContracts(dContracts, configProject, userAddress)

  // Price of TC in RESERVE
  const tcPriceInReserve = new BigNumber(ethers.utils.formatEther(dataContractStatus.bproPriceInRbtc))

  // TC amount in reserve
  const reserveAmount = new BigNumber(tcAmount).times(tcPriceInReserve)

  // Add commissions
  let valueToSend = await addCommissions(dContracts, configProject, dataContractStatus, userBalanceStats, reserveAmount, 'RISKPRO', 'MINT')

  // Add Slippage plus %
  const mintSlippageAmount = mintSlippage.div(100).times(reserveAmount)
  valueToSend = new BigNumber(valueToSend).plus(mintSlippageAmount)

  console.log(`Mint Slippage using ${mintSlippage}%. Slippage amount: ${mintSlippageAmount.toString()} Total to send: ${valueToSend.toString()}`)

  // Verifications

  // User has sufficient reserve to pay
  console.log(`To mint ${tcAmount} ${configProject.tokens.TC.name} you need > ${valueToSend.toString()} ${configProject.tokens.RESERVE.name} in your balance`)
  const userReserveBalance = new BigNumber(ethers.utils.formatEther(userBalanceStats.rbtcBalance))
  if (valueToSend.gt(userReserveBalance)) throw new Error(`Insufficient ${configProject.tokens.RESERVE.name} balance`)

  // Allowance
  console.log(`Allowance: To mint ${tcAmount} ${configProject.tokens.TC.name} you need > ${valueToSend.toString()} ${configProject.tokens.RESERVE.name} in your spendable balance`)
  const userSpendableBalance = new BigNumber(ethers.utils.formatEther(userBalanceStats.reserveAllowance))
  if (valueToSend.gt(userSpendableBalance)) throw new Error('Insufficient spendable balance... please make an allowance to the MoC contract')

  // Mint function... no values sent
  const moc = dContracts.contracts.moc

  // Mint transaction
  const mintTx = moc.mintRiskProVendors(BUCKET_X2, toContractPrecision(reserveAmount), vendorAddress)

  // Send transaction and get receipt
  const { receipt, filteredEvents } = await sendTransaction(mintTx, {
    from: userAddress,
    gasLimit: 2000000 // Adjust as needed
  })

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

// redeemTCRRC20 Function
const redeemTCRRC20 = async (dContracts, configProject, tcAmount) => {
  // Redeem Collateral token receiving RRC20

  const userAddress = process.env.USER_ADDRESS.toLowerCase()
  const vendorAddress = process.env.VENDOR_ADDRESS.toLowerCase()

  // Ensure correct app mode
  if (configProject.appMode !== 'RRC20') throw new Error('This function is only for app mode = RRC20')

  // Get information from contracts
  const dataContractStatus = await statusFromContracts(dContracts, configProject)

  // Get user balance address
  const userBalanceStats = await userBalanceFromContracts(dContracts, configProject, userAddress)

  // Price of TC in RESERVE
  const tcPriceInReserve = new BigNumber(ethers.utils.formatEther(dataContractStatus.bproPriceInRbtc))

  // TC amount in reserve
  const reserveAmount = new BigNumber(tcAmount).times(tcPriceInReserve)

  // Verifications

  // User has sufficient TC in balance
  console.log(`Redeeming ${tcAmount} ${configProject.tokens.TC.name} ... getting approx: ${reserveAmount} ${configProject.tokens.RESERVE.name}...`)
  const userTCBalance = new BigNumber(ethers.utils.formatEther(userBalanceStats.bproBalance))
  if (new BigNumber(tcAmount).gt(userTCBalance)) throw new Error(`Insufficient ${configProject.tokens.TC.name} user balance`)

  // Sufficient TC in the contracts to redeem
  const tcAvailableToRedeem = new BigNumber(ethers.utils.formatEther(dataContractStatus.bproAvailableToRedeem))
  if (new BigNumber(tcAmount).gt(tcAvailableToRedeem)) throw new Error(`Insufficient ${configProject.tokens.TC.name} available to redeem in contract`)

  const moc = dContracts.contracts.moc

  // Redeem transaction
  const redeemTx = moc.redeemRiskProVendors(BUCKET_X2, toContractPrecision(new BigNumber(tcAmount)), vendorAddress)

  // Send transaction and get receipt
  const { receipt, filteredEvents } = await sendTransaction(redeemTx, {
    from: userAddress,
    gasLimit: 2000000 // Adjust as needed
  })

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

// mintTXRRC20 Function
const mintTXRRC20 = async (dContracts, configProject, txAmount) => {
  // Mint Token X token with collateral RRC20

  const userAddress = process.env.USER_ADDRESS.toLowerCase()
  const vendorAddress = process.env.VENDOR_ADDRESS.toLowerCase()
  const mintSlippage = new BigNumber(process.env.MINT_SLIPPAGE)

  // Ensure correct app mode
  if (configProject.appMode !== 'RRC20') throw new Error('This function is only for app mode = RRC20')

  // Get information from contracts
  const dataContractStatus = await statusFromContracts(dContracts, configProject)

  // Get user balance address
  const userBalanceStats = await userBalanceFromContracts(dContracts, configProject, userAddress)

  // Price of TX in coinbase
  const txPriceInReserve = new BigNumber(ethers.utils.formatEther(dataContractStatus.bprox2PriceInRbtc))

  // TX amount in reserve
  const reserveAmount = new BigNumber(txAmount).times(txPriceInReserve)

  // Add commissions
  let valueToSend = await addCommissions(dContracts, configProject, dataContractStatus, userBalanceStats, reserveAmount, 'RISKPROX', 'MINT')

  // Calculate Interest to mint TX
  const mintInterest = await calcMintInterest(dContracts, reserveAmount)

  valueToSend = new BigNumber(valueToSend).plus(new BigNumber(ethers.utils.formatEther(mintInterest)))

  console.log(`Mint TX Interest ${mintInterest}`)

  // Add Slippage plus %
  const mintSlippageAmount = mintSlippage.div(100).times(reserveAmount)
  valueToSend = new BigNumber(valueToSend).plus(mintSlippageAmount)

  console.log(`Mint Slippage using ${mintSlippage}%. Slippage amount: ${mintSlippageAmount.toString()} Total to send: ${valueToSend.toString()}`)

  // Verifications

  // User has sufficient reserve to pay
  console.log(`To mint ${txAmount} ${configProject.tokens.TX.name} you need > ${valueToSend.toString()} ${configProject.tokens.RESERVE.name} in your balance`)
  const userReserveBalance = new BigNumber(ethers.utils.formatEther(userBalanceStats.rbtcBalance))
  if (valueToSend.gt(userReserveBalance)) throw new Error(`Insufficient ${configProject.tokens.RESERVE.name} balance`)

  // Sufficient TX in the contracts to mint
  const txAvailableToMint = new BigNumber(ethers.utils.formatEther(dataContractStatus.bprox2AvailableToMint))
  if (new BigNumber(txAmount).gt(txAvailableToMint)) throw new Error(`Insufficient ${configProject.tokens.TX.name} available to mint`)

  // Mint transaction
  const moc = dContracts.contracts.moc
  const mintTx = moc.mintRiskProxVendors(BUCKET_X2, toContractPrecision(reserveAmount), vendorAddress)

  // Send transaction and get receipt
  const { receipt, filteredEvents } = await sendTransaction(mintTx, {
    from: userAddress,
    gasLimit: 2000000 // Adjust as needed
  })

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

// redeemTXRRC20 Function
const redeemTXRRC20 = async (dContracts, configProject, txAmount) => {
  // Redeem token X receiving RRC20

  const userAddress = process.env.USER_ADDRESS.toLowerCase()
  const vendorAddress = process.env.VENDOR_ADDRESS.toLowerCase()

  // Ensure correct app mode
  if (configProject.appMode !== 'RRC20') throw new Error('This function is only for app mode = RRC20')

  // Get information from contracts
  const dataContractStatus = await statusFromContracts(dContracts, configProject)

  // Get user balance address
  const userBalanceStats = await userBalanceFromContracts(dContracts, configProject, userAddress)

  // Price of TX in RESERVE
  const txPriceInReserve = new BigNumber(ethers.utils.formatEther(dataContractStatus.bprox2PriceInRbtc))

  // TX amount in reserve RESERVE
  const reserveAmount = new BigNumber(txAmount).times(txPriceInReserve)

  // Verifications

  // User has sufficient TX in balance
  console.log(`Redeeming ${txAmount} ${configProject.tokens.TX.name} ... getting approx: ${reserveAmount} ${configProject.tokens.RESERVE.name}...`)
  const userTXBalance = new BigNumber(ethers.utils.formatEther(userBalanceStats.bprox2Balance))
  if (new BigNumber(txAmount).gt(userTXBalance)) throw new Error(`Insufficient ${configProject.tokens.TX.name} user balance`)

  const moc = dContracts.contracts.moc

  // Redeem transaction
  const redeemTx = moc.redeemRiskProxVendors(BUCKET_X2, toContractPrecision(new BigNumber(txAmount)), vendorAddress)

  // Send transaction and get receipt
  const { receipt, filteredEvents } = await sendTransaction(redeemTx, {
    from: userAddress,
    gasLimit: 2000000 // Adjust as needed
  })

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

export {
  mintTPRRC20,
  redeemTPRRC20,
  mintTCRRC20,
  redeemTCRRC20,
  mintTXRRC20,
  redeemTXRRC20,
  AllowanceUseReserveToken
}
