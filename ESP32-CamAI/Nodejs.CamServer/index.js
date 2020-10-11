const WebSocket = require("ws");

//!================Vanilla WebSocket for ESP32-CAM================!//
// const wsServer = new WebSocket.Server({ port: 81 });
// let arrSocket = [];
// wsServer.on("connection", (ws) => {
//   arrSocket.push(ws);
//   console.log('[INFO] Hello ESP32-CAM');
//   ws.on("message", (payload) => {
//     arrSocket.forEach((ws, i) => {
//       if (ws.readyState === ws.OPEN) {
//         // console.log(payload);
//         ws.send(payload);
//       } else {
//         arrSocket.splice(i, 1);
//       }
//     });
//   });
// });



const wsServer = new WebSocket.Server({ port: 81 });
wsServer.on("connection", ws => {
  ws.on("message", msg => {
    // console.log(msg);
    const payload = JSON.parse(msg)[0];
    console.log(payload);
    switch (payload.EVENT) {
      case "regESP":

        break;

      default:
        break;
    }
  })
})