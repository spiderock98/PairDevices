const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

/* GET home page. */
router.get('/', function (req, res) {
  res.render('auth');
});

/* POST /auth thirdparty app token. */
router.post('/thirdParty', (req, res) => {
  let uid = req.body.idToken.toString();
  admin.auth().createCustomToken(uid).then((customToken) => {
    res.end(customToken);
  }).catch(error => console.log(error))
})

/* POST /auth token. */
router.post('/', (req, res) => {
  const idToken = req.body.idToken.toString();
  const expiresIn = 60 * 60 * 1000; // 60 min
  admin.auth().createSessionCookie(idToken, { expiresIn })
    .then(sessionCookie => {
      const options = { maxAge: expiresIn, httpOnly: true, secure: false };
      res.cookie('session', sessionCookie, options);
      res.end(JSON.stringify({ status: 'success' }));
    }, error => {
      console.error(error);
      res.status(401).send('UNAUTHORIZED REQUEST!');
    })
})

// router.post('/getCurrentUID', (req, res) => {
//   admin.auth().verifyIdToken(req.body.idToken).then(decodedToken => { res.end(decodedToken.uid) })
// })

router.post('/getCurrentUID', (req, res) => {
  let cookie = req.cookies.session || "";
  admin.auth().verifySessionCookie(cookie, true)
    .then((decodedClaims) => {
      res.end(decodedClaims.uid)
    })
    .catch(err => console.log(err))
})

router.post('/register', (req, res) => {
  admin.auth().createUser({
    email: req.body.email,
    password: req.body.password,
    displayName: req.body.displayName,
    emailVerified: false,
    disabled: false
  })
    .then(function (userRecord) {
      console.log('Successfully created new user:', userRecord.uid);
      res.send(userRecord.uid);
    })
    .catch(function (err) {
      console.error(err);
      res.send(err);
    });
})

module.exports = router;