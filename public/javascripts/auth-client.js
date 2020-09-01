const socket = io();
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
            }).then(() => (location.href = "/home"));
          },
        });
      })
      .catch((err) => console.log(err));
  }
});

$("#authGoogle").click(() => {
  firebase
    .auth()
    .signInWithRedirect(new firebase.auth.GoogleAuthProvider())
    .then((result) => {
      console.log(result);
    })
    .catch((error) => console.log(error));
});
$("#authFacebook").click(() => {
  firebase
    .auth()
    .signInWithRedirect(new firebase.auth.FacebookAuthProvider())
    .then((result) => {
      console.log(result);
    })
    .catch((error) => console.log(error));
});
firebase
  .auth()
  .getRedirectResult()
  .then((result) => {
    let uid = result.user.uid; // TODO: risk here

    let idToken = result.credential.idToken;
    let displayName = result.user.displayName;

    $.ajax({
      url: "/auth/thirdParty",
      method: "POST",
      data: { idToken: uid },
      success: (customToken) => {
        firebase
          .auth()
          .signInWithCustomToken(customToken)
          .catch((error) => console.log(error));
      },
    });
  })
  .catch((err) => console.log(err));

$("#loginForm").submit((event) => {
  event.preventDefault();
  Swal.showLoading();

  let id = $("#loginForm").find("input[name='id']").val();
  let psk = $("#loginForm").find("input[name='psk']").val();

  // As httpOnly cookies are to be used, do not persist any state client side.
  // firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);

  // sign in
  firebase
    .auth()
    .signInWithEmailAndPassword(id, psk)
    .catch((error) => {
      Swal.fire({
        title: error,
        icon: "error",
      });

      // firebase.auth().createUserWithEmailAndPassword(id, psk)
      //     .then(() => {
      //         window.alert('Successfully Sign Up')
      //     }).catch(err => console.log(err))
    });
});
