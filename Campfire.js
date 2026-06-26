import xapi from 'xapi';

let botToken = "replaceWithBotToken"
let codecDeviceId2 = "deviceIdCodec1"
let codecDeviceId3 = "deviceIdCodec2"
let codecDeviceId4 = "deviceIdCodec3"

var remoteRequest = false // do not change

function postMessage(codecDeviceId, requestType, dialNumber, displayName) {
  console.log("request: " + requestType)
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
  console.log("jsonMsg: " + json)

  xapi.Command.HttpClient.Post({Header: [headerAuth, headerContent], Timeout: 10, Url: url}, json);
}

async function getCallStatus(){
  xapi.Status.Call.get().then(callStatus => {
      const jsonParse = JSON.parse(callStatus)
      console.log("jsonParse: " + jsonParse)
      let number = jsonParse.CallbackNumber
      let sipAddress = number.split(":");
      let displayName = jsonParse.DisplayName
      console.log(`Call to ${displayName} on number ${sipAddress[1]}`)
      postMessage(codecDeviceId2, "placeCall", sipAddress[1], displayName)
      postMessage(codecDeviceId3, "placeCall", sipAddress[1], displayName)
      postMessage(codecDeviceId4, "placeCall", sipAddress[1], displayName)
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
  xapi.Status.SystemUnit.State.NumberOfActiveCalls.on(numberOfCalls => {
    console.log("numberOfCalls: " + numberOfCalls)
    if (numberOfCalls == 1){
      getCallStatus()
    }else if (numberOfCalls == 0){
      if (remoteRequest == true){
        remoteRequest = false
      }else{
        postMessage(codecDeviceId2, "endCall")
        postMessage(codecDeviceId3, "endCall")
        postMessage(codecDeviceId4, "endCall")
      }
    }else{
      console.log("call count: " + numberOfCalls)
    }
  })

  xapi.Status.Audio.Microphones.Mute.on(muteStatus => {
    console.log("muteStatus: " + muteStatus)
    postMessage(codecDeviceId2, "muteCall" + muteStatus)
    postMessage(codecDeviceId3, "muteCall" + muteStatus)
    postMessage(codecDeviceId4, "muteCall" + muteStatus)
  });

  xapi.event.on('UserInterface Message Prompt Display', (messageContent) => {
    if (messageContent.Title == "Placing Call") {
      console.log("placeCall")
      //remoteRequest = true
      placeCall(messageContent)
    }else if (messageContent.Title == "Ending Call") {
      console.log("endCall")
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
