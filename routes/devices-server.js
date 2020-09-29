const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
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
            .catch(err => console.error(err))
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
                .then(snapGardensInfo => {
                    //? https://firebase.google.com/docs/reference/js/firebase.database.DataSnapshot#foreach
                    //? send {snapGardensInfo} to devices/tableListGarden.ejs
                    res.render('devices', { snapGardensInfo: snapGardensInfo });
                })
        })
        .catch(error => {
            // Session cookie is unavailable or invalid. Force user to login.
            console.error(error);
            res.redirect('/');
        });
});

router.post('/removeDevices', (req, res) => {
    let cookie = req.cookies.session || ""
    admin.auth().verifySessionCookie(cookie, true)
        .then(decodedClaims => {
            let uid = decodedClaims.uid
            admin.database().ref(`${uid}/LocationNodes/${req.body.name}`).remove(err => {
                if (err) console.error(err)
                else res.end();
            })
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
            // update garden info: required from FIREBASE >> render >> recieved from WEB
            const macAddr = req.body.macAddr || null;
            const latCoor = req.body.latCoor;
            const lngCoor = req.body.lngCoor;
            const place = req.body.place;

            let FirebaseGarden = new FirebaseGardens(userId, gardenId, gardenName, macAddr, latCoor, lngCoor, place);
            //? gửi kèm gardenId ? UPDATE : SET
            //? có thể check bằng isExistGardenId() nhưng móc API mất thời gian hơn check null
            if (gardenId == null) {
                arrPendingBrowser.push(userId);
                setTimeout(() => {
                    console.log('[objPendingGarden 1]', objPendingGarden);
                    console.log('[arrPendingBrowser 1]', arrPendingBrowser);
                    var flagSuccessfully = false;
                    for (const MAC in objPendingGarden) {
                        if (objPendingGarden[MAC].userId = userId) {
                            const myMac = objPendingGarden[MAC].macAddr;

                            FirebaseGarden.setMacAddr = myMac;
                            FirebaseGarden.setGardenId = myMac;
                            FirebaseGarden.updateGarden();

                            delete objPendingGarden[myMac]; // pop out
                            flagSuccessfully = true;
                        }
                    }
                    if (!flagSuccessfully) {
                        console.error("Time out, Failed to add garden");
                    }

                    // flush all
                    arrPendingBrowser.splice(arrPendingBrowser.indexOf(userId), 1)
                    res.end();
                    console.log('[objPendingGarden 2]', objPendingGarden);
                    console.log('[arrPendingBrowser 2]', arrPendingBrowser);

                }, 15000);
            }
            else {
                FirebaseGarden.updateGarden();
                res.end();
            }
        })
        .catch(err => console.error(err))
})

//!==================/ Route UPDATE & SET Device Slave /==================!//
router.post('/updateDevice', (req, res) => {
    let cookie = req.cookies.session || "";
    admin.auth().verifySessionCookie(cookie, true)
        .then((decodedClaims) => {
            res.end();

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
                FirebaseDevice.updateDevice();
            }
        })
        .catch(err => console.error(err))
})

//!==================/ SocketIO /==================!//
const io = (io) => {
    io.on('connection', socket => {
        socket.on('regEsp', (message) => {
            // console.log('[ESP]', "Hello world from ESP");
            // var objPendingGarden = {};
            // objPendingGarden['userId'] = message.UID
            // objPendingGarden['macAddr'] = message.MAC;
            // // objPendingGarden['flagAdded'] = false;
            // objPendingGarden['index'] = arrPendingGarden.length;
            // FirebaseDevices.staticIsExistGardenId(message.UID, message.MAC).then(flagExist => {
            //     if (!flagExist) arrPendingGarden.push(objPendingGarden);
            // })


            console.log('[ESP]', "Hello world from ESP");
            //? only update <objPendingGarden> if this <message.UID> not in Firebase && must be in <arrPendingBrowser>
            FirebaseDevices.staticIsExistGardenId(message.UID, message.MAC).then(flagExist => {
                if (!flagExist) {
                    var indexBrowser = arrPendingBrowser.indexOf(message.UID)
                    if (indexBrowser > -1) {
                        console.log('[ESP] are your browser wating for me');
                        objPendingGarden[message.MAC] = {
                            "userId": message.UID,
                            "gardenId": message.MAC, // equal MAC
                            "macAddr": message.MAC,
                            // "indexBrowser": indexBrowser
                        }
                    }
                }
                else {
                    //TODO: are you sure re-flash this device
                }
            })
            //TODO: send back to esp
        });
    })
}



module.exports = {
    router: router,
    start: io
}