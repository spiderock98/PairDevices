// objEnCam = { gardenIdMac1: { arrCamBrow: [wsESP, wsBrowser, wsElectron, ...], uid: ownerUID,  state: 0, pingpong: true, arrQueue: [ { thrTemp: [uid, garId, dvId, valTemp] }, { thrGround: [uid, garId, dvId, valGround] }, {swrNho: 1/0}, {swTO: 1/0}, {delDeviceCmdFromBrow: 1} ...] } }

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

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
            },
            waterLevel: 0,
            status: 0
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
                ground: 10,
                threshold: {
                    ground: 700,
                    offsetGround: 200,
                    humid: 10,
                    temp: 10,
                }
            },
            controller: {
                kP: 1,
                kI: 2,
                kD: 3
            },
            dcMotor: {
                NhoGiot: 1,
                PhunSuong: 1,
                manual: 0
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
            admin.database().ref(`Gardens/${decodedClaims.uid}`).once("value", objGardenInfo => {
                admin.database().ref(`Devices/${decodedClaims.uid}`).once("value", snapGars => {
                    res.render('devices', {
                        objGardenInfo: objGardenInfo,
                        snapGars: snapGars
                    });
                });
            });
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
            admin.database().ref(`Gardens/${userId}/${gardenId}`).remove(err => {
                if (err) console.error(err)
                else admin.database().ref(`Devices/${userId}/${gardenId}`).remove(err => { if (err) console.error(err); })
            });
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
            const userId = decodedClaims.uid; // auto gen
            const gardenId = req.body.gardenId || null;
            const gardenName = req.body.gardenName;
            // new garden: required from APP or ESP
            // if want update garden info: required from FIREBASE >> render >> recieved from WEB
            const macAddr = req.body.macAddr || null;
            const latCoor = req.body.latCoor || null;
            const lngCoor = req.body.lngCoor || null;
            const place = req.body.place || null;

            var FirebaseGarden = new FirebaseGardens(userId, gardenId, gardenName, macAddr, latCoor, lngCoor, place);
            // gửi kèm gardenId ? UPDATE : SET
            // có thể check bằng isExistGardenId() nhưng móc API mất thời gian hơn check null
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
                            break;
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

                }, 15000);
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
            //TODO: validate duplicate or fake device
            const userId = decodedClaims.uid; // absolute
            const gardenId = req.body.gardenId; // absolute
            const deviceId = req.body.deviceId || null;
            const deviceName = req.body.deviceName; // required

            let slaveDevice = new FirebaseDevices(userId, gardenId, deviceId, deviceName);

            objEnCam[gardenId]["arrCamBrow"][0].send(`{"ev":"init","id":"${deviceId}"}`);
            //todo: fix this on() will on() many time >> once()
            objEnCam[gardenId]["arrCamBrow"][0].on("message", msg => {
                try {
                    const pay = JSON.parse(msg)[0];
                    if (pay.ev == "inOK") {
                        console.log("[NodeJS] new device was add to database");
                        slaveDevice.updateDevice();
                        res.end();
                    }
                } catch (error) {
                    ;
                }
            });

        })
        .catch(err => console.error(err))
});

//!==================/ Route Generate Report /==================!//
router.get("/genReport", (req, res) => {
    let cookie = req.cookies.session || "";
    admin.auth().verifySessionCookie(cookie, true)
        .then((decodedClaims) => {
            const qrUID = decodedClaims.uid;
            const qrGarId = req.query.garId;
            const qrDvId = req.query.dvId;

            var refLogT = admin.database().ref(`Devices/${qrUID}/${qrGarId}/${qrDvId}/sensor/logs/T`);
            var refLogH = admin.database().ref(`Devices/${qrUID}/${qrGarId}/${qrDvId}/sensor/logs/H`);
            var refLogG = admin.database().ref(`Devices/${qrUID}/${qrGarId}/${qrDvId}/sensor/logs/G`);
            refLogT.once("value", snapLogT => {
                refLogH.once("value", snapLogH => {
                    refLogG.once("value", snapLogG => {
                        res.json({ objLogT: snapLogT, objLogH: snapLogH, objLogG: snapLogG })
                    })
                })
            });
        })
});

