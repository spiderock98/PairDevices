const socket = io();

// Initialize Firebase
firebase.initializeApp({
    apiKey: "AIzaSyAOJyhBMaqhJrTGX3XO7I2WF3kqgElOEM4",
    authDomain: "pairdevices-e7bf9.firebaseapp.com",
    databaseURL: "https://pairdevices-e7bf9.firebaseio.com",
    projectId: "pairdevices-e7bf9",
    storageBucket: "pairdevices-e7bf9.appspot.com",
    messagingSenderId: "979300938513",
    appId: "1:979300938513:web:45ee0e73b4bbfc953192b0"
});

// firebase.auth().signOut();

$('#loginForm').submit((event) => {
    event.preventDefault();

    let url = $('#loginForm').attr('action');
    let id = $('#loginForm').find("input[name='id']").val();
    let psk = $('#loginForm').find("input[name='psk']").val();

    // As httpOnly cookies are to be used, do not persist any state client side.
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);

    firebase.auth().signInWithEmailAndPassword(id, psk).then(() => {
        firebase.auth().onAuthStateChanged(user => {
            user.getIdToken().then(idToken => {
                // ajax form post to index-server
                $.ajax({
                    url: url,
                    method: 'POST',
                    data: { idToken: idToken },
                    success: (data, stt) => {
                        location.href = '/home';
                        
                        // $.ajax({
                        //     url: '/home',
                        //     method: 'GET',
                        //     success: 
                        //     // crossDomain: true,
                        //     // xhrFields: { withCredentials: true },
                        // });
                        
                    }
                })
            })
        })
    })
})