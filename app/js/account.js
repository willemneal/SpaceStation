class Path {
  static split(path){
    return path.split("/")
  }

  static basename(path){
    var folders = Path.split(path)
    return folders[folders.length - 1]
  }

  static dirname(path){
    var folders = Path.split(path)
    var dir = folders.slice(0,folders.length - 1).join("/")
    if (dir === ""){
      dir = "/"
    }
    return dir
  }
}

class FileSystem {
    constructor(orbitdb){
       this.orbitdb = orbitdb
       this.pwd = "/"
    }

    async init() {
      this.root = await this.orbitdb.keyvalue("fs", {sync: true, write:[]})
      this.root.events.on("replicate", function(){
           var lastAdded = this.root.all[this.root.all.length -1]
           console.log("New item added to the directory "+
                       lastAdded[parent] +"/"+lastAdded[name])
         })
      await this.root.load()
      var root = await this.getDirDoc("/")
      if (!root){
        var newDirDB = await this.orbitdb.keyvalue("root",{"write":[]})
        await this.root.put("/",
                      {name:"/",
                      parent:null,
                      directory:true,
                      database: newDirDB.address.toString()}
                    )
      }
      var profile = await this.getDirDoc("/profile")
      if (!profile) {
        this.mkdir("/profile")
      }
      this.mkdir("/contacts")
    }

    async mkdir(path, writers = []){
      var parent = Path.dirname(path)
      var basename = Path.basename(path)
      var parentDoc = await this.root.get(parent)
      if (!parentDoc){
        console.log("Parent directory does not exist")
        return null
      }
      var pathDoc = await this.root.get(path)
      if (pathDoc){
        console.log("Directory already exists")
        return null
      }
      var newDirectoryDB = await this.orbitdb.keyvalue(path, {write:writers})
      var newAddress = newDirectoryDB.address.toString()
      this.root.put(path,
                    {name:basename,
                    parent:parent,
                    directory:true,
                    database: newAddress}
                  )
      var parentDoc = await this.getDirDoc(parent)
      var parentDB = await this.orbitdb.keyvalue(parentDoc.database,{sync:true})
      parentDB.events.on("ready", function() {
        parentDB.put(basename, {name: basename,
                                  directory:true,
                                  database: newAddress})
      })
      await parentDB.load()
    }

    async getDirDoc(path){
      return this.root.get(path)
    }

    async openDir(address){
      var db = await this.orbitdb.keyvalue(address,{sync:true})
      await db.load()
      return db
    }

    async ls(path){
      var pathDoc = await this.getDirDoc(path)
      if (!pathDoc){
        log.console("Path Does not exist")
        return null
      }
      var pathDB = await this.openDir(pathDoc.database)
      return pathDB.all
    }

    async getDir(path){
      var dirDoc = await this.getDirDoc(path)
      var address = dirDoc.database
      return this.openDir(address)
    }

    async touch(path){
      var basename = Path.basename(path)
      var dirDB =  await this.getDir(Path.dirname(path))
      var file = await dirDB.get(basename)
      if (file){
        return
      }
      dirDB.put(basename,{name:basename,directory:false,content:null})
    }

}

class Key {
  constructor(name){
      this.options = {curve: "ed25519",
                    userIds:[{name:name}],
                    passphrase:""}
  }
  async init() {
    var key = await openpgp.generateKey(this.options)
    this.key = key
  }
  get pubArmored(){
    return this.key.publicKeyArmored
  }

  get privArmored(){
    return this.key.privateKeyArmored
  }

  get pub(){
    return openpgp.key.readArmored(this.pubArmored).keys
  }

  get priv(){
    return openpgp.key.readArmored(this.privArmored).keys[0]
  }

  async sign(data,privateKey=this.priv){
    return openpgp.sign({data:data, privateKeys:privateKey})
  }

  async verify(data, publicKey){
    return openpgp.verify({message:openpgp.cleartext.readArmored(data.data), publicKeys:publicKey})

  }
}
class Message {

}

class Channel {
  constructor(database){
    this.database = database
    this.database.events.on("replicate",this.read)
  }

