module.exports = {
  apps: [
    {
      name: "PairDeviceServer",
      script: "app.js",
      watch: true,
      time: true,
      ignore_watch: ["node_modules"],
    },
  ],
};
