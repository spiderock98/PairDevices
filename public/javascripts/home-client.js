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
    location.href = '/sessionLogout'; // to index-server
})

// $("#formDevice").submit(event => {
//     event.preventDefault();

//     let name = $('#formDevice').find("input[name='name']").val();
//     let loc = $('#formDevice').find("input[name='loc']").val();
//     let ssid = $('#formDevice').find("input[name='ssid']").val();
//     let psk = $('#formDevice').find("input[name='psk']").val();

//     $.ajax({
//         method: 'POST',
//         url: '/home/newDevices',
//         data: {
//             name: name
//         }
//     })
// })