  read(res){
    if (res){
      console.log(res)
    }
    this.messages = database.iterator({limit:this.limit}).collect()
  }

  write(message){
    this.database.add(message)
  }

  set limit(x){
    this.limit = x
  }

  update(){
    read("updating")
  }

}

class EncryptedChannel extends Channel{
  //TODO: add encryption ;-)
  constructor(database,myKeys,theirKey){
    super(database)
    this.myKeys = myKeys
    this.theirKeys = theirKey

  }
  read(res){
    this.messages = database.iterator({limit:this.limit}).collect()
  }

  async write(message){
    var hash = await this.database.add(message)
  }

  set limit(x){
    this.limit = x
  }
}

class Contact {
  //Here we just scanned the QRCode and learned
  //publicKey, peerID, database Address, Nonce
  //and what nonce to include to prove it was us.
  constructor(account, info){
    this.publicKey = info.publicKey
    this.peerID = info.peerID
    if (info.nonce){
          this.nonce = info.nonce
          this.sendFirstMessage(account,info.dbAddr)
    }
    if (info.msg){
      this.channel = new EncryptedChannel(info.channel,
                                          account.keys,
                                          this.publicKey)
    }
  }

  async sendFirstMessage(account,dbAddr){
    this.tempDB =  await account.orbitdb.log(dbAddr,{sync:true,create:true})
    await this.tempDB.load()
    var privDatabase = await account.orbitdb.feed(this.peerID +"X"+account.id, {create:true, write:[this.peerID,account.id]})
    this.channel = new EncryptedChannel(privDatabase,account.keys,this.publicKey)
    var message = {peerID:account.id,
                        publicKey:account.publicKey,
                        msg:
                        {channel: privDatabase.address.toString(),
                        nonce:this.nonce}}
    this.tempDB.add(message)
  }


}

class Account {
    constructor(OrbitDB, ipfs){
        this.storage = window.localStorage
        this.OrbitDB = OrbitDB // constructor
        this.accountDBName = "/orbitdb/QmWfN1JwLknbVfCZ3tZ6aZC9PHbbK2cX7RtZnzukKgUfMX/Accounts!"
        this.DBdirectory = "./orbitdb"
        this.options = {}
        this.init(ipfs)
        this.createAccountDB()
        this.contacts = {}

    }

    init(ipfs){
        if (this.loggedin){
           this.options = {peerId:this.fromStorage()}
        }
        this.orbitdb = new OrbitDB(ipfs, this.DBdirectory, this.options)
        if (this.loggedin){
          this.login("","")
        }

    }

    get loggedin() {
      return !(null === this.storage.getItem("account")) &&
             this.orbitdb &&
             this.orbitdb.id === this.storage.getItem("account")
    }

    saveAccount(){
      this.storage.setItem("account", this.orbitdb.id)
    }

    fromStorage(){
      return this.storage.getItem("account")
    }

    async createAccountDB() {
      this.db = await this.orbitdb.open(this.accountDBName, { sync: true })
      await this.db.load()
      this.worker = new Worker("js/actor.js")
      this.worker.postMessage("In worker" + this.db.address.toString())
      console.log("accountDB loaded "+ this.db.address.toString())
    }


    async createAccount(email, password) {
      if (this.loggedin){
        console.log("already signed in")
        return
      }
      var emailText = email
      var hashText = await hash(emailText)
      console.log("creating account for " + emailText)
      var AccountOptions
      var lookup = await this.db.get(hashText)
      if (!lookup){
         AccountOptions = await this.encryptAccountOptions(password)
         AccountOptions.encBuffer = arrayBuf2UintArray(AccountOptions.encBuffer)
         await this.db.put(hashText, JSON.stringify(AccountOptions))
      }
      var res = await this.db.get(hashText)
      console.log(res)
    }

