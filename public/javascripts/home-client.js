// firebase.initializeApp({
//   apiKey: "AIzaSyAOJyhBMaqhJrTGX3XO7I2WF3kqgElOEM4",
//   authDomain: "pairdevices-e7bf9.firebaseapp.com",
//   databaseURL: "https://pairdevices-e7bf9.firebaseio.com",
//   projectId: "pairdevices-e7bf9",
//   storageBucket: "pairdevices-e7bf9.appspot.com",
//   messagingSenderId: "979300938513",
//   appId: "1:979300938513:web:45ee0e73b4bbfc953192b0",
// });
const socket = io();

//!================/ MapInit onload /================!//
function initMultiMap() {
  initViewMap();
  initAddMap();
}
//?======/ map on add device modal /=======?//
let addMap;
let service;
let infowindow;
let autocomplete;
const initAddMap = () => {
  addMap = new google.maps.Map(document.getElementById("addMap"), {
    center: new google.maps.LatLng(10.769444, 106.681944),
    zoom: 9,
    fullscreenControl: false,
    keyboardShortcuts: false,
    mapTypeControl: false,
    panControl: false,
    rotateControl: false,
    scaleControl: false,
    streetViewControl: false,
    zoomControl: false,
  });

  //!================/ Listen click marker event /================!//
  let markersArray = [];
  let tmpTitle = "";

  google.maps.event.addListener(addMap, "click", function (event) {
    // delete others overlays
    if (markersArray) {
      for (i in markersArray) {
        markersArray[i].setMap(null);
      }
      markersArray.length = 0;
    }
    const marker = new google.maps.Marker({
      position: event.latLng,
      map: addMap,
      animation: google.maps.Animation.BOUNCE,
    });
    markersArray.push(marker);

    //!============/Return something onClick/============!//
    $("#hidLatCoor").text(event.latLng.lat());
    $("#hidLngCoor").text(event.latLng.lng());

    setTimeout(() => {
      const locatTitle = $('div .title').text();
      const locatAdrr = $('div .address-line .full-width').text();

      if (tmpTitle != locatTitle) {
        tmpTitle = locatTitle;
        $("#formGarden").find("input[name='locat']").val(locatTitle);
      }
      else {
        $("#formGarden").find("input[name='locat']").val("");
      }
    }, 10);
  });
}
//?======/ map on homepage /=======?//
var viewMap;
const initViewMap = () => {
  viewMap = new google.maps.Map(document.getElementById("viewMap"), {
    center: new google.maps.LatLng(10.769444, 106.681944),
    zoom: 9,
    fullscreenControl: false,
    keyboardShortcuts: false,
    mapTypeControl: false,
    panControl: false,
    rotateControl: false,
    scaleControl: false,
    streetViewControl: false,
    zoomControl: false,
  });
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
var video = document.createElement("video");
var canvasElement = document.getElementById("canvas");
var canvas = canvasElement.getContext("2d");
var loadingMessage = document.getElementById("loadingMessage");
var outputContainer = document.getElementById("output");
var outputMessage = document.getElementById("outputMessage");
var outputData = document.getElementById("outputData");
const btnReScan = document.getElementById("btnReScan");

function drawLine(begin, end, color) {
  canvas.beginPath();
  canvas.moveTo(begin.x, begin.y);
  canvas.lineTo(end.x, end.y);
  canvas.lineWidth = 4;
  canvas.strokeStyle = color;
  canvas.stroke();
}
function tick() {
  loadingMessage.innerText = "⌛ Loading video..."
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    loadingMessage.hidden = true;
    canvasElement.hidden = false;
    outputContainer.hidden = false;

    canvasElement.height = video.videoHeight;
    canvasElement.width = video.videoWidth;
    //? display video on canvas
    canvas.drawImage(imgFrame, 0, 0, canvasElement.width, canvasElement.height);
    var imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
    //? try to find QR Image
    var code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    //? ON detect QR Image
    if (code) {
      //? retangle qrcode
      drawLine(code.location.topLeftCorner, code.location.topRightCorner, "#FF3B58");
      drawLine(code.location.topRightCorner, code.location.bottomRightCorner, "#FF3B58");
      drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF3B58");
      drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF3B58");

      outputMessage.hidden = true;
      outputData.parentElement.hidden = false;
      outputData.innerText = code.data;


      console.log(code.data);
      stopStream();
      btnReScan.hidden = false;
      const objDeviceInfo = JSON.parse(code.data);
      console.log(objDeviceInfo);
      $("#formDevice").find("input[name='deviceId']").val(objDeviceInfo.deviceId);
      return;
    } else {
      outputMessage.hidden = false;
      outputData.parentElement.hidden = true;
    }
  }
  requestAnimationFrame(tick);
}
//? trigger when add new device
const startStream = () => {
  // ws.send(`[{"EVENT":"browserEnCam", "gardenId":"${}"}]`);
  ws.send(`[{"EVENT":"browserEnCam"}]`);
  btnReScan.hidden = true;
  // Use facingMode: environment to attemt to get the front camera on phones
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(Stream => {
      video.srcObject = Stream;
      video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
      requestAnimationFrame(tick);
    });
}
const stopStream = () => {
  video.srcObject.getTracks().forEach(track => track.stop());
}

$("#btnCloseDeviceModal").on("click", () => {
  stopStream();
})
$("#btnReScan").on("click", () => {
  startStream();
})
//!=======/when page load finish/=======!//
$(() => {
  socket.emit("regBrowser");

  setTimeout(() => {
    startStream();
  }, 2000);
});


//!============/ Others Script /===========!//

//!================/ Float button /================!//
function floatBtnNewDevice() {
  //? views/devices/modalNewDevice.ejs
  $("#modalNewDevice").modal("toggle")
}
function floatBtnNewGarden() {
  //? views/devices/modalNewGarden.ejs
  $("#modalNewGarden").modal("toggle")
}

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
