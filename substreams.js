import { createRegistry, createRequest, applyParams } from "@substreams/core";
import { readPackage } from "@substreams/manifest";
import { BlockEmitter } from "@substreams/node";
import { createNodeTransport } from "@substreams/node/createNodeTransport";
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.SUBSTREAMS_API_KEY) {
  throw new Error("SUBSTREAMS_API_KEY is required");
}

const token = process.env.SUBSTREAMS_API_KEY;
const baseUrl = "https://telos.substreams.pinax.network:443";

// User parameters
const manifest = "https://spkg.io/pinax-network/antelope-common-v0.4.0.spkg";
const outputModule = "filtered_transactions";
const startBlockNum = -1; // Start from the current head block
const stopBlockNum = 0;   // Stream indefinitely
const productionMode = true;

// Parameterize the token contract
const TOKEN_CONTRACT = process.env.TOKEN_CONTRACT || 'token.seeds';
const params = [`filtered_transactions=code:${TOKEN_CONTRACT} && action:transfer`];

async function setupStream() {
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
}

async function processTransaction(transaction) {
  console.log(`New transaction: ${JSON.stringify(transaction, null, 2)}`);
  // Here, you would process the transaction and send push notifications if needed
  // For example, if it's a token transfer:
  if (transaction.action === 'transfer') {
    const { from, to, quantity } = transaction.data;
    console.log(`Transfer: ${from} -> ${to}: ${quantity}`);
    // await sendPushNotification(to, quantity);
  }
}

async function startStreaming() {
  while (true) {
    try {
      console.log("Setting up stream...");
      const emitter = await setupStream();

      emitter.on("anyMessage", (message, cursor, clock) => {
        if (message.filtered_transactions && message.filtered_transactions.transactions) {
          message.filtered_transactions.transactions.forEach(processTransaction);
        }
      });

      emitter.on("progress", (progress) => {
        console.log(`Processed ${progress.processedBytes.totalBytes} bytes`);
      });

      emitter.on("close", (error) => {
        if (error) {
          console.error("Stream closed with error:", error);
        } else {
          console.log("Stream closed normally");
        }
      });

      emitter.on("fatalError", (error) => {
        console.error("Fatal error occurred:", error);
      });

      console.log(`Starting stream for token contract: ${TOKEN_CONTRACT}`);
      await emitter.start();
    } catch (error) {
      console.error("An error occurred:", error);
      console.log("Reconnecting in 5 seconds...");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

console.log("✅ Starting filtered transaction monitoring");
startStreaming().catch(console.error);
