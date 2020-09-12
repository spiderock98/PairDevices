const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
// const { exec } = require('child_process')
// const fs = require('fs');
// const path = require('path')

function getSnapshotCurrentDevice(uid) {
    return new Promise(resolve => {
        admin.database().ref(`${uid}/DeviceNodes`).once('value', snap => {
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
                    res.render('devices', { snap: snapDevices });
                })
        })
        .catch(error => {
            // Session cookie is unavailable or invalid. Force user to login.
            console.error(error);
            res.redirect('/');
        });
});

module.exports = router