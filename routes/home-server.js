const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { exec } = require('child_process')
const fs = require('fs');
const path = require('path')


function getSnapshotCurrentDevice(uid) {
    return new Promise(resolve => {
        admin.database().ref(`${uid}/LocationNodes`).once('value', snap => {
            resolve(snap)
        })
    })
}

router.get('/', (req, res) => {
    let sessionCookie = req.cookies.session || '';
    admin.auth().verifySessionCookie(sessionCookie, true)
        .then(decodedClaims => {
            getSnapshotCurrentDevice(decodedClaims.uid)
                .then(snapDevices => {
                    res.render('home', { snap: snapDevices });
                })
        })
        .catch(error => {
            // Session cookie is unavailable or invalid. Force user to login.
            console.log(error);
            res.redirect('/');
        });
});

router.post('/configTime', (req, res) => {
    let cookie = req.cookies.session || ""
    admin.auth().verifySessionCookie(cookie, true)
        .then((decodedClaims) => {
            admin.database().ref(`${decodedClaims.uid}/LocationNodes/${req.body.deviceName}`).update({
                startTime: `${req.body.startTime}`,
                midTime: `${req.body.midTime}`,
                endTime: `${req.body.endTime}`
            })
            res.end();
        })
})

module.exports = router;