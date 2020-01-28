const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// no more cache
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

app.use('/', require('./routes/index-server'));
app.use('/home', require('./routes/home-server'));
app.use('/auth', require('./routes/auth-server'));

const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(require('./private-sdk-key.json')),
  databaseURL: "https://pairdevices-e7bf9.firebaseio.com"
});
// var db = admin.database();
// var ref = db.ref("demo");
// ref.on("value", function(snapshot) {
//   console.log(snapshot.val());
// });

const server = require('http').Server(app);
const io = require('socket.io')(server);
server.listen(80);

// class FirebaseDevices {
//   constructor(name = "", user = "", loc = "", network = "", stt = "") {
//     this.objInfo = new Object();
//     this.name = name;
//     this.objInfo['name'] = this.name;
//     this.user = user;
//     this.objInfo['user'] = this.user;
//     this.network = network;
//     this.objInfo['network'] = this.network;
//     this.stt = stt;
//     this.objInfo['stt'] = this.stt;
//     this.loc = loc;
//     this.objInfo['loc'] = this.loc;

//     console.log(this.objInfo);
//   }
// }

io.on('connection', socket => {
  socket.on('android', data => console.log(data))

  socket.on('nodemcu', data => {
    // add some info
    data['account'] = "";
    data['connected'] = false;

    console.log(data);
  });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;