# Seeds Light Wallet notifications backend

Uses Pinax substreams to subscribe to transfer actions, sends notifications with firebase admin api

# Install & run

> clone this project

> cp .env.example .env

edit .env and fill in your pinax substream API key and JWT token

> npm i
> node substreams.js

#### Old system

The old notificaiton system was based on mongoDB - when we were running our own node

The code is here (private repo): 
[https://github.com/JoinSEEDS/mongodb_change_listener
](https://github.com/JoinSEEDS/mongodb_change_listener/blob/master/service/TransactionWatcher.js)
