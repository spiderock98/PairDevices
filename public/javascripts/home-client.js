firebase.initializeApp({
    apiKey: "AIzaSyAOJyhBMaqhJrTGX3XO7I2WF3kqgElOEM4",
    authDomain: "pairdevices-e7bf9.firebaseapp.com",
    databaseURL: "https://pairdevices-e7bf9.firebaseio.com",
    projectId: "pairdevices-e7bf9",
    storageBucket: "pairdevices-e7bf9.appspot.com",
    messagingSenderId: "979300938513",
    appId: "1:979300938513:web:45ee0e73b4bbfc953192b0"
});

$("#btnOut").click(() => {
    firebase.auth().signOut()
    location.href = '/sessionLogout'; // to index-server
})