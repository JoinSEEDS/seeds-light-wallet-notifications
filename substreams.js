import { createRegistry, createRequest, applyParams } from "@substreams/core";
import { readPackage } from "@substreams/manifest";
import { BlockEmitter } from "@substreams/node";
import { createNodeTransport } from "@substreams/node/createNodeTransport";
import dotenv from 'dotenv';
import sendNotification from "./sendNotification.js";

dotenv.config();

if (!process.env.SUBSTREAMS_API_KEY) {
  throw new Error("SUBSTREAMS_API_KEY is required");
}

const token = process.env.SUBSTREAMS_API_KEY;
const baseUrl = process.env.SUBSTREAMS_URL;
const tokenContract = process.env.TOKEN_CONTRACT;

// User parameters
const manifest = "https://spkg.io/pinax-network/antelope-common-v0.4.0.spkg";
const outputModule = "filtered_transactions";
const startBlockNum = -1; // Start from the current head block
const stopBlockNum = 0;   // Stream indefinitely
const productionMode = true;

// Parameterize the token contract
const params = [`filtered_transactions=code:${tokenContract} && action:transfer`];

// Assuming "filtered_transactions" is the module name you want to apply the filter to
// const params = [`filtered_transactions=code:${tokenContract}`, `filtered_transactions=action:transfer`];

console.log("params: " + JSON.stringify(params, null, 2))

async function setupStream() {
  try {
    console.log(`Start Substream on: ${baseUrl} for ${tokenContract}`);

    // Read Substream
    const substreamPackage = await readPackage(manifest);
    if (!substreamPackage.modules) {
      throw new Error("No modules found in substream package");
    }

    applyParams(params, substreamPackage.modules.modules);

    // Connect Transport
    const registry = createRegistry(substreamPackage);
    const transport = createNodeTransport(baseUrl, token, registry);
    const request = createRequest({
      substreamPackage,
      outputModule,
      startBlockNum,
      stopBlockNum,
      productionMode,
    });

    return new BlockEmitter(transport, request, registry);
  } catch (error) {
    console.error("Error in setupStream:", error.message);
    console.error("Error stack:", error.stack);
    throw error; // Re-throw the error to be caught in startStreaming()
  }
}

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
  symbol: "$",
})

async function processTransaction(transactionData) {
  console.log(`process transfer: ${JSON.stringify(transactionData, null, 2)}`);
  const { from, to, quantity, memo } = transactionData;
  console.log(`Transfer: ${from} -> ${to}: ${quantity}`);
  const floatAmount = parseFloat(quantity)
  var amount = formatter.format(floatAmount)
  amount = amount.substring(1) // remove the '$'

  const payload = {
    title: "",
    body: 'You received ' + (floatAmount == 1 ? "1 Seed" : amount + " Seeds") + " from " + from,
  }

  try {
    console.log(`Sending notification to ${to} with payload ${payload.body}`)
    await sendNotification(to, payload);
  } catch (error) {
    console.log("error sending notification: ", error)
  }

}

async function startStreaming() {
  let retryCount = 0;
  const maxRetries = 5;
  const baseDelay = 5000; // 5 seconds

  async function connectStream() {
    try {
      console.log("Setting up stream...");
      const emitter = await setupStream();

      emitter.on("anyMessage", (message, cursor, clock) => {
        if (Array.isArray(message.transactionTraces)) {
          message.transactionTraces.forEach(trace => {
            if (Array.isArray(trace.actionTraces)) {
              trace.actionTraces.forEach(actionTrace => {
                if (actionTrace.action && actionTrace.action.name === "transfer") {
                  const transactionData = JSON.parse(actionTrace.action.jsonData);

                  // One action trace is created for each receiver for each transfer
                  // This means that from, to, token contract, and maybe others each get one action trace, because they're all
                  // notified. In Seeds, histry.seeds is also notified. 

                  // To make sure only process each transaction once, we check that the receiver is the 'to' account
                  // This way we can be pretty sure we don't process this multiple times. 

                  // On the other hand a transaction may contain the same action multiple times - e.g. multiple transfers
                  // to different receivers, or the same receiver, and so on. Many exchanges can't handle this properly
                  // But this code should handle it properly. 

                  if (actionTrace.receipt.receiver == transactionData.to) {
                    processTransaction(transactionData);
                  }
                }
              });
            }
          });
        } else {
          console.log("No transaction traces found in message.");
        }
      });

      emitter.on("close", (error) => {
        if (error) {
          console.error("Stream closed with error:", error);
          retryConnection();
        } else {
          console.log("Stream closed normally");
          retryConnection();
        }
      });

      emitter.on("fatalError", (error) => {
        console.error("Fatal error occurred:", error);
        retryConnection();
      });

      console.log(`Starting stream for token contract: ${tokenContract}`);
      emitter.start();

      // Reset retry count on successful connection
      retryCount = 0;

      // Periodically restart the stream every hour
      setTimeout(() => {
        console.log("Restarting stream to prevent stalling...");
        emitter.stop(); // Note: this will cause a stream close event, which causes a restart
      }, 3600000); // 1 hour

    } catch (error) {
      console.error("An error occurred:", error);
      retryConnection();
    }
  }

  function retryConnection() {
    if (retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(`Reconnecting in ${delay / 1000} seconds...`);
      setTimeout(connectStream, delay);
      retryCount++;
    } else {
      console.error("Max retries reached. Exiting...");
      process.exit(1);
    }
  }

  connectStream();
}

console.log("✅ Starting filtered transaction monitoring");
startStreaming().catch(console.error);
