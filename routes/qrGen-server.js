const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
var QRCode = require('qrcode');

/* GET home page */
router.get('/', function (req, res) {
    let sessionCookie = req.cookies.session || '';
    const text = req.query.text || "utc-hcmc";

    admin.auth().verifySessionCookie(sessionCookie, true)
        .then(decodedClaims => {
            admin.database().ref(`Gardens/${decodedClaims.uid}`).once("value", objGardenInfo => {
                admin.database().ref(`Devices/${decodedClaims.uid}`).once("value", snapGars => {
                    QRCode.toDataURL(text)
                        .then(url => {
                            res.render('qrGen', {
                                title: 'Simple QR Generator',
                                data: text,
                                qrURL: url,
                                objGardenInfo: objGardenInfo,
                                snapGars: snapGars
                            });
                        })
                        .catch(err => { console.error(err); })
                });
            });
        })
        .catch(error => {
            // Session cookie is unavailable or invalid. Force user to login.
            console.error(error);
            res.redirect('/');
        });


});
router.get('/getQR', (req, res) => {
    let sessionCookie = req.cookies.session;
    const text = req.query.text;
    admin.auth().verifySessionCookie(sessionCookie, true)
        .then(decodedClaims => {
            admin.database().ref(`Gardens/${decodedClaims.uid}`).once("value", objGardenInfo => {
                admin.database().ref(`Devices/${decodedClaims.uid}`).once("value", snapGars => {
                    QRCode.toDataURL(text)
                        .then(url => {
                            res.render('qrGen', {
                                title: 'Simple QR Generator',
                                data: text,
                                qrURL: url,
                                objGardenInfo: objGardenInfo,
                                snapGars: snapGars
                            });
                        })
                        .catch(err => { throw err })
                });
            });
        })
        .catch(error => {
            // Session cookie is unavailable or invalid. Force user to login.
            console.error(error);
            res.redirect('/');
        });
});

module.exports = router;
