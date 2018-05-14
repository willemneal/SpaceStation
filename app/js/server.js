
self.importScripts("https://ipfs.io/ipfs/Qmf5o9Tnkm2hNWepdGz4nB3mjCqAFarirhh9YpSgh6XcyS/ipfs.js")
self.importScripts("https://ipfs.io/ipfs/Qmf5o9Tnkm2hNWepdGz4nB3mjCqAFarirhh9YpSgh6XcyS/orbitdb.min.js")
self.importScripts("https://unpkg.com/dexie@latest/dist/dexie.js")

class LocalStorage {
  constructor(){
    this.map = new Map()
  }
  setItem(key, value){
    this.map.set(key, value)
  }

  getItem(key){
    if (!this.map.has(key))
      return null
    return this.map.get(key)
  }
}
var localStorage = new LocalStorage()
var window = {localStorage : localStorage}

self.importScripts("./common.js")
self.importScripts("./account.js")
var account;
const createApp = function(acc){
  account = acc
}
self.importScripts("./main.js")



self.onmessage = function(event) {
  console.log(event)

};
