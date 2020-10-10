/*-------------------- Server Setup -------------------------*/
let PORT = process.env.PORT || 5000;
let express = require('express');
let app = express();

app.get('/', (req, res) => {
	// send normal http response, since this is not a website really
	res.send('app is running properly');
});

app.listen(PORT, () => {
	console.log('server started on port ' + PORT);
});
/*-----------------------------------------------------------*/

/*-------------------- DBs Setup ----------------------------*/
// firebase setup
const firebase = require("firebase-admin");
const serviceAccount = require("./service_account/adminsdk-water-project.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://waterqualitymonitoring-78716.firebaseio.com"
});

let firebaseDB = firebase.database();

// local database setup
let MyDatabase = require('./classes/sql-db');
let localDB = new MyDatabase();

// sqlite3 is a real pain when dealing with asynchronous action (can't insert values until tables are created)
localDB.createTables()
	.then((res) => {
		firebaseDB.ref('/users').on('child_added', (snapshot, prevChildKey) => {
			console.log(snapshot.val());
			localDB.setUpNewUserStates(snapshot.key);
		});
		firebaseDB.ref('/users').on('child_removed', (snapshot) => {
			localDB.removeUserData(snapshot.key);
		});
	})
	.catch((e) => {
		console.log(e);
	});

// im thinking, maybe I should create the structure like this:
// /users/{user}/{ username, password }
// /waterSamples/{user}/{ pH, orp, turbidity, temperature, created_at }
// /alarmParameters/{user}/{ pH_min, pH_max, orp_min, ... }
/*firebaseDB.ref('/users').on('value', (snapshot) => {
	if (snapshot.hasChildren()) { // i want to get the id's without downloading underlying data... it seems it can't be done
	}
});*/
/*-----------------------------------------------------------*/

// alarm manager setup
const AlarmManager = require('./classes/alarm-manager');
let alarmManager = new AlarmManager();

// mqtt setup
let mqtt = require('mqtt');
let mqttClient  = mqtt.connect('tcp://tailor.cloudmqtt.com:12475', { username: 'qgdwogpe', password: 'o01oeATc9wc2' });

mqttClient.on('connect', function () {
	console.log('successfully connected to mqtt server');
	mqttClient.subscribe('water/#', function (err) {
    if (err) {
		console.log('error subscribing to mqtt topic', err);
    }
  });
});

mqttClient.on('message', function (topic, message) {
	let user = topic.toString().split('/')[1];
	let water_sample = JSON.parse(message.toString());
	console.log('mqtt message from ' + user + ', ' + message.toString());
	
	let alarm_par;
	// connect to database with user and retrieve parameters
	firebaseDB.ref('/alarmParameters/' + user).once('value', (snapshot) => {
		if (snapshot.exists() && snapshot.hasChildren()) {
			alarm_par = snapshot.val();
		}
		else{
			// if user hasn't set any limits, no need to check state and send notifications
			return;
		}

		// start checking conditions
		let result = alarmManager.checkConditions(alarm_par, water_sample);
		if (result.status != 'OK') {
			// retrieve full row of flag states and compare it with flags var, ignore those that were already 'true'
			localDB.getParameterStates(user, (err, row) => {
				if (err || !row) {
					return; // peace out
				}
				let keys = Object.keys(result.flags); // result.flags = { pH, orp, turbidity, temperature }
				for (parameter_name of keys) {
					if (result.flags[parameter_name] == 1 && row[parameter_name] == 0) {
						// meaning if the state went from 0 to 1, send a notification (like pull up interruptions)
						localDB.insertAlarm(user, result.alarms[parameter_name]); // register alarm in local database
						alarmManager.sendNotification(firebaseDB, user, result.alarms[parameter_name]);
					}
				}
			});
		}

		localDB.setParameterStates(user, result.flags); // set the current state of the parameters
	});
});