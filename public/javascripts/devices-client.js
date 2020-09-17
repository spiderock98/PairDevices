const socket = io();

//!================/VanillaWebsocket/================!//
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

    $(`#customSwitch${i + 1}`).on("change", () => {
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


    $(`#btnRemoveDevices${i + 1}`).on("click", () => {
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
                    url: "/home/removeDevices",
                    method: "POST",
                    data: { name: deviceName[0].innerHTML },
                    success: () => {
                        Swal.fire(
                            "Deleted!",
                            `Your ${deviceName[0].innerHTML} has been deleted.`,
                            "success"
                        ).then(() => (location.href = "/devices"));
                    },
                });
            }
        });
    });

    $(`#btnConfigure${i + 1}`).on("click", () => {
        deviceName = $(`#btnRemoveDevices${i + 1}`)
            .siblings()
            .eq(2);

        $(`#btnTimeConfirm${i + 1}`).on("click", () => {
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

$("#btnOut").on("click", () => {
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

$("#inputGroupSelectSSID").on("change", () => {
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

//!================/Float button/================!//
function floatNewGarden() {
    ;
}
function floatNewLocat() {
    $("#modalNewDevices").modal("toggle")
}