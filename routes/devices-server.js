const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
class Emitter extends require('events') { }
// const { exec } = require('child_process')
// const fs = require('fs');
// const path = require('path')


const getSnapGardensInfo = (userId) => {
    return new Promise(resolve => {
        admin.database().ref(`Gardens/${userId}`).once('value', snap => {
            resolve(snap)
        })
    })
}


//!==================/ Users Class /==================!//
class FirebaseUsers {
    constructor(userId, name, age, email, imgAvatar, address) {
        this.userId = userId; this.name = name; this.age = age; this.email = email; this.imgAvatar = imgAvatar; this.address = address;

        this.objUserInfo = {
            userId: this.userId,
            name: this.name,
            age: this.age,
            email: this.email,
            imgAvatar: this.imgAvatar,
            address: this.address
        }
    }
    isExistUserId() {
        return new Promise(resolve => {
            admin.database().ref('Users').orderByKey().equalTo(this.userId).once('value')
                .then((snap) => {
                    if (snap.val() == null) resolve(false)
                    else resolve(true)
                })
        })
    }
    // call this when need to edit information
    updateUser() {
        admin.database().ref(`/Users/${this.userId}`).update(this.objUserInfo)
    }
    // GETTER
    get getObjUserInfo() { return this.objUserInfo; }
}
//!==================/ Garden Master Class /==================!//
class FirebaseGardens extends FirebaseUsers {
    constructor(userId, gardenId, gardenName, macAddr, latCoor, lngCoor, place) {
        super(userId);
        this.gardenId = gardenId; this.gardenName = gardenName; this.macAddr = macAddr; this.latCoor = latCoor; this.lngCoor = lngCoor; this.place = place;

        this.objGardenInfo = {
            gardenId: this.gardenId,
            gardenName: this.gardenName,
            macAddr: this.macAddr,
            location: {
                place: this.place,
                latCoor: this.latCoor,
                lngCoor: this.lngCoor
            }
        }
    }
    isExistGardenId() {
        return new Promise(resolve => {
            admin.database().ref(`Gardens/${this.userId}`).orderByKey().equalTo(this.gardenId).once('value')
                .then((snap) => {
                    if (snap.val() == null) resolve(false)
                    else resolve(true)
                })
        })
    }
    static staticIsExistGardenId(userId, gardenId) {
        return new Promise(resolve => {
            admin.database().ref(`Gardens/${userId}`).orderByKey().equalTo(gardenId).once('value')
                .then((snap) => {
                    if (snap.val() == null) resolve(false)
                    else resolve(true)
                })
        })
    }
    // call this when need to EDIT or ADD new garden
    updateGarden() {
        admin.database().ref(`Gardens/${this.userId}/${this.gardenId}`).update(this.objGardenInfo)
            .catch(err => {
                console.error(err);
                return err;
            })
    }
    // GETTER & SETTER
    get getObjGardenInfo() { return this.objGardenInfo; }
    set setGardenId(gardenId) {
        this.gardenId = gardenId;
        this.objGardenInfo.gardenId = gardenId;
    }
    set setMacAddr(macAddr) {
        this.macAddr = macAddr;
        this.objGardenInfo.macAddr = macAddr;
    }
}
//!==================/ Device Slave Class /==================!//
class FirebaseDevices extends FirebaseGardens {
    constructor(userId, gardenId, deviceId, deviceName) {
        super(userId, gardenId);
        this.deviceId = deviceId; this.deviceName = deviceName;

        this.objDeviceInfo = {
            deviceId: this.deviceId,
            deviceName: this.deviceName,
            sensor: {
                DHT: {
                    humid: 60,
                    temp: 30,
                },
                WaterLevel: 4
            },
            controller: {
                kP: 1,
                kI: 2,
                kD: 3
            },
            dcMotor: {
                NhoGiot: 1,
                PhunSuong: 1
            }
        }
    }
    isExistDeviceId() {
        return new Promise(resolve => {
            admin.database().ref(`Devices/${this.userId}/${this.gardenId}`).orderByKey().equalTo(this.deviceId).once('value')
                .then((snap) => {
                    if (snap.val() == null) resolve(false)
                    else resolve(true)
                })
        })
    }
    // call this when need to EDIT or ADD new DEVICE
    updateDevice() {
        admin.database().ref(`Devices/${this.userId}/${this.gardenId}/${this.deviceId}`).update(this.objDeviceInfo)
            .catch(err => console.error(err))
    }
    // GETTER & SETTER
    get getObjDeviceInfo() { return this.objDeviceInfo; }
    set setDeviceId(deviceId) {
        this.deviceId = deviceId;
        this.objDeviceInfo.deviceId = deviceId;
    }
}

