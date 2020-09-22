$(() => {
  "use strict";
  setTimeout(function () {
    $('div .container-fluid').addClass('loaded');
  }, 10);
}); // end of document ready


//!====/when ajax START => loader in delay 20s timeout/====!//
const ajStart = () => {
  $('div .container-fluid').removeClass('loaded');
}

//!====/when a new site load => loader + slide 2 side when load finish/====!//
const ajStop = () => {
  let valTimeOut = 20000
  setTimeout(function () {
    $('body').addClass('loaded');
  }, valTimeOut);
  window.onload = function () {
    valTimeOut = 0;
  }
}