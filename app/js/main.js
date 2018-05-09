function handleError(e) {
  console.error(e.stack)
}



const main = (IPFS, ORBITDB) => {
  // If we're building with Webpack, use the injected IPFS module.
  // Otherwise use 'Ipfs' which is exposed by ipfs.min.js
  if (IPFS)
    Ipfs = IPFS

  // If we're building with Webpack, use the injected OrbitDB module.
  // Otherwise use 'OrbitDB' which is exposed by orbitdb.min.js
  if (ORBITDB)
    OrbitDB = ORBITDB



  // Create IPFS instance
  const ipfs = new Ipfs({
    repo: '/orbitdb/ipfs/0.27.3/app',
    start: true,
    EXPERIMENTAL: {
      pubsub: true,
    },
    config: {
      Addresses: {
        Swarm: [
          // Use IPFS dev signal server
          //'/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star',
          //'/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star',
           '/dns4/ws-star-signal-2.servep2p.com/tcp/443/wss/p2p-websocket-star',
          '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
          //'/dns4/pldev2.cs.umd.edu/tcp/9090/wss/p2p-websocket-star/'
          // Use local signal server
          // '/ip4/0.0.0.0/tcp/9090/wss/p2p-webrtc-star',
        ]
      },
    }
  })

  ipfs.on('error', (e) => handleError(e))
  ipfs.on('ready', () => {
    console.log(ipfs._peerInfo.id._idB58String)
    var account = new Account(OrbitDB, ipfs)
    console.log("public key: " + account.orbitdb.key.getPublic('hex'))
    createApp(account)
  })
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
  module.exports = main