router.get('/', (req, res) => {
    let sessionCookie = req.cookies.session || '';
    admin.auth().verifySessionCookie(sessionCookie, true)
        .then(decodedClaims => {
            getSnapGardensInfo(decodedClaims.uid)
                .then(objGardenInfo => {
                    // https://firebase.google.com/docs/reference/js/firebase.database.DataSnapshot#foreach
                    res.render('devices', { objGardenInfo: objGardenInfo });
                })
        })
        .catch(error => {
            // Session cookie is unavailable or invalid. Force user to login.
            console.error(error);
            res.redirect('/');
        });
});

router.post('/removeGarden', (req, res) => {
    let cookie = req.cookies.session || ""
    admin.auth().verifySessionCookie(cookie, true)
        .then(decodedClaims => {
            res.end();
            const userId = decodedClaims.uid;
            const { gardenId } = req.body;
            console.log(`Gardens/${userId}/${gardenId}`);
            admin.database().ref(`Gardens/${userId}/${gardenId}`).remove(err => { if (err) console.error(err) });
            admin.database().ref(`Devices/${userId}/${gardenId}/`).remove(err => { if (err) console.error(err) });
        })
})

//!==================/ Route UPDATE User /==================!//
router.post('/updateUser', (req, res) => {
    const cookie = req.cookies.session || "";
    admin.auth().verifySessionCookie(cookie, true)
        .then((decodedClaims) => {
            res.end()

            const userId = decodedClaims.uid;
            const name = req.body.name || decodedClaims.name;
            const age = req.body.age || null;
            const email = req.body.age || decodedClaims.email || null;
            const imgAvatar = req.body.imgAvatar || null;
            const address = req.body.imgAvatar || null;

            // TODO: warning on duplicate name
            let FirebaseUser = new FirebaseUsers(userId, name, age, email, imgAvatar, address);
            FirebaseUser.updateUser();
        })
        .catch(err => console.error(err))
})

//!==================/ Route UPDATE or SET Garden Master /==================!//
// let arrPendingGarden = [];
let objPendingGarden = {};
let arrPendingBrowser = [];
router.post('/updateGarden', (req, res) => {
    const cookie = req.cookies.session || "";
    admin.auth().verifySessionCookie(cookie, true)
        .then((decodedClaims) => {
            // res.end();

            const userId = decodedClaims.uid; // auto gen
            const gardenId = req.body.gardenId || null;
            const gardenName = req.body.gardenName;
            // new garden: required from APP or ESP
            // if want update garden info: required from FIREBASE >> render >> recieved from WEB
            const macAddr = req.body.macAddr || null;
            const latCoor = req.body.latCoor || null;
            const lngCoor = req.body.lngCoor || null;
            const place = req.body.place || null;

            let FirebaseGarden = new FirebaseGardens(userId, gardenId, gardenName, macAddr, latCoor, lngCoor, place);
            //? gửi kèm gardenId ? UPDATE : SET
            //? có thể check bằng isExistGardenId() nhưng móc API mất thời gian hơn check null
            if (gardenId == null) {
                arrPendingBrowser.push(userId);
                console.log("[Browser] Waiting for New ESP-CAM");
                setTimeout(() => {
                    console.log('[objPendingGarden 1]', objPendingGarden);
                    console.log('[arrPendingBrowser 1]', arrPendingBrowser);
                    var flagSuccessfully = false;
                    for (const MAC in objPendingGarden) {
                        if (objPendingGarden[MAC].userId = userId) {
                            const myMac = objPendingGarden[MAC].macAddr; // take from esp

                            FirebaseGarden.setMacAddr = myMac;
                            FirebaseGarden.setGardenId = myMac;
                            FirebaseGarden.updateGarden();

                            delete objPendingGarden[myMac]; // pop out
                            flagSuccessfully = true;
                        }
                    }
                    if (!flagSuccessfully) {
                        console.error("[ERROR] Time out, Failed to add garden");
                    }

                    // flush all
                    arrPendingBrowser.splice(arrPendingBrowser.indexOf(userId), 1)
                    res.end();
                    console.log('[objPendingGarden 2]', objPendingGarden);
                    console.log('[arrPendingBrowser 2]', arrPendingBrowser);

                }, 30000);
            }
            else {
                const err = FirebaseGarden.updateGarden();

                // TODO: fix here never undefine though error
                if (err == undefined)
                    res.status(200).end("OK");
                else
                    res.status(200).end("Firebase Update Failed");
            }
        })
        .catch(err => {
            console.error(err);
            res.status(401).end("UNAUTHORIZED REQUEST!");
        })
})

