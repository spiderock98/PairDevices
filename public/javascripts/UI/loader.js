//!====/when a new site load => loader + slide 2 side when load finish/====!//
$(() => {
  "use strict";
  setTimeout(function () {
    $('div .container-fluid').addClass('loaded');
  }, 500);
}); // end of document ready


//!====/ when ajax START => loader in delay 20s timeout /====!//
const ajStart = () => {
  $('div .container-fluid').removeClass('loaded');
}