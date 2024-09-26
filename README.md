# Seeds Light Wallet notifications backend

Uses Pinax substreams to subscribe to transfer actions

TODO: Hook up to firebase API to send actual notifications

#### Old system

The old notificaiton system was based on mongoDB - when we were running our own node

The code is here (private repo): 
[https://github.com/JoinSEEDS/mongodb_change_listener
](https://github.com/JoinSEEDS/mongodb_change_listener/blob/master/service/TransactionWatcher.js)
