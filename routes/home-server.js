const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');


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
            const userId = decodedClaims.uid;
            const gardenId = req.query.gardenId; // get from 

            // res.render("index");

            admin.database().ref(`Gardens/${userId}`).once("value", snapGarden1 => {
                admin.database().ref(`Gardens/${userId}/${gardenId}`).once("value", snapGarden2 => {
                    admin.database().ref(`Devices/${userId}/${gardenId}`).once("value", snapGarden3 => {

                        // if no garden in garden database
                        if (snapGarden1.val() == null) {
                            res.redirect("/devices");
                        }
                        // if pass null query
                        else if (snapGarden2.val() == null) {
                            let firstGardenId;
                            for (const gardenId in snapGarden1.val()) {
                                firstGardenId = gardenId;
                                break;
                            }
                            res.redirect(`/home?gardenId=${firstGardenId}`);
                        }
                        else {
                            res.render('home', {
                                objGardenInfo: snapGarden1,
                                arrDeviceInfo: snapGarden3,
                                detailGardenInfo: snapGarden2
                            });
                        }
                    })
                })
            })
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


//!==================/ SocketIO /==================!//
// let globIO;
// const ioFunc = (io) => {
//     globIO = io;
//     io.on('connection', socket => {
//         // get <browserUserId> from browser devices page <header.js>
//         socket.on("regBrowser", (browserUserId) => {
//             console.log(`[SocketIO] ${browserUserId} has join his own room`);
//             socket.join(`${browserUserId}`);
//         })
//     })
// }

// module.exports = {
//     router: router,
//     start: ioFunc
// }