//!==================/ Route UPDATE & SET Device Slave /==================!//
router.post('/updateDevice', (req, res) => {
    let cookie = req.cookies.session || "";
    admin.auth().verifySessionCookie(cookie, true)
        .then((decodedClaims) => {
            // res.end();

            //TODO: validate duplicate or fake device
            const userId = decodedClaims.uid; // absolute
            const gardenId = req.body.gardenId; // absolute
            const deviceId = req.body.deviceId || null;
            const deviceName = req.body.deviceName; // required
            const randDeviceId = uuidv4();

            let FirebaseDevice = new FirebaseDevices(userId, gardenId, deviceId, deviceName);
            if (deviceId == null) {
                FirebaseDevice.setDeviceId = randDeviceId;

                console.log(FirebaseDevice.getObjDeviceInfo);
                // FirebaseDevice.updateDevice();
            }
            else {
                objEnCam[gardenId]["arrCamBrow"][0].send(`{"EVENT":"regDV","strInitDeviceAddr":"${deviceId}"}`);
                objEnCam[gardenId]["arrCamBrow"][0].on("message", msg => {
                    try {
                        const pay = JSON.parse(msg)[0];
                        if (pay.EVENT == "initDvOK") {
                            FirebaseDevice.updateDevice();
                            res.end();
                        }
                    } catch (error) {
                        ;
                    }
                })
            }
        })
        .catch(err => console.error(err))
})

//!==================/ SocketIO /==================!//
let globIO;
const ioFunc = (io) => {
    globIO = io;
    io.on('connection', socket => {
        // get <browserUserId> from browser devices page <header.js>
        socket.on("regBrowser", (browserUserId) => {
            console.log(`[SocketIO] ${browserUserId} has join his own room`);
            socket.join(`${browserUserId}`);
        })
    })
}

