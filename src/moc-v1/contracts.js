import { BigNumber } from 'bignumber.js'
import { ethers } from 'ethers'
import * as dotenv from 'dotenv'

import { readJsonFile } from '../utils.js'
import { addABI } from '../transaction.js'

import { contractStatus, connectorAddresses, userBalance } from './multicall.js'

dotenv.config()

BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_DOWN })

const readContracts = async (provider, configProject) => {
  const appProject = configProject.appProject
  const appMode = configProject.appMode

  const dContracts = {}
  dContracts.json = {}
  dContracts.contracts = {}
  dContracts.contractsAddresses = {}

  // Load contract JSONs
  const Multicall2 = readJsonFile(`./abis/${appProject}/Multicall2.json`)
  dContracts.json.Multicall2 = Multicall2
  const MoCConnector = readJsonFile(`./abis/${appProject}/MoCConnector.json`)
  dContracts.json.MoCConnector = MoCConnector
  const MoC = readJsonFile(`./abis/${appProject}/MoC.json`)
  dContracts.json.MoC = MoC
  const MoCState = readJsonFile(`./abis/${appProject}/MoCState.json`)
  dContracts.json.MoCState = MoCState
  const MoCExchange = readJsonFile(`./abis/${appProject}/MoCExchange.json`)
  dContracts.json.MoCExchange = MoCExchange
  const MoCInrate = readJsonFile(`./abis/${appProject}/MoCInrate.json`)
  dContracts.json.MoCInrate = MoCInrate
  const MoCSettlement = readJsonFile(`./abis/${appProject}/MoCSettlement.json`)
  dContracts.json.MoCSettlement = MoCSettlement
  const TP = readJsonFile(`./abis/${appProject}/DocToken.json`)
  dContracts.json.TP = TP
  const TC = readJsonFile(`./abis/${appProject}/BProToken.json`)
  dContracts.json.TC = TC
  const TG = readJsonFile(`./abis/${appProject}/MoCToken.json`)
  dContracts.json.TG = TG
  const ReserveToken = readJsonFile(`./abis/${appProject}/ReserveToken.json`)
  dContracts.json.ReserveToken = ReserveToken
  const MoCVendors = readJsonFile(`./abis/${appProject}/MoCVendors.json`)
  dContracts.json.MoCVendors = MoCVendors

  // Initialize contracts with ethers
  console.log('Reading Multicall2 Contract... address: ', process.env.CONTRACT_MULTICALL2)
  const multicall = new ethers.Contract(process.env.CONTRACT_MULTICALL2, Multicall2.abi, provider)
  dContracts.contracts.multicall = multicall

  console.log('Reading MoC Contract... address: ', process.env.CONTRACT_MOC)
  const moc = new ethers.Contract(process.env.CONTRACT_MOC, MoC.abi, provider)
  dContracts.contracts.moc = moc

  const connectorAddress = await moc.connector()

  console.log('Reading MoCConnector... address: ', connectorAddress)
  const mocconnector = new ethers.Contract(connectorAddress, MoCConnector.abi, provider)
  dContracts.contracts.mocconnector = mocconnector

  // Read contracts addresses from connector
  const [
    mocStateAddress,
    mocInrateAddress,
    mocExchangeAddress,
    mocSettlementAddress,
    tpAddress,
    tcAddress,
    reserveTokenAddress
  ] = await connectorAddresses(provider, dContracts, configProject)

  console.log('Reading MoC State Contract... address: ', mocStateAddress)
  const mocstate = new ethers.Contract(mocStateAddress, MoCState.abi, provider)
  dContracts.contracts.mocstate = mocstate

  console.log('Reading MoC Inrate Contract... address: ', mocInrateAddress)
  const mocinrate = new ethers.Contract(mocInrateAddress, MoCInrate.abi, provider)
  dContracts.contracts.mocinrate = mocinrate

  console.log('Reading MoC Exchange Contract... address: ', mocExchangeAddress)
  const mocexchange = new ethers.Contract(mocExchangeAddress, MoCExchange.abi, provider)
  dContracts.contracts.mocexchange = mocexchange

  console.log('Reading MoC Settlement Contract... address: ', mocSettlementAddress)
  const mocsettlement = new ethers.Contract(mocSettlementAddress, MoCSettlement.abi, provider)
  dContracts.contracts.mocsettlement = mocsettlement

  console.log(`Reading ${configProject.tokens.TP.name} Token Contract... address: `, tpAddress)
  const tp = new ethers.Contract(tpAddress, TP.abi, provider)
  dContracts.contracts.tp = tp

  console.log(`Reading ${configProject.tokens.TC.name} Token Contract... address: `, tcAddress)
  const tc = new ethers.Contract(tcAddress, TC.abi, provider)
  dContracts.contracts.tc = tc

  if (appMode === 'RRC20') {
    console.log(`Reading ${configProject.tokens.RESERVE.name} Token Contract... address: `, reserveTokenAddress)
    const reservetoken = new ethers.Contract(reserveTokenAddress, ReserveToken.abi, provider)
    dContracts.contracts.reservetoken = reservetoken
  }

  const tgAddress = await mocstate.getMoCToken()
  const mocVendorsAddress = await mocstate.getMoCVendors()

  // Read govern Token
  console.log(`Reading ${configProject.tokens.TG.name} Token Contract... address: `, tgAddress)
  const tg = new ethers.Contract(tgAddress, TG.abi, provider)
  dContracts.contracts.tg = tg

  console.log('Reading MoC Vendors Contract... address: ', mocVendorsAddress)
  const mocvendors = new ethers.Contract(mocVendorsAddress, MoCVendors.abi, provider)
  dContracts.contracts.mocvendors = mocvendors

  // Token migrator & Legacy token
  if (process.env.CONTRACT_LEGACY_TP) {
    const TokenMigrator = readJsonFile(`./abis/${appProject}/TokenMigrator.json`)
    dContracts.json.TokenMigrator = TokenMigrator

    const tpLegacy = new ethers.Contract(process.env.CONTRACT_LEGACY_TP, TP.abi, provider)
    dContracts.contracts.tp_legacy = tpLegacy

    if (!process.env.CONTRACT_TOKEN_MIGRATOR) console.log('Error: Please set token migrator address!')

    const tokenMigrator = new ethers.Contract(process.env.CONTRACT_TOKEN_MIGRATOR, TokenMigrator.abi, provider)
    dContracts.contracts.token_migrator = tokenMigrator
  }

  // Add to abi decoder
  addABI(dContracts, appMode)

  return dContracts
}

