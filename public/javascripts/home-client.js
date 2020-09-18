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

//!================//MapInit onload//================!//
var myMap;
function initMap() {
  myMap = new google.maps.Map(document.getElementById("myMap"), {
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

//!================//VanillaWebsocket//================!//
const WS_URL = "ws:///192.168.1.3:81";
const ws = new WebSocket(WS_URL);

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

//TODO: fix this Deprecated func()
$(document).ready(() => {
  socket.emit("regBrowser");
});

objDeviceName = $("td.dvName"); // list all items
// TODO: get database state
let arrState = new Array();
for (let i = 0; i < objDeviceName.length; i++) {
  const element = objDeviceName[i];

  socket.on(`${element.innerHTML}`, (btnState) => {
    if (btnState == "on") {
      $(`#customSwitch${i + 1}`).prop("checked", true);
      arrState[i] = "on";
    } else if (btnState == "off") {
      $(`#customSwitch${i + 1}`).prop("checked", false);
      arrState[i] = "off";
    }
  });

  $(`#customSwitch${i + 1}`).change(() => {
    if (arrState[i] == "off") {
      arrState[i] = "on";
      socket.emit("socketType", {
        uid: myCurrentUID,
        physicalName: element.innerHTML,
        platform: "browser",
        state: "on",
      });
    } else {
      arrState[i] = "off";
      socket.emit("socketType", {
        uid: myCurrentUID,
        physicalName: element.innerHTML,
        platform: "browser",
        state: "off",
      });
      // console.log(`OFF ${element.innerHTML}`);
    }
  });

  $(`#btnRemoveDevices${i + 1}`).on('click', () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.value) {
        deviceName = $(`#btnRemoveDevices${i + 1}`)
          .siblings()
          .eq(2);
        $.ajax({
          url: "/devices/removeDevices",
          method: "POST",
          data: { name: deviceName[0].innerHTML },
          success: () => {
            Swal.fire(
              "Deleted!",
              `Your ${deviceName[0].innerHTML} has been deleted.`,
              "success"
            ).then(() => (location.href = "/"));
          },
        });
      }
    });
  });

  $(`#btnConfigure${i + 1}`).click(() => {
    deviceName = $(`#btnRemoveDevices${i + 1}`)
      .siblings()
      .eq(2);

    $(`#btnTimeConfirm${i + 1}`).click(() => {
      // console.log('click');

      let objTimeConfig = {
        deviceName: deviceName[0].innerHTML,
        startTime: $(`#startTime${i + 1}`).val(),
        midTime: $(`#midTime${i + 1}`).val(),
        endTime: $(`#endTime${i + 1}`).val(),
      };

      $.ajax({
        type: "POST",
        url: "/home/configTime",
        data: objTimeConfig,
        success: () => {
          socket.emit("timeConfig", {
            uid: myCurrentUID,
            physicalName: element.innerHTML,
            platform: "browser",
            timeObj: {
              startTime: $(`#startTime${i + 1}`).val(),
              midTime: $(`#midTime${i + 1}`).val(),
              endTime: $(`#endTime${i + 1}`).val(),
            },
          });
        },
      });

      Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      }).fire({
        icon: "success",
        title: "Updated time successfully",
      });
    });
  });
}

$("#btnOut").on('click', () => {
  location.href = "/sessionLogout"; // to index-server
});

$("#show_hide_password a").on("click", () => {
  if ($("#show_hide_password input").attr("type") == "text") {
    $("#show_hide_password input").attr("type", "password");
    $("#show_hide_password i").addClass("fa-eye-slash");
    $("#show_hide_password i").removeClass("fa-eye");
  } else if ($("#show_hide_password input").attr("type") == "password") {
    $("#show_hide_password input").attr("type", "text");
    $("#show_hide_password i").removeClass("fa-eye-slash");
    $("#show_hide_password i").addClass("fa-eye");
  }
});

$("#inputGroupSelectSSID").change(() => {
  let ssid = document.getElementById("inputGroupSelectSSID").value;
  if (ssid == "Other") {
    $("#showhideInputTextSSID").removeClass("d-none");
    $("#showhideInputTextSSID").attr("name", "ssid");
    $("#inputGroupSelectSSID").removeAttr("name");
  } else {
    $("#showhideInputTextSSID").addClass("d-none");
    $("#showhideInputTextSSID").removeAttr("name");
    $("#inputGroupSelectSSID").attr("name", "ssid");
  }
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

// $('#formDevice').submit((event) => {
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
// $('#formDevice').submit((event) => {
//     event.preventDefault()
//     $.ajax({
//         url: '/devices/newDevices',
//         method: 'POST',
//         data: {
//             name: $('#formDevice').find("input[name='name']").val(),
//             locat: $('#formDevice').find("input[name='locat']").val(),
//             //TODO: ssid is <input> or <select>
//             ssid: $('#formDevice').find("input[name='ssid']").val(),
//             psk: $('#formDevice').find("input[name='psk']").val(),
//             baud: $('#formDevice').find("select[name='baud']").val(),
//             port: $('#formDevice').find("select[name='port']").val(),
//         },
//         success: (data, stt) => {
//             //TODO: b/c XHR so it cannot take res.download here
//             console.log(stt);
//         }
//     })
// })
