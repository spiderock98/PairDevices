const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

/* GET home page. */
router.get('/', function (req, res) {
  res.render('auth');
});

/* POST auth page. */
router.post('/', (req, res) => {
  const idToken = req.body.idToken.toString();
  const expiresIn = 5 * 60 * 1000;

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