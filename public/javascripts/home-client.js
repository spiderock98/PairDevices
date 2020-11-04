const socket = io();

//!======/ map on homepage /=======!//
var viewMap;
function initViewMap() {
  const initLatLng = new google.maps.LatLng($(".hidLatCoor").text(), $(".hidLngCoor").text());
  const currentPlace = $(".hidPlace").text();

  viewMap = new google.maps.Map(document.getElementById("viewMap"), {
    center: initLatLng,
    zoom: 15,
    fullscreenControl: false,
    keyboardShortcuts: false,
    mapTypeControl: false,
    panControl: false,
    rotateControl: false,
    scaleControl: false,
    streetViewControl: false,
    zoomControl: false,
  });
  const marker = new google.maps.Marker({
    position: initLatLng,
    map: viewMap,
    animation: google.maps.Animation.BOUNCE
  });
  const infowindow = new google.maps.InfoWindow({
    content: currentPlace,
  }).open(viewMap, marker);
}

//!============/ init myCurrentUID as global scope variable  /===========!//
function getCurrentUID() {
  return new Promise((resolve) => {
    $.ajax({
      url: "/auth/getCurrentUID",
      method: "POST",
      success: (uid) => {
        resolve(uid);
      },
    });
  });
}
let myCurrentUID;
getCurrentUID().then((uid) => {
  myCurrentUID = uid;
}); // Global Var

//!================/ VanillaWebsocket /================!//
const WS_URL = "ws:///192.168.1.99:81";
const ws = new WebSocket(WS_URL);

//!================/ ESP32-CAM on security area field /================!//
let urlObj;
let imgFrame = document.getElementById("cap");
ws.onopen = () => console.log("[INFO] Connected to", WS_URL);
ws.onmessage = (payload) => {
  const arrBuffer = payload.data;
  if (urlObj) {
    URL.revokeObjectURL(urlObj);
  }
  urlObj = URL.createObjectURL(new Blob([arrBuffer]));
  imgFrame.src = urlObj;
};

//!================/ ESP32-CAM on QR SCANNER /================!//
// var video = document.createElement("video");
// var canvasElement = document.getElementById("canvas");
// var canvas = canvasElement.getContext("2d");
// var loadingMessage = document.getElementById("loadingMessage");
// var outputContainer = document.getElementById("output");
// var outputMessage = document.getElementById("outputMessage");
// var outputData = document.getElementById("outputData");
// const btnReScan = document.getElementById("btnReScan");

// function drawLine(begin, end, color) {
//   canvas.beginPath();
//   canvas.moveTo(begin.x, begin.y);
//   canvas.lineTo(end.x, end.y);
//   canvas.lineWidth = 4;
//   canvas.strokeStyle = color;
//   canvas.stroke();
// }
// function tick() {
//   loadingMessage.innerText = "⌛ Loading video..."
//   if (video.readyState === video.HAVE_ENOUGH_DATA) {
//     loadingMessage.hidden = true;
//     canvasElement.hidden = false;
//     outputContainer.hidden = false;

//     canvasElement.height = video.videoHeight;
//     canvasElement.width = video.videoWidth;
//     //? display video on canvas
//     canvas.drawImage(imgFrame, 0, 0, canvasElement.width, canvasElement.height);
//     var imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
//     //? try to find QR Image
//     var code = jsQR(imageData.data, imageData.width, imageData.height, {
//       inversionAttempts: "dontInvert",
//     });
//     //? ON detect QR Image
//     if (code) {
//       //? retangle qrcode
//       drawLine(code.location.topLeftCorner, code.location.topRightCorner, "#FF3B58");
//       drawLine(code.location.topRightCorner, code.location.bottomRightCorner, "#FF3B58");
//       drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF3B58");
//       drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF3B58");

//       outputMessage.hidden = true;
//       outputData.parentElement.hidden = false;
//       outputData.innerText = code.data;


//       console.log(code.data);
//       stopStream();
//       btnReScan.hidden = false;
//       const objDeviceInfo = JSON.parse(code.data);
//       console.log(objDeviceInfo);
//       $("#formDevice").find("input[name='deviceId']").val(objDeviceInfo.deviceId);
//       return;
//     } else {
//       outputMessage.hidden = false;
//       outputData.parentElement.hidden = true;
//     }
//   }
//   requestAnimationFrame(tick);
// }
// // trigger when add new device
// const startStream = () => {
//   // ws.send(`[{"EVENT":"browserEnCam", "gardenId":"${}"}]`);
//   ws.send(`[{"EVENT":"browserEnCam", "gardenId":${$("#hidGardenId")}}]`);
//   btnReScan.hidden = true;
//   // Use facingMode: environment to attemt to get the front camera on phones
//   navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
//     .then(Stream => {
//       video.srcObject = Stream;
//       video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
//       requestAnimationFrame(tick);
//     });
// }
// const stopStream = () => {
//   video.srcObject.getTracks().forEach(track => track.stop());
// }

