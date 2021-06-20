# Platform IoTs

## Kiến trúc dự án

![architecture](public/images/architecture.png)

## Video Demo

[![DemoEveryThing](https://img.youtube.com/vi/Utt-vQB9MMk/0.jpg)](https://www.youtube.com/watch?v=Utt-vQB9MMk)

## Desktop Application (ElectronJS)

Kéo [source](https://github.com/spiderock98/PairDevice-ElectronApp) về tự build nha :)

## Website Demo

Truy cập bằng browser sẽ không có đầy đủ tính năng [spiderock.xyz](http://spiderock.xyz/)

## Deployment

### Raspberry Pi Zero W

1. Use Balena Etcher to flash img file | [Raspberry Pi OS with desktop](https://www.raspberrypi.org/software/operating-systems/)

2. Install NodeJS | [How to Run NodeJS on a Headless Raspberry Pi | desertbot.io](https://desertbot.io/blog/nodejs-git-and-pm2-headless-raspberry-pi-install)

3. Clone this project + add [secret keygen file json](https://console.firebase.google.com/u/0/project/pairdevices-e7bf9/settings/serviceaccounts/adminsdk)

4. Pi Zero W cannot run PM2 so run this code below `sudo nohup node app.js`

## Utilities

### Đổi IP tự động

`node .\utils\ChangeIP.js <YOUR_PUBLIC_IP>`

## Báo Cáo

- [Báo Cáo .docx](docs/word.docx)
- [Thuyết trình .pptx](docs/slide.pptx)

## Tác Giả

- Nguyễn Minh Tiến - [Facebook](https://www.facebook.com/spiderock98) | [Github](https://github.com/spiderock98)
- Phạm Chí Tâm - [Facebook](https://www.facebook.com/profile.php?id=100007889464843)
- Ngô Quốc Cường - [Facebook](https://www.facebook.com/Henry2901)
