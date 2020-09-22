const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
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
class FirebaseDevices {
    constructor(uid = "", name = "", user = "", locat = "", latCoor = "", lngCoor = "", ssid = "", psk = "", stt = "") {
        this.objInfo = new Object();

        this.name = name;
        this.user = user;
        this.locat = locat;
        this.latCoor = latCoor;
        this.lngCoor = lngCoor;
        this.ssid = ssid;
        this.psk = psk;
        this.uid = uid;

        // this.objInfo['network'] = { [this.ssid]: this.psk };

        this.objInfo['LocationNodes'] = { [this.name]: { locat: { place: this.locat, lat: this.latCoor, lng: this.lngCoor }, state: 'off' } };
    }
    pushNewDevice() {
        admin.database().ref(this.uid).set(this.objInfo)
            .catch(err => console.error(err))
    }
    isExistUID() {
        return new Promise(resolve => {
            admin.database().ref().orderByKey().equalTo(this.uid).once('value')
                .then((snap) => {
                    if (snap.val() == null) resolve(false)
                    else resolve(true)
                })
        })
    }
    updateMoreNode() {
        admin.database().ref(`${this.uid}/LocationNodes/${this.name}`).set({ locat: { place: this.locat, lat: this.latCoor, lng: this.lngCoor }, state: 'off' })
    }

    get objDeviceInfo() { return this.objInfo; }
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


            // TODO: warning on duplicate name
            let device = new FirebaseDevices(uid, name, user, locat, latCoor, lngCoor, ssid, psk, stt);
            device.isExistUID().then(exist => {
                if (exist) device.updateMoreNode();
                else device.pushNewDevice();
            })
        })
        .catch(err => console.log('[INFO] ', err))
})

module.exports = router