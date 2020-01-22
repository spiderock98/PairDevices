const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

router.get('/', (req, res) => {
    const sessionCookie = req.cookies.session || '';
    
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

module.exports = router;