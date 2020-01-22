const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

/* GET home page. */
router.get('/', function (req, res) {
  // res.render('index');
  const sessionCookie = req.cookies.session || '';
  admin.auth().verifySessionCookie(sessionCookie, true)
    .then(() => {
      res.redirect('/home');
    })
    .catch(error => {
      console.log(error);
      res.redirect('/auth');
    });
});

/* GET OUT. */
router.get('/sessionLogout', function (req, res) {
  res.clearCookie('session');
  res.redirect('/');
});

module.exports = router;