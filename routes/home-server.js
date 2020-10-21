const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { exec } = require('child_process')
const fs = require('fs');
const path = require('path')


const getSnapGardensInfo = (userId) => {
    return new Promise(resolve => {
        admin.database().ref(`Gardens/${userId}`).once('value', snap => {
            resolve(snap)
        })
    })
}

router.get('/', (req, res) => {
    let sessionCookie = req.cookies.session || '';
    admin.auth().verifySessionCookie(sessionCookie, true)
        .then(decodedClaims => {
            getSnapGardensInfo(decodedClaims.uid)
                .then(snapGardensInfo => {
                    res.render('home', { snapGardensInfo: snapGardensInfo });
                })
        })
        .catch(error => {
            // Session cookie is unavailable or invalid. Force user to login.
            console.log(error);
            res.redirect('/devices');
        });
});

router.get("/dashboard", (req, res) => {
    let sessionCookie = req.cookies.session || '';
    admin.auth().verifySessionCookie(sessionCookie, true)
        .then(decodedClaims => {
            const userId = decodedClaims.uid;
            const gardenId = req.query.gardenId;
            admin.database().ref(`Gardens/${userId}/${gardenId}`).once("value", snapGardenId => {
                console.log(snapGardenId.val());
            })
            // res.render('home', {}); 
        })
        .catch(error => {
            // Session cookie is unavailable or invalid. Force user to login.
            console.log(error);
            res.redirect('/devices');
        });
});

router.post('/configTime', (req, res) => {
    const cookie = req.cookies.session || ""
    const { deviceName, startTime, midTime, endTime } = req.body;
    admin.auth().verifySessionCookie(cookie, true)
        .then((decodedClaims) => {
            admin.database().ref(`${decodedClaims.uid}/LocationNodes/${deviceName}`).update({
                startTime: `${startTime}`,
                midTime: `${midTime}`,
                endTime: `${reqendTime}`
            })
            res.end();
        })
})

module.exports = router;