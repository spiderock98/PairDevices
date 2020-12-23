const socket = io();

//!================/ MapInit onload /================!//
function initMultiMap() {
    configMap();
    addGardenMap();
}

// //!================/ VanillaWebsocket /================!//
// const WS_URL = "ws:///192.168.1.99:81";
// const ws = new WebSocket(WS_URL);

//!============/ init myCurrentUID as global scope variable  /===========!//
const getCurrentUID = () => {
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


//!==============/ map on add garden modal /===============!//
let addMap;
let service;
let infowindow;
let autocomplete;
const addGardenMap = () => {
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

    //================/ Listen click marker event /================//
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

        //============/ Return something onClick /============//
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

//todo: change this var name
const objDeviceName = $("div.card"); // list all card items
//!==============/ map on config device modal /================!//
function configMap() {
    for (let index = 0; index < objDeviceName.length; index++) {
        let varConfigMap = new google.maps.Map(document.getElementById(`configMap${index}`), {
            center: new google.maps.LatLng($(`#hidLatCoor${index}`).text(), $(`#hidLngCoor${index}`).text()),
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
        //!================/ Listen click marker event /================!//
        let markersArray = [];
        let tmpTitle = "";

        // clear marker on close modal
        $(".modal-footer > button.btnExit").on("click", () => {
            if (markersArray) {
                for (i in markersArray) {
                    markersArray[i].setMap(null);
                }
                markersArray.length = 0;
            }
        })
        // set default marker on open config modal
        $(`#btnConfig${index}`).on("click", () => {
            const defaultMarker = new google.maps.Marker({
                position: new google.maps.LatLng($(`#hidLatCoor${index}`).text(), $(`#hidLngCoor${index}`).text()),
                map: varConfigMap,
                animation: google.maps.Animation.BOUNCE,
            });
            markersArray.push(defaultMarker);
        })

        // on click my map
        google.maps.event.addListener(varConfigMap, "click", function (event) {
            // delete others overlays
            if (markersArray) {
                for (i in markersArray) {
                    markersArray[i].setMap(null);
                }
                markersArray.length = 0;
            }
            const marker = new google.maps.Marker({
                position: event.latLng,
                map: varConfigMap,
                animation: google.maps.Animation.BOUNCE,
            });
            markersArray.push(marker);

            //!============/ Return something onClick /============!//
            $(`#hidLatCoor${index}`).text(event.latLng.lat());
            $(`#hidLngCoor${index}`).text(event.latLng.lng());

            setTimeout(() => {
                $('div.poi-info-window .title').addClass(`addTitle${index}`);
                $('div.poi-info-window .title').removeClass("title");
                const locatTitle = $(`div.poi-info-window .addTitle${index}`).text();
                // destroy class for next search
                // $('div.poi-info-window .title').removeClass("title");

                const locatAdrr = $('div .address-line .full-width').text();
                // cusArr[index] = locatTitle;

                // var myArray = $('div.poi-info-window .title').get().map((el) => {
                //     console.log(el);
                //     return el;
                //     // console.log(el[0].innerText);
                //     // console.log(el["0"].innerText);
                // });
                // myArray.forEach(el => {
                //     // console.log(el[index].innerHTML);
                //     console.log(el.innerHTML);
                // });



                // function display(divs) {
                //     var a = [];
                //     for (var i = 0; i < divs.length; i++) {
                //         a.push(divs[i].innerHTML);
                //     }
                //     console.log(a);
                //     // $("span").text(a.join(" "));
                // }
                // display($('div.poi-info-window .title').get().reverse());


                if (tmpTitle != locatTitle) {
                    tmpTitle = locatTitle;
                    $(`#formConfig${index}`).find("input[name='gardenPlace']").val(locatTitle);
                }
                else {
                    $(`#formConfig${index}`).find("input[name='gardenPlace']").val("");
                }
            }, 10);
        });
    }
}

//!================/ Float button /================!//
// function floatBtnNewDevice() {
//     //? views/devices/modalNewDevice.ejs
//     $("#modalNewDevice").modal("toggle")
// }
function floatBtnNewGarden() {
    //? views/devices/modalNewGarden.ejs
    $("#modalNewGarden").modal("toggle")
}

//!============/ Others  /===========!//
let arrState = [];
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

    $(`#btnRemoveGarden${i}`).on("click", () => {
        const gardenId = $(`#gardenId${i}`).text().trim();
        const gardenName = $(`#gardenName${i}`).text();

        Swal.fire({
            title: "Are You Sủre ?",
            text: `You won't be able to revert this action will remove all DEVICES in this ${gardenName}!`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!",
        }).then((result) => {
            if (result.value) {
                $.ajax({
                    url: "/devices/removeGarden",
                    method: "POST",
                    data: { gardenId: gardenId },
                    success: () => {
                        Swal.fire(
                            "Deleted!",
                            `Your ${gardenName} has been deleted.`,
                            "success"
                        ).then(() => (location.href = "/devices"));
                    },
                });
            }
        });
    });


    // $(`#btnConfigure${i + 1}`).on("click", () => {
    //     deviceName = $(`#btnRemoveGarden${i}`)
    //         .siblings()
    //         .eq(2);

    //     $(`#btnTimeConfirm${i + 1}`).on("click", () => {
    //         // console.log('click');

    //         let objTimeConfig = {
    //             deviceName: deviceName[0].innerHTML,
    //             startTime: $(`#startTime${i + 1}`).val(),
    //             midTime: $(`#midTime${i + 1}`).val(),
    //             endTime: $(`#endTime${i + 1}`).val(),
    //         };

    //         $.ajax({
    //             type: "POST",
    //             url: "/home/configTime",
    //             data: objTimeConfig,
    //             success: () => {
    //                 socket.emit("timeConfig", {
    //                     uid: myCurrentUID,
    //                     physicalName: element.innerHTML,
    //                     platform: "browser",
    //                     timeObj: {
    //                         startTime: $(`#startTime${i + 1}`).val(),
    //                         midTime: $(`#midTime${i + 1}`).val(),
    //                         endTime: $(`#endTime${i + 1}`).val(),
    //                     },
    //                 });
    //             },
    //         });

    //         Swal.mixin({
    //             toast: true,
    //             position: "top-end",
    //             showConfirmButton: false,
    //             timer: 3000,
    //             timerProgressBar: true,
    //         }).fire({
    //             icon: "success",
    //             title: "Updated time successfully",
    //         });
    //     });
    // });
}