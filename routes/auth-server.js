const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

/* GET home page. */
router.get('/', function (req, res) {
  res.render('auth');
});

router.post('/thirdParty', (req, res) => {
  let uid = req.body.idToken.toString();

  admin.auth().createCustomToken(uid).then((customToken) => {
    // send back to client
    res.end(customToken);
  }).catch(error => console.log(error))
})

/* POST /auth page. */
router.post('/', (req, res) => {
  const idToken = req.body.idToken.toString();
  // 5 min
  const expiresIn = 10 * 60 * 1000;

  admin.auth().createSessionCookie(idToken, { expiresIn })
    .then(sessionCookie => {
      const options = { maxAge: expiresIn, httpOnly: true, secure: false };
      res.cookie('session', sessionCookie, options);
      res.end(JSON.stringify({ status: 'success' }));
    }, error => {
      console.log(error);
      res.status(401).send('UNAUTHORIZED REQUEST!');
    })
})

module.exports = router;