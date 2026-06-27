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
var remoteRequest = false // used to track if request is local or from remote codec

function postMessage(codecDeviceId, requestType, dialNumber, displayName) {
  console.log("tx request: " + requestType)
  let headerAuth = "Authorization: Bearer " + botToken
  let headerContent = "Content-Type: application/json"
  let url = "https://webexapis.com/v1/xapi/command/UserInterface.Message.Prompt.Display"
  var title, message
  if (requestType == "placeCall"){
    message = `${displayName}(${dialNumber})`
    title = "Placing Call"
  }else if (requestType == "endCall"){
    title = "Ending Call"
    message = "Ending the current call"
  }else if (requestType == "muteCallOn"){
    title = "Toggling Mute"
    message = "Muting Audio"
  }else if (requestType == "muteCallOff"){
    title = "Toggling Mute"
    message = "Unmuting Audio"
  }

  let body = {
    deviceId: codecDeviceId,
    arguments: {
      "Duration": 3,
      "Target": "OSD",
      "Text": message,
      "Title": title
    }
  };
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
      console.log(`Call to ${displayName} on number ${sipAddress[1]}`)
      for (const eachCodec of remainingCodecs) {
        postMessage(eachCodec, "placeCall", sipAddress[1], displayName)
      }
  })
}

function placeCall(value){
  let text = value.Text
  let displayName = text.split('(')[0]
  let sipAddress = text.split('(')[1].split(')')[0];
  xapi.Command.Dial({ DisplayName: `Dialing ${displayName}`, Number: sipAddress });
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
      getCallStatus()
    }else if (numberOfCalls == 0){
      if (remoteRequest == true){
        remoteRequest = false
      }else{
        for (const eachCodec of remainingCodecs) {
          postMessage(eachCodec, "endCall")
        }
      }
    }else{
      console.log("call count: " + numberOfCalls)
    }
  })

  xapi.Status.Audio.Microphones.Mute.on(muteStatus => {
    console.log("rx local muteStatus: " + muteStatus)
    for (const eachCodec of remainingCodecs) {
      postMessage(eachCodec, "muteCall" + muteStatus)
    }
  });

  xapi.event.on('UserInterface Message Prompt Display', (messageContent) => {
    console.log("rx remote msg: " + messageContent)
    if (messageContent.Title == "Placing Call") {
      placeCall(messageContent)
    }else if (messageContent.Title == "Ending Call") {
      remoteRequest = true
      xapi.Command.Call.Disconnect({});
    }else if (messageContent.Title == "Toggling Mute") {
      if (messageContent.Text == "Muting Audio"){
        xapi.Command.Audio.Microphones.Mute();
      }else if (messageContent.Text == "Unmuting Audio"){
        xapi.Command.Audio.Microphones.Unmute();
      }
    }
  });
}

init()
