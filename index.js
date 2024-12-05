import {
  createRegistry,
  createRequest,
  fetchSubstream,
  isEmptyMessage,
  streamBlocks,
  unpackMapOutput,
} from "@substreams/core";
import { createNodeTransport } from "@substreams/node/createNodeTransport";

dotenv.config();

const PACKAGE = "https://github.com/pinax-network/substreams/releases/download/eosio.token-v0.13.2/eosio-token-v0.13.2.spkg";
const OUTPUT_MODULE = "map_transfers";

const token = process.env.SUBSTREAMS_API_KEY;
const baseUrl = process.env.SUBSTREAMS_URL;
const tokenContract = process.env.TOKEN_CONTRACT;

async function run() {
  const manifest = await fetchSubstream(PACKAGE);
  const registry = createRegistry(manifest);

    // in theory we can filter out token.seeds in the stream - but it's unclear how this works
    // applyParams(params, substreamPackage.modules.modules);

  const transport = createNodeTransport(baseUrl, token, registry);

  const request = createRequest({
    substreamPackage: manifest,
    outputModule: OUTPUT_MODULE,
    productionMode: true,
    startBlockNum: -1,
    stopBlockNum: 0,
  });

  for await (const response of streamBlocks(transport, request)) {
    const output = unpackMapOutput(response, registry);
    if (output !== undefined && !isEmptyMessage(output)) {
        const data = output.toJson({ typeRegistry: registry });
        // console.dir(data);
        const items = data['items']
        let ix = 0;
        for (let item of items) {
            // console.log("item " + (ix++));
            const contract = item.contract;
            const action = item.action;
            
            if (contract == tokenContract && action == 'transfer') {
                    const from = item.from;
                    const to = item.to;
                    const quantity = item.quantity;
                    
                    console.log("token message " + JSON.stringify({
                        contract,
                        action,
                        from,
                        to,
                        quantity,
                        }, null, 2));
                    
                    
            }

        }
    }
  }
}

run().catch((error) => {
  console.error("Error:", error);
});
