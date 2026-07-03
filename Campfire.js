import xapi from 'xapi';

// Written by Darren Henwood (dhenwood@cisco.com)
//For details, see: https://github.com/dhenwood/Campfire

// Update the following 5 values
let botToken = "replaceWithBotToken"
let codecDeviceId1 = "replaceWithDeviceIdCodec1"
let codecDeviceId2 = "replaceWithDeviceIdCodec2"
let codecDeviceId3 = "replaceWithDeviceIdCodec3"
let codecDeviceId4 = "replaceWithDeviceIdCodec4"

let allCodecs = [codecDeviceId1, codecDeviceId2, codecDeviceId3, codecDeviceId4]
var remainingCodecs // after init(), becomes an array of the other 3 codecs
var remoteRequest = false // used to track if request is local or from remote codec (prevent loops)

function postMessage(codecDeviceId, message) {
  let headerAuth = "Authorization: Bearer " + botToken
  let headerContent = "Content-Type: application/json"
  let url = "https://webexapis.com/v1/xapi/command/Message.Send"

  let body = {
  "deviceId": codecDeviceId,
  "arguments": {
    "Text": message
    }
  }
  let json = JSON.stringify(body)
  console.log("tx jsonMsg: " + json)
  xapi.Command.HttpClient.Post({Header: [headerAuth, headerContent], Timeout: 10, Url: url}, json);
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

function init(){
  xapi.Config.HttpClient.Mode.set("On");

  xapi.Status.Webex.DeveloperId.get().then(thisDeviceId => {
    remainingCodecs = allCodecs.filter(codec => codec !== thisDeviceId);
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
      xapi.Command.Dial({ DisplayName: `Dialing ${displayName}`, Number: sipAddress });
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
