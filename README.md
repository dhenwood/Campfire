### Introduction
In Campfire meeting rooms, in-person participants sit around a central arrangement of four quad-cameras and up to eight eye-level screens. Campfire accommodates up to 16 participants, with four on each side.

![alt text](https://storage.googleapis.com/gblogs-bucket/sites/25/Campfire_close_up_4k_Still-1536x864.jpg)

Cisco _had_ a solution to provide a Campfire experience however it is no longer available. The following is a simplified solution to the predecesor. This is made up of 4 Cisco Room Bar Pro devices and accompaning Navigator all operating independantly of each other - but the macro notifies the other 3 to perform specific tasks (see below). **NOTE:** this is not Cisco or TAC supported.

### Capabilities & Caveats
This macro provides the following 3 key features;
1. Initiate a call from any of the 4 Navigators (manual or OBTP) and the other 3 codecs dial the same address.
2. Mute/unmute a call from any of the 4 Navigators and the other 3 codecs will mute/unmute.
3. End call from any of the 4 Navigators and the other 3 codecs will end the call

The following caveats exist
1. When not in a call, sharing content only shows on the codec the cable is connected to (not the other 3).
2. More investigation needs to be done on microphone/speaker experiences.

### Steps for setup
The following items need to be performed to setup Campfire;
1. A BOT Token needs to be created. This is used to notify the other codecs of each of the tasks they need to do. If unfamiliar, the steps to creating a BOT [can be found here](https://developer.webex.com/messaging/docs/bots)
2. Apply the BOT Token to all 4 of the Workspaces the Room Bar Pros are in. Ensure to set the permissions to Full Access. More on this [can be found here](https://developer.webex.com/devices/docs/devices#giving-a-bot-or-user-access-to-the-xapi-of-a-device)
3. Obtain each of the device ID's for the 4 Room Bar Pros. This can be done via Control Hub or via the browser web GUI. For details [see the documentation](https://roomos.cisco.com/xapi/Status.Webex.DeveloperId/)
4. Once these have been done, [the macro](https://github.com/dhenwood/Campfire/blob/main/Campfire.js) needs to be updated with the BOT Token and 4 device ID's.
5. Install the macro on each codec.