router.get("/snapshot", (req, res) => {
    res.render("snapshot");
})
router.post("/snapshot", (req, res) => {
    const form = formidable({ multiples: true, uploadDir: path.join(__dirname, "../", "public", "images", "snapCard", "tmp") });
    form.parse(req, function (err, fields, files) {
        var oldpath = files.snapImg.path;
        var newpath = path.join(__dirname, "../", "public", "images", "snapCard", `${files.snapImg.name}.jpg`);
        fs.rename(oldpath, newpath, function (err) {
            if (err) { console.error(err); res.status(201).end(); }
            else { res.status(200).end(); }
        });
    });
});

//!==================/ SocketIO /==================!//
let globIO;
const ioFunc = (io) => {
    globIO = io;
    io.on('connection', socket => {
        //! when user click DELETE device button in table devices
        socket.on("delDV", ({ garId, dvId }) => {
            const socketCookie = socket.handshake.headers.cookie || '';
            admin.auth().verifySessionCookie(socketCookie.slice(8), true)
                .then((decodedClaims) => {
                    if (objEnCam.hasOwnProperty(garId)) {
                        objEnCam[garId]["arrCamBrow"][0].send(`{"ev":"dDV","id":"${dvId}"}`);
                        // add this update thresh command to queue
                        objEnCam[garId]["arrQueue"].push({ delDV: [decodedClaims.uid, garId, dvId] });
                    }
                })
        });

        //! when user click CHECK STATUS button in <modalTableDV.ejs>
        socket.on("checkDVStt", ({ garId }) => {
            const socketCookie = socket.handshake.headers.cookie || '';
            admin.auth().verifySessionCookie(socketCookie.slice(8), true)
                .then((decodedClaims) => {
                    //! send from <accordion.ejs>
                    if (typeof (garId) === 'object') {
                        if (objEnCam.hasOwnProperty(garId.garId)) {
                            objEnCam[garId.garId]["arrCamBrow"][0].send(`{"ev":"ckst","id":"${garId.dvId}"}`);
                        }
                    }
                    //! send from <modalTableDV.ejs>
                    else {
                        if (objEnCam.hasOwnProperty(garId)) {
                            admin.database().ref(`Devices/${decodedClaims.uid}/${garId}`).once("value", snapDv => {
                                var tmpArrCheckStt = [];
                                snapDv.forEach(lstDV => {
                                    tmpArrCheckStt.push(lstDV.key);
                                });

                                (function myLoop(i) {
                                    setTimeout(function () {
                                        //   code here
                                        objEnCam[garId]["arrCamBrow"][0].send(`{"ev":"ckst","id":"${tmpArrCheckStt[i - 1]}"}`);
                                        if (--i) myLoop(i);
                                    }, 1000)
                                })(tmpArrCheckStt.length);
                            });
                        }
                    }
                })
        });

        //! get <browserUserId> from browser devices page <header.js>
        socket.on("regBrowser", (browserUserId) => {
            console.log(`[SocketIO] ${browserUserId} has join his own room`);
            socket.join(`${browserUserId}`);
            // listener db sensor on change and send to BROWSER
            admin.database().ref(`Devices/${browserUserId}`).once("value", gardens => {
                gardens.forEach(lstGar => {
                    admin.database().ref(`Devices/${browserUserId}/${lstGar.key}`).once("value", devices => {
                        devices.forEach(lstDv => {
                            admin.database().ref(`Devices/${browserUserId}/${lstGar.key}/${lstDv.key}/sensor`).on("child_changed", logSensor => {
                                switch (logSensor.key) {
                                    case "ground":
                                        // send to accordion.ejs
                                        socket.emit(`lgG${lstDv.key}`, logSensor.val());
                                        break;

                                    case "DHT":
                                        admin.database().ref(`Devices/${browserUserId}/${lstGar.key}/${lstDv.key}/sensor/DHT`).on("child_changed", logDHT => {
                                            switch (logDHT.key) {
                                                case "temp":
                                                    // send to accordion.ejs
                                                    socket.emit(`lgT${lstDv.key}`, logDHT.val());
                                                    break;

                                                case "humid":
                                                    // send to accordion.ejs
                                                    socket.emit(`lgH${lstDv.key}`, logDHT.val());
                                                    break;
                                            }
                                        });
                                        break;
                                }
                            })

                            admin.database().ref(`Devices/${browserUserId}/${lstGar.key}/${lstDv.key}/dcMotor`).on("child_changed", mnState => {
                                if (mnState.key == "NhoGiot") {
                                    socket.emit(`lgMnStt${lstDv.key}`, mnState.val());
                                }
                            });
                        })
                    });
                })
            })
            admin.database().ref(`Gardens/${browserUserId}`).once("value", master => {
                master.forEach(lstMaster => {
                    admin.database().ref(`Gardens/${browserUserId}/${lstMaster.key}`).on("child_changed", waterLv => {
                        if (waterLv.key == "waterLevel") {
                            // send to home-client.js
                            socket.emit("wtlv", waterLv.val());
                        }
                    })
                })
            })
        })

        //! get ON/OFF động cơ tưới nước from <accordion.ejs> - switch NHỎ
        socket.on("manualStt", ({ gardenId, dvId, state }) => {
            const socketCookie = socket.handshake.headers.cookie || '';
            admin.auth().verifySessionCookie(socketCookie.slice(8), true)
                .then((decodedClaims) => {
                    const socketUID = decodedClaims.uid;
                    if (objEnCam.hasOwnProperty(gardenId)) {
                        objEnCam[gardenId]["arrCamBrow"][0].send(`{"ev":"mn","id":"${dvId}","st":${state}}`);
                        // add this update thresh command to queue
                        objEnCam[gardenId]["arrQueue"].push({ btnNho: [socketUID, gardenId, dvId, state] });
                    }
                })
        })

        //! get ON/OFF manual state from <accordion.ejs> - switch TO
        socket.on("customDC", ({ gardenId, dvId, state }) => {
            const socketCookie = socket.handshake.headers.cookie || '';
            admin.auth().verifySessionCookie(socketCookie.slice(8), true)
                .then((decodedClaims) => {
                    const socketUID = decodedClaims.uid;
                    // just update if esp32 is connected
                    if (objEnCam.hasOwnProperty(gardenId)) {
                        // objEnCam[gardenId]["arrCamBrow"][0].send(`{"ev":"manualMode","dvId":"${dvId}","type":"DC","state":${state}}`);
                        // objEnCam[gardenId]["arrCamBrow"][0].send(`{"ev":"manual","id":"${dvId}","type":"DC","mode":${state}}`);
                        objEnCam[gardenId]["arrCamBrow"][0].send(`{"ev":"isM","id":"${dvId}","st":${state}}`);
                        // add this update thresh command to queue
                        objEnCam[gardenId]["arrQueue"].push({ btnTo: [socketUID, gardenId, dvId, state] });
                    }
                    else
                        console.error("[Server] Cannot connect to esp32-cam. Check your connection");
                })
        });

        //! get threshold value from <accordion.ejs>
        socket.on("thresh", ({ type, gardenId, dvId, val }) => {
            const socketCookie = socket.handshake.headers.cookie || '';
            admin.auth().verifySessionCookie(socketCookie.slice(8), true)
                .then((decodedClaims) => {
                    const socketUID = decodedClaims.uid;
                    if (objEnCam.hasOwnProperty(gardenId)) {
                        if (type == "temp") {
                            objEnCam[gardenId]["arrCamBrow"][0].send(`{"ev":"thrT","id":"${dvId}","t":${val}}`);
                            // add this update thresh command to queue
                            objEnCam[gardenId]["arrQueue"].push({ thrTemp: [socketUID, gardenId, dvId, val] });
                        }
                        else if (type == "ground") {
                            objEnCam[gardenId]["arrCamBrow"][0].send(`{"ev":"thrG","id":"${dvId}","g":${val[0]},"ofs":${val[1]},"cs":${val[0] + val[1]}}`);
                            // add this update thresh command to queue
                            objEnCam[gardenId]["arrQueue"].push({ thrGround: [socketUID, gardenId, dvId, val] });
                        }
                    }
                    else
                        console.error("[Server] Cannot connect to esp32-cam. Check your connection");
                })
        })
    })
}

