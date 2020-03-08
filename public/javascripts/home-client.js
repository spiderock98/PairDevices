firebase.initializeApp({
  apiKey: "AIzaSyAOJyhBMaqhJrTGX3XO7I2WF3kqgElOEM4",
  authDomain: "pairdevices-e7bf9.firebaseapp.com",
  databaseURL: "https://pairdevices-e7bf9.firebaseio.com",
  projectId: "pairdevices-e7bf9",
  storageBucket: "pairdevices-e7bf9.appspot.com",
  messagingSenderId: "979300938513",
  appId: "1:979300938513:web:45ee0e73b4bbfc953192b0"
});

const socket = io();

function getCurrentUID() {
  return new Promise(resolve => {
    $.ajax({
      url: "/auth/getCurrentUID",
      method: "POST",
      success: (uid) => {
        resolve(uid)
      }
    })
  })
}
async function doWork() {
  hi = await getCurrentUID();
  console.log(hi);
}
doWork();

// socket.emit("socketType",
//   {
//     uid: await getCurrentUID(),
//     platform: "browser",
//     href: window.location.href,
//     value: 'hello nodemcu from chrome'
//   }
// );

// socket.on('message', data => console.log(data))
socket.on("message", data => console.log(data));

objDeviceName = $('td.dvName');

let arrState = ['off', 'off', 'off'];
for (let i = 0; i < objDeviceName.length; i++) {
  const element = objDeviceName[i];

  $(`#customSwitch${i + 1}`).change(() => {
    if (arrState[i] == 'off') {
      arrState[i] = 'on';
      socket.emit("socketType", { platform: "browser", state: 'on' });
      console.log(`ON ${element.innerHTML}`);
    }
    else {
      arrState[i] = 'off';
      socket.emit("socketType", { platform: "browser", state: 'off' });
      console.log(`OFF ${element.innerHTML}`);
    }
  });
}

$("#btnOut").click(() => {
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
//         url: '/home/newDevices',
//         method: 'POST',
//         data: {
//             name: $('#formDevice').find("input[name='name']").val(),
//             loc: $('#formDevice').find("input[name='loc']").val(),
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
