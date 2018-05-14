

// 0. If using a module system, call Vue.use(VueRouter)

// 1. Define route components.
// These can be imported from other files
// const Login = { data: {email:"",password:""}
//                 template: window.document.getElementById("login-temp") }
// const Home = {  template: window.document.getElementById("home-temp")}
//
// // 2. Define some routes
// // Each route should map to a component. The "component" can
// // either be an actual component constructor created via
// // Vue.extend(), or just a component options object.
// // We'll talk about nested routes later.
// const routes = [
//   { path: '/', component: Home },
//   { path: '/login', component: Login }
// ]
//
// // 3. Create the router instance and pass the `routes` option
// // You can pass in additional options here, but let's
// // keep it simple for now.
// const router = new VueRouter({
//   routes
// })
var app = null

Vue.component("petitions",{
  props: ["name","petitions"],
  template: window.document.getElementById("petitionsTemplate")
})


const createApp = function (account) {

  app = new Vue({
    el: '#app',
    data: {
      account: account,
      email:"",
      clipboard: new ClipboardJS('.btn'),
      password:"",
      qrCode:"",
      readQRcode:"",
      arguments: window.location.search,
      contacts: account.contacts,
      postName:"",
      petitions: account.posts,
      message:"",
      inviteLink:""
    },
    computed:{
      ready: function (){
        return null !== this.account
      },
      loggedin: function(){
        return this.account.loggedin
      },
      hasContactLink: function(){
        return this.inviteLink !==""
      },
      // petitions: function(){
      //   if (this.loggedin)
      //   return this.account.posts
      // }
    },
    watch:{
      arguments: function(oldArgs, newArgs){
        if(this.loggedin && arguments.length > 0){
          this.account.addContactFromURL()
        }
      }
    },
    methods: {
      submitPost: function() {
        // Populate hidden form on submit

        // this.posts.push(about.value)
        var post = {title:this.postName,
                    content:this.message,
                    signatures:0}
        this.account.makePost(this.postName,post)
        // this.posts.push(post)

        console.log(post);

        // No back end to actually submit to!
        return false;
      },
      hasContacts: function(){
        return this.account && this.account.contacts && this.account.contacts.length > 0
      },
      createAccount: function () {
        this.account.createAccount(this.email.toLowerCase(), this.password)
      },
      login: function(){
        this.account.login(this.email.toLowerCase(), this.password)
      },
      logout: function(){
        window.localStorage.removeItem("account")
      },
      createContactLink:async function(){
        var card = await this.account.newContactCard()
        this.inviteLink = "https://pldev2.cs.umd.edu/app?"+ serializeObject(card)
      },
      createQRCode : async function() {
        var qrcode = new QRCode(document.getElementById("qrcode"), {
        text: JSON.stringify(await this.account.newContactCard()),
        width: 256,
        height: 256,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
        })
      },
      scanQRCode : function() {
          (function(account){
              let scanner = new Instascan.Scanner({ video: document.getElementById('preview') });
              scanner.addListener('scan', function (content) {
                alert(content);
                account.addContact(JSON.parse(content))
              });
              Instascan.Camera.getCameras().then(function (cameras) {
                if (cameras.length > 0) {
                  if (cameras.length == 1){
                    scanner.start(cameras[0]);
                  } else {
                    scanner.mirror = false;
                    scanner.start(cameras[1]);
                  }
                } else {
                  console.error('No cameras found.');
                }
              }).catch(function (e) {
                console.error(e);
              });
        })(this.account)
      }
    }
})
}

main()