const WebSocket = require("ws");
let objEnCam = {};

// //!================/ OneMore WebSocket for gateway CAMERA sensor /================!//
const wsServerData = new WebSocket.Server({ port: 82 });
wsServerData.on("connection", wsCam => {
    let msgUIDcam, msgMACcam;

    wsCam.on("message", msg => {
        try {
            const payload = JSON.parse(msg)[0];
            switch (payload.ev) {
                case "espEnCamera":
                    msgUIDcam = payload.UID;
                    msgMACcam = payload.MAC;
                    //! add data to new objEnCam instance create below
                    objEnCam[payload.MAC]["arrCamBrow"].push(wsCam);
                    console.log("[wsCam]", objEnCam);
                    break;

                case "browserEnCam":
                    const browserRequestGardenId = payload.gardenId;
                    const browserRequestUserId = payload.userId;
                    console.log(`[Browser:82] We want to enable camera ${browserRequestGardenId}`);
                    // has property because esp-cam init this object
                    if (objEnCam.hasOwnProperty(browserRequestGardenId)) {
                        // just exec if <arrCamBrow> got ONLY camera ws in there at index 0
                        if (objEnCam[browserRequestGardenId]["arrCamBrow"].length == 2) {
                            if (objEnCam[browserRequestGardenId]["state"] == 0) {
                                objEnCam[browserRequestGardenId]["state"] = 1;
                                objEnCam[browserRequestGardenId]["arrCamBrow"].push(wsCam);
                                objEnCam[browserRequestGardenId]["arrCamBrow"][0].send('{"ev":"enC"}');
                                console.log(`[NodeJS][wsCam:82] request gateway EnableCamera ${browserRequestGardenId}`);
                            } else {
                                console.error("[INFO] Something Wrong !!!");
                            }
                        }
                        else if (objEnCam[browserRequestGardenId]["arrCamBrow"].length > 2) {
                            if (objEnCam[browserRequestGardenId]["state"] == 0) {
                                objEnCam[browserRequestGardenId]["state"] = 1;
                                objEnCam[browserRequestGardenId]["arrCamBrow"][0].send('{"ev":"enC"}');
                                console.log(`[NodeJS][wsCam:82] request gateway EnableCamera ${browserRequestGardenId}`);
                            }
                            if (objEnCam[browserRequestGardenId]["arrCamBrow"].includes(wsCam) == false)
                                objEnCam[browserRequestGardenId]["arrCamBrow"].push(wsCam);
                            else
                                console.log("[NodeJS] Oops, you reopen AddDevicesModal");
                        }
                        else if (objEnCam[browserRequestGardenId]["arrCamBrow"].length == 1) {
                            console.error(`[NodeJS] Sorry, Camera ${browserRequestGardenId} is not connect to server or not ready !!!`);
                            // emit to <header.ejs>
                            globIO.to(browserRequestUserId).emit("errBrowserEnCam", `Sorry, Camera ${browserRequestGardenId} is not connect to server or not ready. PLEASE PRESS RESET BUTTON ON GATEWAYs !!!`);
                        }
                    } else {
                        console.error(`[NodeJS] Sorry, Camera ${browserRequestGardenId} is not connect to server or not ready !!!`);
                        // emit to <header.ejs>
                        globIO.to(browserRequestUserId).emit("errBrowserEnCam", `Sorry, Camera ${browserRequestGardenId} is not connect to server or not ready. PLEASE PRESS RESET BUTTON ON GATEWAYs !!!`);
                    }
                    break;
            }
        } catch (error) {
            if (objEnCam.hasOwnProperty(msgMACcam)) {
                const arrSocket = objEnCam[msgMACcam]["arrCamBrow"];
                arrSocket.forEach((wsItem, index) => {
                    // The current state of the connection https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
                    if (wsItem.readyState === wsItem.OPEN) {
                        if (index > 1)
                            wsItem.send(msg);
                    } else {
                        // if camera is connected but cannot send msg to any browser
                        console.error("[Server] Socket Error >> POP...ing Error BROWSER");
                        arrSocket.splice(index, 1);
                        // check if only camera in <arrSocket>
                        if (arrSocket.length == 2) {
                            console.log('[Server] Sent <browserDisCam>');
                            objEnCam[msgMACcam]["arrCamBrow"][0].send('{"ev":"diC"}');
                            objEnCam[msgMACcam]["state"] = 0;
                        }
                    }
                });
            }
        }
    });
});

