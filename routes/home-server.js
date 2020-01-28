const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

class FirebaseDevices {
    constructor(name = "", user = "", loc = "", ssid = "", psk = "", stt = "") {
        this.objInfo = new Object();

        this.name = name;
        this.objInfo['name'] = this.name;

        this.user = user;
        this.objInfo['user'] = this.user;

        this.objInfo['network'] = { 'ssid': ssid, 'psk': psk };

        this.stt = stt;
        this.objInfo['stt'] = this.stt;

        this.loc = loc;
        this.objInfo['loc'] = this.loc;
    }

    get objDeviceInfo() { return this.objInfo; }
}

router.get('/', (req, res) => {
    let sessionCookie = req.cookies.session || '';

    admin.auth().verifySessionCookie(sessionCookie, true)
        .then(decodedClaims => {
            // console.log(decodedClaims);
            res.render('home');
            // res.send('home herer')
        })
        .catch(error => {
            // Session cookie is unavailable or invalid. Force user to login.
            console.log(error);
            res.redirect('/');
        });
});

router.post('/newDevices', (req, res) => {
    let cookie = req.cookies.session || "";
    admin.auth().verifySessionCookie(cookie, true)
        .then((decodedClaims) => {
            let name = req.body.name;
            let loc = req.body.loc;
            let ssid = req.body.ssid;
            let psk = req.body.psk;
            let stt = 'pending'; // initial on pending state 
            let user = decodedClaims.name || "";
            let email = decodedClaims.email || "";

            let device = new FirebaseDevices(name, user, loc, ssid, psk, stt);
            admin.database().ref('/xxx').set(device.objDeviceInfo)
                .catch(error => console.log(error))
            res.redirect('/home');
        })
        .catch(error => res.redirect('/auth'))
})

module.exports = router;