// $("#btnCloseDeviceModal").on("click", () => {
//   stopStream();
// })
// $("#btnReScan").on("click", () => {
//   startStream();
// })

//!============/ Others Script /===========!//

//!===/ execute new instace class object define in <js-fluid-meter.js> /===!//
var fm = new FluidMeter();
fm.init({
  targetContainer: document.getElementById("fluid-meter"),
  fillPercentage: 15,
  options: {
    fontFamily: "Raleway",
    drawPercentageSign: false,
    drawBubbles: true,
    size: 200,
    fontSize: "30px",
    borderWidth: 10,
    backgroundColor: "#e2e2e2",
    foregroundColor: "#fafafa",
    foregroundFluidLayer: {
      fillStyle: "#0066ff",
      angularSpeed: 100,
      maxAmplitude: 12,
      frequency: 30,
      horizontalSpeed: -150
    },
    backgroundFluidLayer: {
      fillStyle: "#00ffff",
      angularSpeed: 100,
      maxAmplitude: 9,
      frequency: 30,
      horizontalSpeed: 150
    }
  }
});

//!====/ google chart configuration https://developers.google.com/chart/interactive/docs/gallery/areachart /====!//
google.charts.load('current', { 'packages': ['corechart'] });
google.charts.setOnLoadCallback(drawChart);

function drawChart() {
  var chartData = google.visualization.arrayToDataTable([
    // ['Time', 'Sensor Values'],
    [{ label: 'Time', type: 'datetime' }, { label: "Temp", type: 'number' }, { label: "Humid", type: 'number' }, { label: "Dirt", type: 'number' }],
    [new Date(2020, 9, 25), 30, 10, 200],
    [new Date(2020, 9, 26), 20, 26, 167],
  ]);

  var options = {
    title: 'My Chart',
    hAxis: { title: 'Year', titleTextStyle: { color: '#333' } },
    vAxis: { minValue: 0 },
    animation: { startup: true, duration: 1750, easing: 'out' },
    hAxis: { title: 'Time', titleTextStyle: { color: '#333' }, },
    vAxis: { title: 'Sensor Value', minValue: 0 },
    explorer: { axis: 'horizontal', keepInBounds: true, maxZoomIn: .05 },
  };

  var chart = new google.visualization.AreaChart(document.getElementById('chart_div'));
  chart.draw(chartData, options);

  //! in event data handle
  // data.addRows(sortDate);
  // chart.draw(data, options);
}


//!=======/when page load finish/=======!//
$(() => {
  socket.emit("regBrowser");
  fm.setPercentage(Number($(".hidWaterLevel").text()));
});

// TODO: <!-- Overlay Button still get error - PLEASE COMMMENT to FIX LATER -->
// (function () {
//   'use strict';

//   var $mainButton = $(".main-button"),
//     $closeButton = $(".close-button"),
//     $buttonWrapper = $(".button-wrapper"),
//     $layer = $(".layered-content");

//   $mainButton.on("click", function () {
//     $buttonWrapper.addClass("clicked").delay(900).queue(function (next) {
//       $layer.addClass("active");
//       next();
//     });
//   });

//   $closeButton.on("click", function () {
//     $layer.removeClass("active");
//     $buttonWrapper.removeClass("clicked");
//   });
// })();




// $('#startTime').change((data) => {
//   console.log(data.target.value)
// })

// $('#formGarden').submit((event) => {
//     event.preventDefault()
//     Swal.mixin({
//         toast: true,
//         position: 'top-end',
//         showConfirmButton: false,
//         timer: 3000,
//         timerProgressBar: true,
//     }).fire({
//         icon: 'success',
//         title: 'Import New Device Successfully'
//     })
// })
// $('#formGarden').submit((event) => {
//     event.preventDefault()
//     $.ajax({
//         url: '/devices/newDevices',
//         method: 'POST',
//         data: {
//             name: $('#formGarden').find("input[name='name']").val(),
//             locat: $('#formGarden').find("input[name='locat']").val(),
//             //TODO: ssid is <input> or <select>
//             ssid: $('#formGarden').find("input[name='ssid']").val(),
//             psk: $('#formGarden').find("input[name='psk']").val(),
//             baud: $('#formGarden').find("select[name='baud']").val(),
//             port: $('#formGarden').find("select[name='port']").val(),
//         },
//         success: (data, stt) => {
//             //TODO: b/c XHR so it cannot take res.download here
//             console.log(stt);
//         }
//     })
// })
