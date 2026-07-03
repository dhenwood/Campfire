import xapi from 'xapi';

// Written by Darren Henwood (dhenwood@cisco.com)
//For details, see: https://github.com/dhenwood/Campfire

let username = "replaceWithDesiredUsername" // the username will get created if it does not already exist
let password = "replaceWithDesiredPassword" // this password will be associated to the previous lines username
let codecIpAddress1 = "replaceWithIpAddressCodec1"
let codecIpAddress2 = "replaceWithIpAddressCodec2"
let codecIpAddress3 = "replaceWithIpAddressCodec3"
let codecIpAddress4 = "replaceWithIpAddressCodec4"

let allCodecs = [codecIpAddress1, codecIpAddress2, codecIpAddress3, codecIpAddress4]
var remainingCodecs // after init(), becomes an array of the other 3 codecs
var remoteRequest = false // used to track if request is local or from remote codec (prevent loops)

function postMessage(deviceIP, message) {
  let usernamePasswordString = username + ":" + password
  let usernamePassword = btoa(usernamePasswordString) // base64 encoded value
  let headerAuth = "Authorization: Basic " + usernamePassword
  let headerContent = "Content-Type: text/xml"
  let url = `https://${deviceIP}/putxml`

  let body = `<Command><Message><Send><Text>${message}</Text></Send></Message></Command>`
  
  xapi.Command.HttpClient.Post({Header: [headerAuth, headerContent], Timeout: 10, Url: url, AllowInsecureHTTPS: "True"}, body);
}

async function getCallStatus(){
  xapi.Status.Call.get().then(callStatus => {
      const jsonParse = JSON.parse(callStatus)
      let number = jsonParse.CallbackNumber
      let sipAddress = number.split(":");
      let displayName = jsonParse.DisplayName
      let message = `{\"command\":\"placeCall\", \"sipAddress\": "${sipAddress[1]}", \"displayName\": "${displayName}"}`
      for (const eachCodec of remainingCodecs) {
        postMessage(eachCodec, message)
      }
  })
}

async function createLocalAccount(){
  try {
    await xapi.Command.UserManagement.User.Get({ Username: username });
    console.log("User " + username + " already exists. No need to create an account")
  }
  catch(err) {
    console.log("User " + username + " does not exist. Creating local account")
    xapi.Command.UserManagement.User.Add({ Username: username, Passphrase: password, Role: "User"});
  }
}

async function init(){
  xapi.Config.HttpClient.Mode.set("On");
  xapi.Config.HttpClient.AllowInsecureHTTPS.set("True");
  createLocalAccount()
  
  xapi.Status.Network[1].IPv4.Address.get().then(thisDeviceIpAddress => {
    remainingCodecs = allCodecs.filter(codec => codec !== thisDeviceIpAddress);
    console.log("remainingCodecs: " + remainingCodecs)
  })

  xapi.Status.SystemUnit.State.NumberOfActiveCalls.on(numberOfCalls => {
    console.log("numberOfCalls: " + numberOfCalls)
    if (numberOfCalls == 1){
      if (remoteRequest == false){
        getCallStatus()
      }else{
        remoteRequest = false
      }
    }else if (numberOfCalls == 0){
      if (remoteRequest == true){
        remoteRequest = false
      }else{
        let message = `{"command":"endCall"}`
        for (const eachCodec of remainingCodecs) {
          postMessage(eachCodec, message)
        }
      }
    }else{
      console.log("call count: " + numberOfCalls)
    }
  })

  xapi.Status.Audio.Microphones.Mute.on(muteStatus => {
    if (remoteRequest == false){
      let message = `{"command":"muteCall", "state": "${muteStatus}"}`
      for (const eachCodec of remainingCodecs) {
        postMessage(eachCodec, message)
      }
    }else{
      remoteRequest = false
    }
  });

  xapi.Event.Message.Send.on(messageRx => {
    console.log("messageRx: " + messageRx)
    remoteRequest = true
    let json = JSON.parse(messageRx.Text)
    let command = json.command
    if (command == "placeCall"){
      let sipAddress = json.sipAddress
      let displayName = json.displayName
      xapi.Command.Dial({ DisplayName: displayName, Number: sipAddress });
    }else if (command == "muteCall"){
      let state = json.state
      if (state == "On"){
        xapi.Command.Audio.Microphones.Mute();
      }else{
        xapi.Command.Audio.Microphones.Unmute();
      }
    }else if (command == "endCall"){
      xapi.Command.Call.Disconnect({});
    }
  });
}

init()
