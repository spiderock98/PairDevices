// const { default: Swal } = require("sweetalert2");

// const socket = io();
// let _UID;

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyAOJyhBMaqhJrTGX3XO7I2WF3kqgElOEM4",
  authDomain: "pairdevices-e7bf9.firebaseapp.com",
  databaseURL: "https://pairdevices-e7bf9.firebaseio.com",
  projectId: "pairdevices-e7bf9",
  storageBucket: "pairdevices-e7bf9.appspot.com",
  messagingSenderId: "979300938513",
  appId: "1:979300938513:web:45ee0e73b4bbfc953192b0",
});

//!================//automatically send ajax when onAuthStateChanged(user)//================!//
firebase.auth().signOut(); //!!!! IMPORTANT
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    Swal.showLoading();
    user
      .getIdToken()
      .then((idToken) => {
        $.ajax({
          url: "/auth",
          method: "POST",
          data: { idToken: idToken },
          success: (data, stt) => {
            Swal.fire({
              icon: "success",
              title: "Access Granted",
              allowOutsideClick: false
            }).then(() => (location.href = "/home"));
          },
        });
      })
      .catch((err) => {
        console.error(err);
        Swal.fire({
          title: err,
          icon: "error"
        })
      });
  }
});

$("#authGoogle").click(() => {
  firebase
    .auth()
    .signInWithRedirect(new firebase.auth.GoogleAuthProvider())
    .then((result) => {
      console.log(result);
    })
    .catch((err) => console.error(err));
});
$("#authFacebook").click(() => {
  firebase
    .auth()
    .signInWithRedirect(new firebase.auth.FacebookAuthProvider())
    .then((result) => {
      console.log(result);
    })
    .catch((err) => console.error(err));
});

firebase
  .auth()
  .getRedirectResult()
  .then((result) => {
    try {
      uid = result.user.uid; // TODO: risk here
      // let idToken = result.credential.idToken;
      // let displayName = result.user.displayName;
    } catch (err) { console.error("[INFO] return;", err); return; }
    $.ajax({
      url: "/auth/thirdParty",
      method: "POST",
      data: { idToken: uid },
      success: (customToken) => {
        firebase
          .auth()
          .signInWithCustomToken(customToken)
          .catch((error) => console.error(error));
      },
    });
  })
  .catch((err) => {
    console.error(err);
    Swal.fire({
      title: err,
      icon: "error",
    })
  });

$("#loginForm").submit((event) => {
  event.preventDefault();
  Swal.showLoading();

  let id = $("#loginForm").find("input[name='id']").val();
  let psk = $("#loginForm").find("input[name='psk']").val();

  // As httpOnly cookies are to be used, do not persist any state client side.
  // firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);

  //!=============//signInWithEmailAndPassword(id, psk) on client-side//==============!//
  firebase
    .auth()
    .signInWithEmailAndPassword(id, psk)
    .catch((error) => {
      Swal.fire({
        title: error,
        icon: "error",
        allowOutsideClick: false
      }).then(result => {
        // use regexp here
        if (result.value && (error.code.toString().match(/user/g) != null)) {
          Swal.fire({
            icon: 'question',
            confirmButtonText: 'Đăng ký tài khoản mới'
          }).then((result) => {
            if (result.value) {
              Swal.mixin({
                input: 'text',
                confirmButtonText: 'Next &rarr;',
                showCancelButton: true,
                progressSteps: ['1', '2', '3']
              }).queue([
                {
                  title: 'Email',
                  input: 'email',
                  inputPlaceholder: 'Enter your email address'
                },
                {
                  title: 'Mật Khẩu',
                  input: 'password',
                  inputPlaceholder: 'Enter your password'
                },
                {
                  title: 'Họ và Tên',
                  input: 'text',
                  inputValidator: txtDisplayName => {
                    if (!txtDisplayName) {
                      return 'You need to write something!'
                    }
                  }
                }
              ]).then((result) => {
                if (result.value) {
                  Swal.showLoading();
                  $.ajax({
                    method: "POST",
                    url: "/auth/register",
                    data: {
                      email: result.value[0],
                      password: result.value[1],
                      displayName: result.value[2]
                    },
                    success: (data) => {
                      switch (data.code) {
                        case "auth/email-already-exists":
                          Swal.fire({
                            title: "The provided email is already in use by an existing user. Each user must have a unique email",
                            text: "choose an other email address",
                            icon: "error",
                            showConfirmButton: false,
                            timer: 4000
                          })
                          break;

                        case "auth/invalid-password":
                          Swal.fire({
                            title: "The provided value for the password user property is invalid. It must be a string with at least 6 characters",
                            icon: "error",
                            showConfirmButton: false,
                            timer: 4000
                          })
                          break;

                        default:
                          location.href = "/home"
                          break;
                      }
                    }
                  })
                }
              })
            }
          })
        }
      })
    });
});
