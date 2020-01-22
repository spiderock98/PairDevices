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

io.on('connection', socket => {
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