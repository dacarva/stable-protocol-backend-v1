// Redeem Token X

import * as dotenv from 'dotenv'

import { readJsonFile, getWeb3 } from '../../src/utils.js'
import { readContracts } from '../../src/moc-v0/contracts.js'
import { redeemTX } from '../../src/moc-v0/moc-coinbase.js'
import { redeemTXRRC20 } from '../../src/moc-v0/moc-rrc20.js'

dotenv.config()

const main = async () => {
  const configPath = './settings/projects.json'
  const configProject = readJsonFile(configPath).projects[process.env.MOC_PROJECT.toLowerCase()]

  // get web3 connection
  const web3 = getWeb3(process.env.HOST_URI)

  // Obtain all contracts from one address of the MoC.sol
  const dContracts = await readContracts(web3, configProject)

  // Get amount from environment
  const amountTX = `${process.env.OPERATION_AMOUNT_REDEEM_TX}`

  if (configProject.appMode === 'MoC') {
    // Collateral Coinbase
    const { receipt, filteredEvents } = await redeemTX(web3, dContracts, configProject, amountTX)
  } else {
    // Collateral RRC20
    const { receipt, filteredEvents } = await redeemTXRRC20(web3, dContracts, configProject, amountTX)
  }
}

main()
