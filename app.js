const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const app = express();
const livereload = require('livereload').createServer({
  exts: ['js', 'ejs', 'css']
});
livereload.watch(path.join(__dirname, 'public'));
livereload.watch(path.join(__dirname, 'views'));

app.set("port", process.env.PORT || 8880)
app.set("views", [path.join(__dirname, "views"), path.join(__dirname, "views", "devices"), path.join(__dirname, "views", "home")]);
app.set("view engine", "ejs");
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
//!====================//No More Cache//====================!//
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});
//!====================//Routes//====================!//
app.use("/", require("./routes/index-server"));
app.use("/home", require("./routes/home-server"));
app.use("/auth", require("./routes/auth-server"));
app.use("/devices", require("./routes/devices-server").router);
// app.use("/home", require("./routes/home-server").router);
//!====================//Firebase admin sdk config//====================!//
const admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert(
    require("./pairdevices-e7bf9-firebase-adminsdk-tvzye-107bb73eb8.json")
  ),
  databaseURL: "https://pairdevices-e7bf9.firebaseio.com",
});
//!====================/ SocketIO Middeware /====================!//
const server = require("http").Server(app);
const io = require("socket.io")(server);
server.listen(app.get("port"), () => {
  console.log(`Server started at: http://localhost:${app.get('port')}`);
});
//?========/ load consumer.js and pass it the socket.io object /========?//
require('./routes/devices-server.js').start(io);
// require('./routes/home-server.js').start(io);


io.on("connection", (socket) => {
  // from browser: onLoad() to put browser in to owm room
  // socket.on("regBrowser", () => {
  //   socket.join("browser");
  //   console.log("[INFO] Reg Browser Successful");
  // });
  // from esp8266: register new node to server
  // socket.on("regEsp", (data) => {
  //   // add some stuff
  //   data["account"] = "";
  //   data["connected"] = false;
  //   data["socketType"] = "NodeMCU";

  //   socket.join(data.UID); // put node socket into room
  //   console.log("[INFO] reg ESP8266 successfully");
  // });

  // from esp8266: sync virtual button state with physical button state
  socket.on("controller", (data) => {
    admin
      .database()
      .ref(`${data.uid}/LocationNodes/${data.physicalName}`)
      .update({
        state: `${data.state}`,
      });
    socket.to("browser").emit(`${data.physicalName}`, data.state); // sync custom switch state
  });

  socket.on("socketType", (data) => {
    if (data.platform == "browser") {
      socket.to(data.uid).emit(data.physicalName, `${data.state}`);
      admin
        .database()
        .ref(`${data.uid}/LocationNodes/${data.physicalName}`)
        .update({
          state: `${data.state}`,
        });
    }
  });

  let arrTimeConfig = {};
  socket.on("timeConfig", (data) => {
    let index = 0;
    Object.values(data.timeObj).forEach((element) => {
      // arrTimeConfig.push(element.substring(0, 2))
      // arrTimeConfig.push(element.substring(3))
      arrTimeConfig[index] = element.substring(0, 2);
      index += 1;
      arrTimeConfig[index] = element.substring(3);
      index += 1;
    });
    console.log(arrTimeConfig);

    socket.to(data.uid).emit(data.physicalName, arrTimeConfig);
  });

  socket.on("espcam", (img) => {
    console.log(img);
    // io.emit("espcam", img.data);
  });
});
//!====================//Error Handler//====================!//
app.use(function (req, res, next) {
  next(createError(404));
});
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
