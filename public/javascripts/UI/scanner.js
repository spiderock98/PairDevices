//? Embbedded in <devices.ejs>

var blobImg = document.createElement("img");
var video = document.createElement("video");
var canvasElement = document.getElementById("canvas");
var canvas = canvasElement.getContext("2d");
var loadingMessage = document.getElementById("loadingMessage");
var outputContainer = document.getElementById("output");
var outputMessage = document.getElementById("outputMessage");
var outputData = document.getElementById("outputData");
const btnReScan = document.getElementById("btnReScan");

//!================/ VanillaWebsocket /================!//
const WS_URL = "ws:///192.168.1.4:81";
const ws = new WebSocket(WS_URL);
let urlObj;
ws.onopen = () => console.log("[INFO] Connected to", WS_URL);
ws.onmessage = (payload) => {
    const arrBuffer = payload.data;
    if (urlObj) {
        URL.revokeObjectURL(urlObj);
    }
    urlObj = URL.createObjectURL(new Blob([arrBuffer]));
    blobImg.src = urlObj;
};

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
        canvas.drawImage(blobImg, 0, 0, canvasElement.width, canvasElement.height);
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
// function startStream() {
const startStream = () => {
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