const firebase = require("firebase-admin");
const Alarm = require("./alarm");

/**
 * AlarmManager handles the checking of conditions and sending notifications
 */
module.exports = class AlarmManager {
	constructor() {
	}

	/**
	* returns an object that states if any alarms should be called and contains a list of alarms that should be saved and send to the client
	*/
	checkConditions(alarm_par, sample) {
		let alarms = {}; // an object with named alarms: { pH, orp, turbidity, temperature } 
		
		// the state that will be updated depending in the result from checkConditions (true means that the parameter is activated (value is not normal))
		let flags = {
			pH: 0,
			orp: 0,
			turbidity: 0,
			temperature: 0
		};

		let status = 'OK';
		let time = new Date().getTime();
		
		// pH alarms
		let pH = sample.pH;
		if (alarm_par.hasOwnProperty('pH_min')) {
			if (pH < alarm_par['pH_min']) {
				status = 'ERROR';
				flags.pH = 1; // state of pH is up
				alarms.pH = new Alarm('pH', pH, time);
			}
		}
		if (alarm_par.hasOwnProperty('pH')) {
			if (pH > alarm_par['pH_max']) {
				status = 'ERROR';
				flags.pH = 1; // state of pH is up
				alarms.pH = new Alarm('pH', pH, time);
			}
		}
		
		// orp alarms
		let orp = sample.orp;
		if (alarm_par.hasOwnProperty('orp_min')) {
			if (orp < alarm_par['orp_min']) {
				status = 'ERROR';
				flags.orp = 1; // state of orp is up
				alarms.orp = new Alarm('orp', orp, time);
			}
		}
		if (alarm_par.hasOwnProperty('orp_max')) {
			if (orp > alarm_par['orp_max']) {
				status = 'ERROR';
				flags.orp = 1; // state of orp is up
				alarms.orp = new Alarm('orp', orp, time);
			}
		}

		// turbidity alarms
		let turbidity = sample.turbidity;
		if (alarm_par.hasOwnProperty('turbidity_min')) {
			if (turbidity < alarm_par['turbidity_min']) {
				status = 'ERROR';
				flags.turbidity = 1; // state of turbidity is up
				alarms.turbidity = new Alarm('turbidity', turbidity, time);
			}
		}
		if (alarm_par.hasOwnProperty('turbidity_max')) {
			if (turbidity > alarm_par['turbidity_max']) {
				status = 'ERROR';
				flags.turbidity = 1; // state of turbidity is up
				alarms.turbidity = new Alarm('turbidity', turbidity, time);
			}
		}

		// temperature alarms
		let temperature = sample.temperature;
		if (alarm_par.hasOwnProperty('temperature_min')) {
			if (temperature < alarm_par['temperature_min']) {
				status = 'ERROR';
				flags.temperature = 1; // state of temperature is up
				alarms.temperature = new Alarm('temperature', temperature, time);
			}
		}
		if (alarm_par.hasOwnProperty('temperature_max')) {
			if (temperature > alarm_par['temperature_max']) {
				status = 'ERROR';
				flags.temperature = 1; // state of temperature is up
				alarms.temperature = new Alarm('temperature', temperature, time);
			}
		}
		
		return {
			status,
			alarms,
			flags
		};
	}

	/**
	 * send push notification to android client
	 * @param  FirebaseDB db
	 * @param  Alarm alarm 
	 * @return void
	 */
	sendNotification(db, user, alarm) {
		db.ref('/users/' + user + '/registrationToken').once('value', (snap) => {
			if (snap.exists()) {
				let registrationToken = snap.val();
				let message = {
					data: {
						parameter: alarm.parameter,
						value: alarm.value.toString(),
						time: alarm.time.toString()
					}
				};
				let options = {
					priority: 'high',
					timeToLive: 60 * 60 * 24
				};
				
				firebase.messaging().sendToDevice(registrationToken, message, options)
					.then((res) => {
						console.log('notification was delivered successfully');
					})
					.catch((err) => {
						console.log('error sending notification', err);
					});
			}
		});
	}
}