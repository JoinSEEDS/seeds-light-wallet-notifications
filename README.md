# Seeds Light Wallet notifications backend

Uses Pinax substreams to subscribe to transfer actions, sends notifications with firebase admin api

# Install & run

> clone this project

> cp .env.example .env

edit .env and fill in your pinax substream API key and JWT token

> npm i
> node substreams.js

#### Old system

The old notificaiton system was based on mongoDB - when we were running our own node. MongoDB is no longer supported and we don't run our own node anymore anyway so transaction detection needed to be rewritten from scratch. 

The old system used firebase cloud functions to send notifications - this entire API seems to be retired at this ppint, so none of that vode was working anymore, and it was very difficult to debug through cloud error logging. Also because versioning on cloud functions is mysterious and we needed to update all Firebase function calls, remove non-existent calls and replace them with a new API. 

#### New system

We now use Pinax substreams for transaction detection.
We use firebase admin API for sending notifications. 

This is a complete rewrite of how we handle push notifications. 

The code is here (private repo): 
[https://github.com/JoinSEEDS/mongodb_change_listener
](https://github.com/JoinSEEDS/mongodb_change_listener/blob/master/service/TransactionWatcher.js)
