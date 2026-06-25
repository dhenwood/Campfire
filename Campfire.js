import xapi from 'xapi';

/*
TO DO
* Mute (maybe include video mute)
* End Call
*/

let botToken = "replaceWithBotToken"
// Other 3 codecs deviceId
let codecDeviceId1 = "deviceIdCodec1"
let codecDeviceId2 = "deviceIdCodec2"
let codecDeviceId3 = "deviceIdCodec3"

var remoteRequest = false // do not change

function postMessage(codecDeviceId, dialNumber, displayName) {
  let headerAuth = "Authorization: Bearer " + botToken
  let headerContent = "Content-Type: application/json"
  let url = "https://webexapis.com/v1/xapi/command/UserInterface.Message.Prompt.Display"
  let message = `${displayName}(${dialNumber})`
  console.log(`message: ${message}`)
  
  let body = {
    deviceId: codecDeviceId,
    arguments: {
      "Duration": 3,
      "Target": "OSD",
      "Text": message,
      "Title": "Placing Call"
    }
  };
  let json = JSON.stringify(body)

  xapi.Command.HttpClient.Post({Header: [headerAuth, headerContent], Timeout: 10, Url: url}, json);
}

async function getCallStatus(){
  xapi.Status.Call.get().then(callStatus => {
      const jsonParse = JSON.parse(callStatus)
      let number = jsonParse.CallbackNumber
      let sipAddress = number.split(":");
      let displayName = jsonParse.DisplayName
      console.log(`Call to ${displayName} on number ${sipAddress[1]}`)
      postMessage(codecDeviceId1, sipAddress[1], displayName)
      postMessage(codecDeviceId2, sipAddress[1], displayName)
      postMessage(codecDeviceId3, sipAddress[1], displayName)
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
      if (remoteRequest == true){
        remoteRequest = false
      }else{
        getCallStatus()
      }
    }else{
      console.log("call count: " + numberOfCalls)
    }
  })

  xapi.event.on('UserInterface Message Prompt Display', (value) => {
    if (value.Title == "Placing Call") {
      console.log("placeCall")
      remoteRequest = true
      placeCall(value)
    }
  });
}

init()
