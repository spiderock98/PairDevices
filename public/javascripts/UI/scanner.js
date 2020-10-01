//? Embbedded in <devices.ejs>

// var video2 = document.createElement("video");
var blobImg = document.createElement("img");
//!================/ VanillaWebsocket /================!//
const WS_URL = "ws:///192.168.1.2:81";
const ws = new WebSocket(WS_URL);
let urlObj;
let arrB;
// let blobObj;
ws.onopen = () => console.log("[INFO] Connected to", WS_URL);
ws.onmessage = (payload) => {
    const arrBuffer = payload.data;
    arrB = payload.data;
    if (urlObj) {
        URL.revokeObjectURL(urlObj);
    }
    urlObj = URL.createObjectURL(new Blob([arrBuffer]));
    blobImg.src = urlObj;

    // blobObj = new Blob([arrBuffer]);
};


var video = document.createElement("video");
var canvasElement = document.getElementById("canvas");
var canvas = canvasElement.getContext("2d");
var loadingMessage = document.getElementById("loadingMessage");
var outputContainer = document.getElementById("output");
var outputMessage = document.getElementById("outputMessage");
var outputData = document.getElementById("outputData");

function drawLine(begin, end, color) {
    canvas.beginPath();
    canvas.moveTo(begin.x, begin.y);
    canvas.lineTo(end.x, end.y);
    canvas.lineWidth = 4;
    canvas.strokeStyle = color;
    canvas.stroke();
}

// Use facingMode: environment to attemt to get the front camera on phones
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(stream => {
        video.srcObject = stream;
        // video.src = urlObj;
        video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
        // video.play();
        requestAnimationFrame(tick);
    });

function tick() {
    loadingMessage.innerText = "⌛ Loading video..."
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        //? display video on canvas

        loadingMessage.hidden = true;
        canvasElement.hidden = false;
        outputContainer.hidden = false;

        canvasElement.height = video.videoHeight;
        canvasElement.width = video.videoWidth;
        // canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
        canvas.drawImage(blobImg, 0, 0, canvasElement.width, canvasElement.height);
        var imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
        //? try to find QR Image
        var code = jsQR(imageData.data, imageData.width, imageData.height, {
            // var code = jsQR(arrB, 320, 240, {
            inversionAttempts: "dontInvert",
        });
        //? if detect QR Image
        if (code) {
            //? retangle qrcode
            drawLine(code.location.topLeftCorner, code.location.topRightCorner, "#FF3B58");
            drawLine(code.location.topRightCorner, code.location.bottomRightCorner, "#FF3B58");
            drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF3B58");
            drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF3B58");

            outputMessage.hidden = true;
            outputData.parentElement.hidden = false;
            outputData.innerText = code.data;
            return;
        } else {
            outputMessage.hidden = false;
            outputData.parentElement.hidden = true;
        }
    }
    requestAnimationFrame(tick);
}