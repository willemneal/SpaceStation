

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


const createApp = function (account) {
  app = new Vue({
    el: '#app',
    data: {
      account:null,
      ready:false,
      email:"",
      password:"",
      qrCode:"",
      readQRcode:""
    }
    ,
    methods: {
      createAccount: function () {
        this.account.createAccount(this.email.toLowerCase(), this.password)
      },
      login: function(){
        this.account.login(this.email.toLowerCase(), this.password)
      },
      logout: function(){
        window.localStorage.removeItem("account")
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
app.account = account
app.ready = true
}

main()
