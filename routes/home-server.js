const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { exec } = require('child_process')
const fs = require('fs');
const path = require('path')


class FirebaseDevices {
    constructor(name = "", user = "", loc = "", ssid = "", psk = "", stt = "") {
        this.objInfo = new Object();

        this.name = name;
        this.objInfo['name'] = this.name;

        this.user = user;
        this.objInfo['user'] = this.user;

        this.objInfo['network'] = { 'ssid': ssid, 'psk': psk };

        this.stt = stt;
        this.objInfo['stt'] = this.stt;

        this.loc = loc;
        this.objInfo['loc'] = this.loc;
    }

    get objDeviceInfo() { return this.objInfo; }
}

router.get('/', (req, res) => {
    let sessionCookie = req.cookies.session || '';
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

router.post('/newDevices', (req, res) => {
    let cookie = req.cookies.session || "";
    admin.auth().verifySessionCookie(cookie, true)
        .then((decodedClaims) => {
            let name = req.body.name;
            let loc = req.body.loc;
            let ssid = req.body.ssid;
            let psk = req.body.psk;
            let baud = req.body.baud;
            let stt = 'pending'; // initial on pending state 
            let user = decodedClaims.name || "";
            let email = decodedClaims.email || "";
            let port = req.body.port;

            let device = new FirebaseDevices(name, user, loc, ssid, psk, stt);
            admin.database().ref('/xxx').set(device.objDeviceInfo)
                .catch(err => console.log('[INFO] ', err))
        })
        .catch(err => console.log('[INFO] ', err))

    // let cookie = req.cookies.session || "";
    // admin.auth().verifySessionCookie(cookie, true)
    //     .then((decodedClaims) => {
    //         let name = req.body.name;
    //         let loc = req.body.loc;
    //         var ssid = req.body.ssid;
    //         var psk = req.body.psk;
    //         var baud = req.body.baud;
    //         let stt = 'pending'; // initial on pending state 
    //         let user = decodedClaims.name || "";
    //         let email = decodedClaims.email || "";
    //         let port = req.body.port;

    //         var buildFolder = `${path.join(process.cwd(), '/Arduino/ArduinoBuilder/')}`;
    //         var fileName = 'ArduinoBuilder.ino';
    //         var inoPath = `${path.join(buildFolder, `${fileName}`)}`;

    //         // fs.readFile('/Volumes/DATA/Desktop/Blink/Blink.ino', { encoding: 'utf-8' }, (err, data) => {
    //         fs.readFile(inoPath, { encoding: 'utf-8' }, (err, data) => {
    //             if (err) console.log(err)
    //             var oriData = data;
    //             var replaceData = oriData.replace('taikhoan', ssid);
    //             replaceData = replaceData.replace('matkhau', psk);
    //             fs.writeFile(inoPath, replaceData, (err) => {
    //                 if (err) console.log(err)
    //                 // TODO: set relative path
    //                 exec(`cd ${buildFolder} && /Applications/Arduino.app/Contents/Java/arduino-builder -compile -logger=machine -hardware /Applications/Arduino.app/Contents/Java/hardware -hardware /Users/spiderock/Library/Arduino15/packages -tools /Applications/Arduino.app/Contents/Java/tools-builder -tools /Applications/Arduino.app/Contents/Java/hardware/tools/avr -tools /Users/spiderock/Library/Arduino15/packages -built-in-libraries /Applications/Arduino.app/Contents/Java/libraries -libraries /Users/spiderock/Documents/Arduino/libraries -fqbn=esp8266:esp8266:nodemcuv2:xtal=80,vt=flash,exception=legacy,ssl=all,eesz=4M2M,led=2,ip=lm2f,dbg=Disabled,lvl=None____,wipe=none,baud=${baud} -vid-pid=0000_0000 -ide-version=10811 -build-path $(pwd)/build -warnings=none -build-cache $(pwd)/.cache -prefs=build.warn_data_percentage=75 -prefs=runtime.tools.xtensa-lx106-elf-gcc.path=/Users/spiderock/Library/Arduino15/packages/esp8266/tools/xtensa-lx106-elf-gcc/2.5.0-4-b40a506 -prefs=runtime.tools.xtensa-lx106-elf-gcc-2.5.0-4-b40a506.path=/Users/spiderock/Library/Arduino15/packages/esp8266/tools/xtensa-lx106-elf-gcc/2.5.0-4-b40a506 -prefs=runtime.tools.python3.path=/Users/spiderock/Library/Arduino15/packages/esp8266/tools/python3/3.7.2-post1 -prefs=runtime.tools.python3-3.7.2-post1.path=/Users/spiderock/Library/Arduino15/packages/esp8266/tools/python3/3.7.2-post1 -prefs=runtime.tools.mkspiffs.path=/Users/spiderock/Library/Arduino15/packages/esp8266/tools/mkspiffs/2.5.0-4-b40a506 -prefs=runtime.tools.mkspiffs-2.5.0-4-b40a506.path=/Users/spiderock/Library/Arduino15/packages/esp8266/tools/mkspiffs/2.5.0-4-b40a506 -prefs=runtime.tools.mklittlefs.path=/Users/spiderock/Library/Arduino15/packages/esp8266/tools/mklittlefs/2.5.0-4-69bd9e6 -prefs=runtime.tools.mklittlefs-2.5.0-4-69bd9e6.path=/Users/spiderock/Library/Arduino15/packages/esp8266/tools/mklittlefs/2.5.0-4-69bd9e6 -verbose $(pwd)/${fileName}`, (error, stdout, stderr) => {
    //                     console.log(`stdout: ${stdout}`);
    //                     console.error(`stderr: ${stderr}`);
    //                     if (error) {
    //                         console.log(error, '[INFO] Recovery .ino original')
    //                     }
    //                     else {
    //                         console.log('[INFO] Done Compiling')
    //                         // return binary file to front-end
    //                         res.download(`${path.join(buildFolder, '/build/', `${fileName}.bin`)}`, (err) => {
    //                             if (err) {
    //                                 console.log('[INFO] ', err)
    //                             }
    //                         })
    //                     }
    //                     // reset original file back for the next index and replace
    //                     fs.writeFile(inoPath, oriData, (err) => {
    //                         if (err) console.log(err)
    //                     })
    //                 })
    //             })
    //         })

    //         let device = new FirebaseDevices(name, user, loc, ssid, psk, stt);
    //         admin.database().ref('/xxx').set(device.objDeviceInfo)
    //             .catch(error => console.log(error))
    //         // res.redirect('/home');
    //     })
    //     .catch(error => {
    //         console.log('[INFO] ', error);
    //         res.redirect('/auth')
    //     })
})

module.exports = router;