const WebSocket = require("ws");

//!================Vanilla WebSocket for ESP32-CAM================!//
const wsServer = new WebSocket.Server({ port: 81 });
let arrSocket = [];
wsServer.on("connection", (ws) => {
  arrSocket.push(ws);
  console.log('[INFO] Hello ESP32-CAM');
  ws.on("message", (payload) => {
    arrSocket.forEach((ws, i) => {
      if (ws.readyState === ws.OPEN) {
        // console.log(payload);
        ws.send(payload);
      } else {
        arrSocket.splice(i, 1);
      }
    });
  });
});