    lookupAccount(email,password) {
      return (async () => {
         var emailText = email
         console.log("looking up Account with email "+ emailText)

          var found = await this.db.get(await hash(emailText))
          if (!found){
            console.log("account doesn't exist")
            return false
          }
          const docs = JSON.parse(found)

          var ivArray = []
          var key
          for (key in docs.iv){
            ivArray[key] = docs.iv[key]
          }
          var encBuf = []
          for (key in docs.encBuffer){
            encBuf[key] = docs.encBuffer[key]
          }
          docs.iv = new Uint8Array(ivArray)
          docs.encBuffer = (new Uint8Array(encBuf)).buffer

          var AccountOptions = await this.decryptAccountOptions(docs, password)

          console.log(JSON.stringify(AccountOptions))
          // AccountOptions.keystore.getKey = function (id){
          //   return JSON.parse(AccountOptions.keystore._storage[id])}
          return AccountOptions
      })()

    }

    get ipfs(){
      return this.orbitdb._ipfs
    }

    get key() {
      return this.orbitdb.key
    }

    get keystore(){
      return this.orbitdb.keystore
    }

    get id() {
      return this.orbitdb.id
    }

    get publicKey() {
      return this.key.getPublic("hex")
    }

    sign(data) {
      return this.keystore.sign(this.key, data)
    }

    verify(signature, key, data){
      return this.keystore.verify(signature, key, data)
    }
    async encryptAccountOptions(password) {
      const toEncrypt = JSON.stringify({keystore:this.orbitdb.keystore._storage, peerId :this.orbitdb.id})
      console.log(toEncrypt);
      return encryptText(toEncrypt,password)
    }
    async decryptAccountOptions(cipherText, password) {
      return JSON.parse(await decryptText(cipherText.encBuffer, cipherText.iv,password))
    }

    async login(email, password){
      if (this.loggedin){
        console.log("already logged in")
      }else{
        var oldId = this.orbitdb.id
        var options = await this.lookupAccount(email, password)
        if (!options){
          return
        }
        this.orbitdb.id = options["peerId"]
        this.orbitdb.keystore._storage[this.orbitdb.id] = options["keystore"][this.orbitdb.id]
        this.orbitdb = new OrbitDB(this.orbitdb._ipfs,this.orbitdb.directory, {peerId: this.orbitdb.id, keystore:this.orbitdb.keystore})
        console.log("old id "+ oldId + " new id: " + options.peerId)
        this.saveAccount()
        console.log(this.loggedin ? "logged in!": "login Failed :-(")
      }
      this.fs = new FileSystem(this.orbitdb)
      await this.fs.init()
    }

    logout(){
      this.storage.removeItem("account")
    }

    connectedPeers() {
      return this.ipfs.pubsub.peers(db.address.toString())
    }

    async newContactCard() {
      if (this.tempDB)
        return
      this.tempDB = await this.orbitdb.eventlog(randomNonce(8)+"",{create:true, overwrite:true, write:["*"]})
      var nonce = randomNonce(8)
      var card = {nonce:nonce,
                  dbAddr: this.tempDB.address.toString(),
                  publicKey:this.publicKey,//this.key.pub,
                  peerID:this.id
      }
      var db = this.tempDB
      await db.load()
      this.tempDB.events.on("replicate", function(){
        db.load().then(function(){
        var message = db.iterator().collect()[0]
        if (message.msg.nonce === nonce){
          addContact({peerID: message.id,
                      publicKey: message.publicKey,
                      channel: message.msg.channel})
          db.drop()
        })
        } else{
          console.log("NONCE IS NOT CORRECT")
        }
      })
      return card
    }

    receiveFirstMessage(){

    }//TODO Move callback here

    async addContact(info){
      this.contacts[info.peerID] = new Contact(this, info)
    }
}




class Petition {
   constructor(account, name, desc){
      this.account = account
      this.name = name;
      (async () => {
      this.db = await account.orbitdb.keyvalue(name, {write:[]})
      this.hash = await this.db.put("desc", desc)
      this.publicDB = await account.orbitdb.keyvalue(name, {write:["*"]})
      this.db.put("address", this.publicDB.address.toString())
      }
    ) ()
   }

   get desc(){
     return this.db.get("desc")
   }

   get publicDB (){
     return this.db.get("address")
   }

   sign(account) {
     var signature = account.sign(this.desc)
     var publicKey = account.publicKey
     this.publicDB.put(publicKey, signature)
   }

   static createPetition(address){

   }

}
