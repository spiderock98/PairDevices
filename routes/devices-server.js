const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
// const { exec } = require('child_process')
// const fs = require('fs');
// const path = require('path')

function getSnapshotCurrentDevice(uid) {
    return new Promise(resolve => {
        admin.database().ref(`${uid}/LocationNodes`).once('value', snap => {
            resolve(snap)
        })
    })
}


setTimeout(() => {
    // admin.database().ref(`Devices/bApb0Ypwg5YszGanWOBKre39zlg1/89fc1786-8104-4406-9149-3ec9bf89f034`).orderByKey().equalTo("this.deviceId").once('value')
    //     .then((snap) => {
    //         if (snap.val() == null) console.log(false);
    //         else console.log(true)
    //     })
}, 500);

//! big change here
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
    //! call this when need to edit information
    updateUser() {
        admin.database().ref(`/Users/${this.userId}`).update(this.objUserInfo)
    }
    //! GETTER
    get getObjUserInfo() { return this.objUserInfo; }
}
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
    //! call this when need to EDIT or ADD new garden
    updateGarden() {
        admin.database().ref(`Gardens/${this.userId}/${this.gardenId}`).update(this.objGardenInfo)
            .catch(err => console.error(err))
    }
    //! GETTER
    get getObjGardenInfo() { return this.objGardenInfo; }
}
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
    //! call this when need to EDIT or ADD new DEVICE
    updateDevice() {
        admin.database().ref(`Devices/${this.userId}/${this.gardenId}/${this.deviceId}`).update(this.objDeviceInfo)
            .catch(err => console.error(err))
    }
    //! GETTER
    get getObjDeviceInfo() { return this.objDeviceInfo; }
}

router.get('/', (req, res) => {
    let sessionCookie = req.cookies.session || '';
    admin.auth().verifySessionCookie(sessionCookie, true)
        .then(decodedClaims => {
            getSnapshotCurrentDevice(decodedClaims.uid)
                .then(snapDevices => {
                    res.render('devices', { snap: snapDevices });
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

router.post('/newDevices', (req, res) => {
    let cookie = req.cookies.session || "";
    admin.auth().verifySessionCookie(cookie, true)
        .then((decodedClaims) => {
            res.end()

            let name = req.body.name;
            let locat = req.body.locat;
            let latCoor = req.body.latCoor;
            let lngCoor = req.body.lngCoor;
            let ssid = req.body.ssid;
            let psk = req.body.psk;
            let baud = req.body.baud;
            let stt = 'pending'; // initial on pending state
            let user = decodedClaims.name || "";
            let email = decodedClaims.email || "";
            let port = req.body.port;
            let uid = decodedClaims.uid;
            const randomGardenId = uuidv4();
            const randomDeviceId = uuidv4();

            // TODO: warning on duplicate name
            // let device = new FirebaseUsers(uid, name, "22", "admin@google.com", "", "38B Go Cat");
            // device.isExistUserId().then(exist => {
            //     device.updateUser();
            //     console.log(device.getObjUserInfo);
            // })

            //TODO: res.end(gardenId)
            // let device = new FirebaseGardens(uid, randomGardenId, "Vuon Sau Rieng", "4D:5E:6F", "1.2.3.4", "5.6.7.8", "Lam Dong");
            // device.isExistUserId().then(exist => {
            //     device.updateGarden();
            //     console.log(device.getObjGardenInfo);
            // })

            //TODO: 
            // let device = new FirebaseDevices(uid, "89fc1786-8104-4406-9149-3ec9bf89f034", randomDeviceId, "Rainbow");
            // device.isExistDeviceId().then(exist => {
            //     device.updateDevice();
            //     console.log(device.getObjDeviceInfo);
            // })
        })
        .catch(err => console.error(err))
})

module.exports = router