const renderContractStatus = (contracStatus, config) => {
  const render = `
${config.tokens.RESERVE.name} Price: ${ethers.utils.formatEther(contracStatus.bitcoinPrice)} USD
${config.tokens.RESERVE.name} EMA Price: ${ethers.utils.formatEther(contracStatus.bitcoinMovingAverage)} USD
${config.tokens.TG.name} Price: ${ethers.utils.formatEther(contracStatus.mocPrice)} USD
${config.tokens.TC.name} Available to redeem: ${ethers.utils.formatEther(contracStatus.bproAvailableToRedeem)} ${config.tokens.TC.name}
${config.tokens.TX.name} Available to mint: ${ethers.utils.formatEther(contracStatus.bprox2AvailableToMint)} ${config.tokens.TX.name}
${config.tokens.TP.name} Available to mint: ${ethers.utils.formatEther(contracStatus.docAvailableToMint)} ${config.tokens.TP.name}
${config.tokens.TP.name} Available to redeem: ${ethers.utils.formatEther(contracStatus.docAvailableToRedeem)} ${config.tokens.TP.name}
${config.tokens.TC.name} Leverage: ${ethers.utils.formatEther(contracStatus.b0Leverage)}
${config.tokens.TC.name} Target Coverage: ${ethers.utils.formatEther(contracStatus.b0Leverage)}
Total ${config.tokens.RESERVE.name} in contract: ${ethers.utils.formatEther(contracStatus.totalBTCAmount)} 
Total ${config.tokens.RESERVE.name} inrate Bag: ${ethers.utils.formatEther(contracStatus.b0BTCInrateBag)} 
Global Coverage: ${ethers.utils.formatEther(contracStatus.globalCoverage)} 
${config.tokens.TX.name} Coverage: ${ethers.utils.formatEther(contracStatus.x2Coverage)}
${config.tokens.TX.name} Leverage: ${ethers.utils.formatEther(contracStatus.x2Leverage)}
${config.tokens.TC.name} Price: ${ethers.utils.formatEther(contracStatus.bproPriceInUsd)} USD
${config.tokens.TX.name} Price: ${ethers.utils.formatEther(contracStatus.bprox2PriceInRbtc)} ${config.tokens.RESERVE.name}
Contract State: ${contracStatus.state} 
Contract Paused: ${contracStatus.paused} 
Contract Protected: ${contracStatus.protected} 
  `

  return render
}

const renderUserBalance = (userBalance, config) => {
  let render = `
User: ${userBalance.userAddress}
${config.tokens.RESERVE.name} Balance: ${ethers.utils.formatEther(userBalance.rbtcBalance)} ${config.tokens.RESERVE.name}
${config.tokens.TP.name} Balance: ${ethers.utils.formatEther(userBalance.docBalance)} ${config.tokens.TP.name}
${config.tokens.TC.name} Balance: ${ethers.utils.formatEther(userBalance.bproBalance)} ${config.tokens.TC.name}
${config.tokens.TX.name} Balance: ${ethers.utils.formatEther(userBalance.bprox2Balance)} ${config.tokens.TX.name}
${config.tokens.TG.name} Balance: ${ethers.utils.formatEther(userBalance.mocBalance)} ${config.tokens.TG.name}
${config.tokens.TG.name} Allowance: ${ethers.utils.formatEther(userBalance.mocAllowance)} ${config.tokens.TG.name}
${config.tokens.TP.name} queue to redeem: ${ethers.utils.formatEther(userBalance.docToRedeem)} ${config.tokens.TP.name}
  `

  // Token migrator
  if (process.env.CONTRACT_LEGACY_TP) {
    const tokenMigratorBalance = `
TP Legacy Balance: ${ethers.utils.formatEther(userBalance.tpLegacyBalance)} ${config.tokens.TP.name}
TP Legacy Allowance: ${ethers.utils.formatEther(userBalance.tpLegacyAllowance)} ${config.tokens.TP.name}
    `
    render += tokenMigratorBalance
  }

  return render
}

const statusFromContracts = async (provider, dContracts, configProject) => {
  const dataContractStatus = await contractStatus(provider, dContracts, configProject)

  console.log('\x1b[35m%s\x1b[0m', 'Contract Status')
  console.log()
  console.log('\x1b[32m%s\x1b[0m', renderContractStatus(dataContractStatus, configProject))

  return dataContractStatus
}

const userBalanceFromContracts = async (provider, dContracts, configProject, userAddress) => {
  const userBalanceStats = await userBalance(provider, dContracts, userAddress, configProject)
  console.log()
  console.log('\x1b[32m%s\x1b[0m', renderUserBalance(userBalanceStats, configProject))

  return userBalanceStats
}

export {
  connectorAddresses,
  contractStatus,
  userBalance,
  readContracts,
  renderUserBalance,
  renderContractStatus,
  statusFromContracts,
  userBalanceFromContracts
}