//!=======/ Vanilla WebSocket for DATA & enable/disable pair/repair ESP32-CAM /======!//
const wsServer = new WebSocket.Server({ port: 81 });
// let arrSocket = [];
wsServer.on("connection", ws => {
    // init some stuff if ESP submit <handShakeEnCam> event
    let msgUID, msgMAC;

    ws.on("message", msg => {
        //? try on sigle-regular event and catch on batch-camera event >> failed on JSON.parse
        try {
            const payload = JSON.parse(msg)[0];
            // event handler
            switch (payload.ev) {
                case "ckstOK":
                    globIO.to(msgUID).emit("ckstOK", payload.dvId);
                    break;

                case "wtlv":
                    // var wtlvRef = admin.database().ref(`Gardens/${payload.uId}/${payload.gId}`);
                    //todo: testing
                    var wtlvRef = admin.database().ref(`Gardens/${msgUID}/${msgMAC}`);
                    wtlvRef.once("value", (snap) => {
                        if (snap.numChildren()) {
                            wtlvRef.update({
                                waterLevel: payload.val
                            });
                        }
                    });
                    break;
                case "mns":
                    var nhogiotRef = admin.database().ref(`Devices/${msgUID}/${msgMAC}/${payload.dvId}/dcMotor`);
                    nhogiotRef.once("value", (snap) => {
                        if (snap.numChildren()) {
                            nhogiotRef.update({
                                NhoGiot: payload.val
                            });
                        }
                    });
                    break;

                case "thrOK":
                    objEnCam[msgMAC]["arrQueue"].forEach((objQueue, index) => {
                        if (objQueue.hasOwnProperty("thrTemp")) {
                            var tempThrRef = admin.database().ref(`Devices/${objQueue["thrTemp"][0]}/${objQueue["thrTemp"][1]}/${objQueue["thrTemp"][2]}/sensor/threshold`);
                            tempThrRef.once("value", (snap) => {
                                // just update db when everything is OK
                                if (snap.numChildren()) {
                                    tempThrRef.update({
                                        temp: objQueue["thrTemp"][3]
                                    })
                                        .then(() => {
                                            // pop queue out
                                            objEnCam[msgMAC]["arrQueue"].splice(index, 1);
                                        })
                                        .catch(err => { console.error(err); })
                                }
                            });
                        }
                        else if (objQueue.hasOwnProperty("thrGround")) {
                            var groundThrRef = admin.database().ref(`Devices/${objQueue["thrGround"][0]}/${objQueue["thrGround"][1]}/${objQueue["thrGround"][2]}/sensor/threshold`);
                            groundThrRef.once("value", (snap) => {
                                // just update db when everything is OK
                                if (snap.numChildren()) {
                                    groundThrRef.update({
                                        ground: objQueue["thrGround"][3][0],
                                        offsetGround: objQueue["thrGround"][3][1]
                                    })
                                        .then(() => {
                                            // pop queue out
                                            objEnCam[msgMAC]["arrQueue"].splice(index, 1);
                                        })
                                        .catch(err => { console.error(err); })
                                }

                            });
                        }
                        else if (objQueue.hasOwnProperty("btnNho")) {
                            var nhogiotRef = admin.database().ref(`Devices/${objQueue["btnNho"][0]}/${objQueue["btnNho"][1]}/${objQueue["btnNho"][2]}/dcMotor`);
                            nhogiotRef.once("value", (snap) => {
                                if (snap.numChildren()) {
                                    nhogiotRef.update({
                                        NhoGiot: objQueue["btnNho"][3]
                                    })
                                        .then(() => {
                                            // pop queue out
                                            objEnCam[msgMAC]["arrQueue"].splice(index, 1);
                                        })
                                        .catch(err => { console.error(err); })
                                }
                            })
                        }
                        else if (objQueue.hasOwnProperty("btnTo")) {
                            var manualRef = admin.database().ref(`Devices/${objQueue["btnTo"][0]}/${objQueue["btnTo"][1]}/${objQueue["btnTo"][2]}/dcMotor`);
                            manualRef.once("value", (snap) => {
                                // just update db when everything is OK
                                if (snap.numChildren()) {
                                    manualRef.update({
                                        manual: objQueue["btnTo"][3]
                                    })
                                        .then(() => {
                                            // pop queue out
                                            objEnCam[msgMAC]["arrQueue"].splice(index, 1);
                                        })
                                        .catch(err => { console.error(err); })
                                }
                            });
                        }
                    });
                    break;

                case "lgT":
                    var tempRef = admin.database().ref(`Devices/${msgUID}/${msgMAC}/${payload.dvId}/sensor/DHT`);
                    // prvent update trash things 
                    tempRef.once("value", (snap) => {
                        if (snap.numChildren()) {
                            tempRef.update({
                                temp: payload.val
                            });

                            // del DB if too many logs
                            var refLogT = admin.database().ref(`Devices/${msgUID}/${msgMAC}/${payload.dvId}/sensor/logs/T`);
                            refLogT.once("value", snapLogT => {
                                if (snapLogT.numChildren() > 10)
                                    refLogT.remove();
                            });
                            // log xlsl to DB
                            var now = Date.now();
                            var objLog = {};
                            objLog[now] = payload.val;
                            refLogT.update(objLog);
                        }
                    });
                    break;
                case "lgH":
                    var humidRef = admin.database().ref(`Devices/${msgUID}/${msgMAC}/${payload.dvId}/sensor/DHT`);
                    // prvent update trash things
                    humidRef.once("value", (snap) => {
                        if (snap.numChildren()) {
                            humidRef.update({
                                humid: payload.val
                            });

                            // del DB if too many logs
                            var refLogH = admin.database().ref(`Devices/${msgUID}/${msgMAC}/${payload.dvId}/sensor/logs/H`);
                            refLogH.once("value", snapLogH => {
                                if (snapLogH.numChildren() > 10)
                                    refLogH.remove();
                            });
                            // log xlsl to DB
                            var now = Date.now();
                            var objLog = {};
                            objLog[now] = payload.val;
                            refLogH.update(objLog);
                        }
                    });
                    break;
                case "lgG":
                    var groundRef = admin.database().ref(`Devices/${msgUID}/${msgMAC}/${payload.dvId}/sensor`);
                    // prvent update trash things 
                    groundRef.once("value", (snap) => {
                        if (snap.numChildren()) {
                            groundRef.update({
                                ground: payload.val
                            });

                            // del DB if too many logs
                            var refLogG = admin.database().ref(`Devices/${msgUID}/${msgMAC}/${payload.dvId}/sensor/logs/G`);
                            refLogG.once("value", snapLogG => {
                                if (snapLogG.numChildren() > 10)
                                    refLogG.remove();
                            });
                            // log xlsl to DB
                            var now = Date.now();
                            var objLog = {};
                            objLog[now] = payload.val;
                            refLogG.update(objLog);
                        }
                    });
                    break;

                case "delGar":
                    console.log(`[ESP32] we want to delete slave garden <${payload.dvId}> from garden <${msgMAC}>`);
                    admin.database().ref(`Devices/${msgUID}/${msgMAC}/${payload.dvId}`).remove(err => {
                        if (err) { console.error(err); }
                        else {
                            console.log("[NodeJS] Well done, see you later");

                            console.log(objEnCam[msgMAC]);
                            // if user delete garden using browser
                            if (objEnCam[msgMAC].hasOwnProperty("arrQueue")) {
                                objEnCam[msgMAC]["arrQueue"].forEach((objQueue, index) => {
                                    if (objQueue.hasOwnProperty("delDV")) {
                                        // pong back to browser
                                        globIO.to(objQueue["delDV"][0]).emit("delDvOK", objQueue);
                                        // pop queue out
                                        objEnCam[msgMAC]["arrQueue"].splice(index, 1);
                                    }
                                })
                            }

                            // pong back to device to EEPROM.update(1,0);
                            if (objEnCam.hasOwnProperty(msgMAC)) {
                                objEnCam[msgMAC]["arrCamBrow"][0].send(`{"ev":"delGarOK","id":"${payload.dvId}"}`);
                            }
                            else {
                                console.log("[Err] this device not exist in <objEnCam>");
                            }
                        }
                    })
                    break;

                case "std":
                    console.log("[ESP32]", payload.detail);
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
                                ws.send("{'ev':'regESP_OK'}", err => {
                                    if (err) throw err;
                                    else console.log("[Browser] confirm <regESP_OK>");
                                });
                            }
                            else {
                                console.log("[NodeJS] Please use web app to config new garden");
                            }
                            // ws.send("{'ev':'demo','status':'OK','code':'200'}");
                        }
                        else {
                            console.log("[NodeJS] are you sure re-flash this garden ? ");
                            admin.database().ref(`Gardens/${payload.UID}/${payload.MAC}`).remove(err => {
                                if (err) console.error(err);
                                else {
                                    admin.database().ref(`Devices/${payload.UID}/${payload.MAC}`).remove(err => {
                                        if (err) console.error(err);
                                        else {
                                            console.log("[Firebase] Complete delete this garden in database");
                                            ws.send('{"ev":"RESTART_ESP"}', err => {
                                                if (err) throw err;
                                                else console.log("[Server] request ESP to restart");
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    })
                    break;

                case "espEnCamera":
                    msgUID = payload.UID;
                    msgMAC = payload.MAC;
                    var refStatus = admin.database().ref(`Gardens/${msgUID}/${msgMAC}`);
                    refStatus.once("value", (snap) => {
                        if (snap.numChildren()) {
                            refStatus.update({
                                status: 1 // online
                            }, err => { if (err) console.log(err); });
                        }
                    });

                    //! create a new objEnCam instance
                    objEnCam[payload.MAC] = { "arrCamBrow": [ws], uid: msgUID, state: 0, pingpong: true, arrQueue: [] };
                    // listener pong back from esp32
                    ws.on("pong", () => {
                        if (objEnCam.hasOwnProperty(payload.MAC)) {
                            objEnCam[payload.MAC]["pingpong"] = true;
                        }
                    })
                    console.log("[ESP] here your camera data is available", objEnCam);
                    console.log("UID:", msgUID);
                    console.log("GardenID:", msgMAC);
                    break;

                //? TEST CASE:
                //=1. chưa có cam mà brow vào >> objEnCam chưa được khởi tạo
                //=2. có cam, current 0 brow, state ON/OFF mà có brow vào
                //=3. có cam; current 1,2,n brow; state ON/OFF mà có brow khác vào
                case "browserEnCam":
                    const browserRequestGardenId = payload.gardenId;
                    const browserRequestUserId = payload.userId;
                    console.log(`[Browser:81] We want to enable camera ${browserRequestGardenId}`);
                    // has property because esp-cam init this object
                    if (objEnCam.hasOwnProperty(browserRequestGardenId)) {
                        // just exec if <arrCamBrow> got ONLY camera ws in there at index 0
                        if (objEnCam[browserRequestGardenId]["arrCamBrow"].length == 1) {
                            if (objEnCam[browserRequestGardenId]["state"] == 0) {
                                objEnCam[browserRequestGardenId]["state"] = 1;
                                objEnCam[browserRequestGardenId]["arrCamBrow"].push(ws);
                                objEnCam[browserRequestGardenId]["arrCamBrow"][0].send('{"ev":"enC"}');
                                console.log(`[NodeJS][ws:81] request gateway EnableCamera ${browserRequestGardenId}`);
                            } else {
                                console.error("[INFO] Something Wrong !!!");
                            }
                        }
                        else if (objEnCam[browserRequestGardenId]["arrCamBrow"].length > 1) {
                            if (objEnCam[browserRequestGardenId]["state"] == 0) {
                                objEnCam[browserRequestGardenId]["state"] = 1;
                                objEnCam[browserRequestGardenId]["arrCamBrow"][0].send('{"ev":"enC"}');
                                console.log(`[NodeJS][ws:81] request gateway EnableCamera ${browserRequestGardenId}`);
                            }
                            if (objEnCam[browserRequestGardenId]["arrCamBrow"].includes(ws) == false)
                                objEnCam[browserRequestGardenId]["arrCamBrow"].push(ws);
                            else
                                console.log("[NodeJS] Oops, you reopen AddDevicesModal");
                        }
                    } else {
                        console.error(`[NodeJS] Sorry, Camera ${browserRequestGardenId} is not connect to server or not ready !!!`);
                        // emit to <header.ejs>
                        globIO.to(browserRequestUserId).emit("errBrowserEnCam", `Sorry, Camera ${browserRequestGardenId} is not connect to server or not ready !!!`);
                    }
                    break;

                default:
                    break;
            }
        } catch (error) {
            // console.error("[ERROR]:", error);
            if (objEnCam.hasOwnProperty(msgMAC)) {
                const arrSocket = objEnCam[msgMAC]["arrCamBrow"];
                arrSocket.forEach((wsItem, index) => {
                    // The current state of the connection https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
                    if (wsItem.readyState === wsItem.OPEN) {
                        wsItem.send(msg);
                    } else {
                        // if camera is connected but cannot send msg to any browser
                        console.error("[Server] Socket Error >> POP...ing Error BROWSER");
                        arrSocket.splice(index, 1);
                        // check if only camera in <arrSocket>
                        if (arrSocket.length == 1) {
                            console.log('[Server] Sent <browserDisCam>');
                            objEnCam[msgMAC]["arrCamBrow"][0].send('{"ev":"diC"}');
                            objEnCam[msgMAC]["state"] = 0;
                        }
                    }
                });
            }
        }
    })
    ws.on("close", (code) => {
        console.log("[INFO] socket closed code", code);
    })

    ws.on("error", (err) => {
        console.log("[WSerr]", err);
    })
})

//!  watchdog camera signal
setInterval(() => {
    for (const mac in objEnCam) {
        if (objEnCam.hasOwnProperty(mac)) {
            const el = objEnCam[mac];
            // check ping pong state
            if (el["pingpong"] == false) {
                console.error("[Server] Cannot recieve PONG from", mac);
                admin.database().ref(`Gardens/${el["uid"]}/${mac}`).update({
                    status: 0 // offline
                }, err => { if (err) console.log(err); });
                console.error("[Server] Socket Error >> POP...ing Error CAMERA");

                objEnCam[mac]["arrCamBrow"].forEach(elWs => {
                    elWs.send('{"ev":"RESTART_ESP"}');
                });
                //todo: send messgae log error to all browser before delete
                delete objEnCam[mac];
            }
            if (objEnCam.hasOwnProperty(mac)) {
                el["pingpong"] = false
                el["arrCamBrow"][0].ping();
            }

        }
    }
}, 15000);

//! watchdog update/change value from browser to esp32 then feedback to update database
setInterval(() => {
    for (const mac in objEnCam) {
        if (objEnCam.hasOwnProperty(mac)) {
            const el = objEnCam[mac];
            // if queue length != 0 then resend it to esp32
            if (el["arrQueue"].length) {
                console.log("[Sevrer] Queue got value >> Trying to resend to esp32");
                console.log(el["arrQueue"]);
                el["arrQueue"].forEach(objQueue => {
                    if (objQueue.hasOwnProperty("thrGround")) {
                        el["arrCamBrow"][0].send(`{"ev":"thrG","id":"${objQueue["thrGround"][2]}","g":${objQueue["thrGround"][3][0]},"ofs":${objQueue["thrGround"][3][1]},"cs":${objQueue["thrGround"][3][0] + objQueue["thrGround"][3][1]}}`);
                    }
                    else if (objQueue.hasOwnProperty("thrTemp")) {
                        el["arrCamBrow"][0].send(`{"ev":"thrT","id":"${objQueue["thrTemp"][2]}","t":${objQueue["thrTemp"][3]}}`);
                    }
                    else if (objQueue.hasOwnProperty("btnNho")) {
                        el["arrCamBrow"][0].send(`{"ev":"mn","id":"${objQueue["btnNho"][2]}","st":${objQueue["btnNho"][3]}}`);
                    }
                    else if (objQueue.hasOwnProperty("btnTo")) {
                        el["arrCamBrow"][0].send(`{"ev":"isM","id":"${objQueue["btnTo"][2]}","st":${objQueue["btnTo"][3]}}`);
                    }
                    else if (objQueue.hasOwnProperty("delDV")) {
                        el["arrCamBrow"][0].send(`{"ev":"dDV","id":"${objQueue["delDV"][2]}"}`)
                    }
                });
            }
        }
    }
}, 7500);


module.exports = {
    router: router,
    start: ioFunc
}