//!================/ Vanilla WebSocket for enable/disable pair/repair ESP32-CAM /================!//
const WebSocket = require("ws");
const wsServer = new WebSocket.Server({ port: 81 });
// let arrSocket = [];
let objEnCam = {};
wsServer.on("connection", ws => {
    // init some stuff if ESP submit <handShakeEnCam> event
    let msgUID, msgMAC;

    ws.on("message", msg => {
        //? try on sigle-regular event and catch on batch-camera event >> failed on JSON.parse
        try {
            const payload = JSON.parse(msg)[0];
            //? event handler
            switch (payload.EVENT) {
                case "std":
                    console.log("[ESP]", payload.detail);
                    break;

                case "regESP":
                    console.log('[NodeJS]', `hey ESP32-CAM ${payload.MAC} want to pair`);
                    // only update <objPendingGarden> if this <payload.UID> not in Firebase && must be in <arrPendingBrowser>
                    FirebaseDevices.staticIsExistGardenId(payload.UID, payload.MAC).then(flagExist => {
                        if (!flagExist) {
                            // TODO: chuyen sang includes
                            var indexBrowser = arrPendingBrowser.indexOf(payload.UID)
                            if (indexBrowser > -1) {
                                console.log('[ESP] are your browser wating for me');
                                objPendingGarden[payload.MAC] = {
                                    "userId": payload.UID,
                                    "gardenId": payload.MAC, // equal MAC
                                    "macAddr": payload.MAC,
                                }
                                //TODO: not sure
                                ws.send("{'EVENT':'regESP_OK'}", err => {
                                    if (err) throw err;
                                    else console.log("[Browser] confirm <regESP_OK>");
                                });
                            }
                            else {
                                //TODO:
                                console.log("[NodeJS] Please use web app to config new garden");
                            }
                            // ws.send("{'EVENT':'demo','status':'OK','code':'200'}");
                        }
                        else {
                            //TODO: are you sure re-flash this garden
                            console.log("[NodeJS] are you sure re-flash this garden ? ");
                            admin.database().ref(`Gardens/${payload.UID}/${payload.MAC}`).remove(err => {
                                if (err) console.error(err);
                                else {
                                    console.log("[Firebase] Complete delete this garden in database");
                                    ws.send('{"EVENT":"RESTART_ESP"}', err => {
                                        if (err) throw err;
                                        else console.log("[Server] request ESP to restart");
                                    });
                                }
                            });
                        }
                    })
                    break;

                case "espEnCamera":
                    // init new array
                    console.log("[ESP] here your camera data is available");
                    msgUID = payload.UID;
                    msgMAC = payload.MAC;
                    objEnCam[payload.MAC] = { "arrCamBrow": [ws], state: 0 };
                    console.log(objEnCam);
                    break;

                //? TEST CASE:
                //=1. chưa có cam mà brow vào >> objEnCam chưa được khởi tạo
                //=2. có cam, current 0 brow, state ON/OFF mà có brow vào
                //=3. có cam; current 1,2,n brow; state ON/OFF mà có brow khác vào
                case "browserEnCam":
                    const browserRequestGardenId = payload.gardenId;
                    const browserRequestUserId = payload.userId;
                    console.log(`[Browser] We want to enable camera ${browserRequestGardenId}`);
                    // has property because esp-cam init this object
                    if (objEnCam.hasOwnProperty(browserRequestGardenId)) {
                        // just exec if <arrCamBrow> got ONLY camera ws in there at index 0
                        if (objEnCam[browserRequestGardenId]["arrCamBrow"].length == 1) {
                            if (objEnCam[browserRequestGardenId]["state"] == 0) {
                                objEnCam[browserRequestGardenId]["state"] = 1;
                                objEnCam[browserRequestGardenId]["arrCamBrow"].push(ws);
                                objEnCam[browserRequestGardenId]["arrCamBrow"][0].send('{"EVENT":"browserEnCam"}');
                            } else {
                                console.error("[INFO] Something Wrong !!!");
                            }
                        }
                        else if (objEnCam[browserRequestGardenId]["arrCamBrow"].length > 1) {
                            if (objEnCam[browserRequestGardenId]["state"] == 0) {
                                objEnCam[browserRequestGardenId]["state"] = 1;
                                objEnCam[browserRequestGardenId]["arrCamBrow"][0].send('{"EVENT":"browserEnCam"}');
                            }
                            if (objEnCam[browserRequestGardenId]["arrCamBrow"].includes(ws) == false)
                                objEnCam[browserRequestGardenId]["arrCamBrow"].push(ws);
                            else
                                console.log("[NodeJS] Oops, you reopen AddDevicesModal");
                        }
                    } else {
                        //TODO: return to brow
                        console.error(`[NodeJS] Sorry, Camera ${browserRequestGardenId} is not connect to server or not ready !!!`);
                        // emit to <header.ejs>
                        globIO.to(browserRequestUserId).emit("resBrowserEnCam", `Sorry, Camera ${browserRequestGardenId} is not connect to server or not ready !!!`);
                    }
                    break;

                default:
                    break;
            }
        } catch (error) {
            // console.error("[ERROR]:", error);
            const arrSocket = objEnCam[msgMAC]["arrCamBrow"];
            arrSocket.forEach((wsItem, index) => {
                // The current state of the connection https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
                if (wsItem.readyState === wsItem.OPEN) {
                    wsItem.send(msg);
                } else {
                    console.error("[Server] Socket Error >> POP...ing Error Socket");
                    arrSocket.splice(index, 1);
                    // check if only camera in <arrSocket>
                    if (arrSocket.length == 1) {
                        console.log('[Server] Sent <browserDisCam>');
                        objEnCam[msgMAC]["arrCamBrow"][0].send('{"EVENT":"browserDisCam"}');
                        objEnCam[msgMAC]["state"] = 0;
                    }
                }
            });
        }
    })
    ws.on("close", (code) => {
        console.log("[INFO] socket closed code", code);
        //TODO: if browser disconnect POP out it
        // const arrSocket = objEnCam["8C:AA:B5:8C:7F:7C"]["arrCamBrow"];
        // if (arrSocket.length == 1) {
        //     objEnCam["8C:AA:B5:8C:7F:7C"]["arrCamBrow"][0].send('{"EVENT":"browserDisCam"}');
        //     objEnCam["8C:AA:B5:8C:7F:7C"]["state"] = 0;
        // }
    })
    ws.on("error", (err) => {
        console.error(err);
    })
})



module.exports = {
    router: router,
    start: ioFunc
}