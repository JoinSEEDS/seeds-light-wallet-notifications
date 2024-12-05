// The old code based on MONGO_DB

const MongoClient = require('mongodb').MongoClient
const { logger } = require('./Logger')
require('dotenv').config()
const fetch = require('node-fetch')

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
  symbol: "",
})

// exports.paymentReceivedNotification = functions.https.onRequest(async (req: any, res: any) => {


class TransactionWatcher {  

  constructor(handler) {
    this.handler = handler
  }

  async start() {
    try {
      await this._connectToDB()
      this._startStreamWatcher('action_traces', async payload => {
        //logger.info("transfer:  "+JSON.stringify(payload, null, 2))
        const { data } = payload.fullDocument.act
        // "data": {
        //   "from": "illumination",
        //   "to": "testingseeds",
        //   "quantity": "0.0001 SEEDS",
        //   "memo": ""
        // },

        const { CLOUD_API_KEY, CLOUD_URL } = process.env
        const symbol =  data.quantity.split(' ')[1]
        if (symbol != 'SEEDS') {
          return;
        }
        const floatAmount = parseFloat(data.quantity)
        var amount = formatter.format(floatAmount)
        amount = amount.substring(1) // remove the '$'

        const params = new URLSearchParams({ 
              receiverUserId: data.to,
              notificationTitle: "",
              notificationContent: 'You received ' + (floatAmount == 1 ? "1 Seed" : amount + " Seeds") + " from " + data.from,
              apiKey: CLOUD_API_KEY,
        })

        let url = CLOUD_URL + '?' + params
      
        const res = await fetch(url)

        if (res.status != 200) {
          console.error("error sensing PN: "+JSON.stringify(payload, null, 2))
          console.error("error response: "+JSON.stringify(res, null, 2))
        }

      })
    
    } catch (err) {
      logger.error(err)
      throw err
    }
  }

  _startStreamWatcher(collection, handler) {
    const pipeline = [
        { $match: { 
          'fullDocument.act.account': 'token.seeds', 
          'fullDocument.act.name': 'transfer',
        }},
        { $project: { 
          'fullDocument.act.data': 1,
          'fullDocument.trx_id': 1 
        }}
      ]
      
      
    console.log(`Starting watcher on collection: ${collection}`)
    const changeStream = this.eosDb.collection(collection).watch(pipeline)
    changeStream.on('change', next => {
        handler(next)
    })
    const self = this
    changeStream.on('error', err => {
        //console.error(`Change stream error for collection: ${collection}:`, err)
      logger.error(`Change stream error for collection: ${collection}:`, err)
      self._startStreamWatcher(collection, handler)
    })
    console.log(`Watcher started.`)

  }

  async _connectToDB() {
    console.log('Connecting to mongo db...')
    const {
      MONGO_HOST,
      MONGO_PORT,
      MONGO_DB,
      MONGO_USER,
      MONGO_PASSWORD,
    } = process.env
    try {
      this.client = await MongoClient.connect(`mongodb://${MONGO_USER}:${encodeURIComponent(MONGO_PASSWORD)}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      console.log('Connected to mongo db.')
      this.eosDb = this.client.db(MONGO_DB)
    } catch (err) {
      console.error(err)
      throw err
    }
  }
}

module.exports = TransactionWatcher