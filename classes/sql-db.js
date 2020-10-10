const sqlite3 = require('sqlite3');

module.exports = class MyDatabase {
	constructor() {
		this.db = this.setUp();
	}
	
	setUp() {
		return new sqlite3.Database('./alarms.db');
	}

	// think about making foreign keys with the remove functionality, maybe
	async createTables() {
		try {
			await this.createParameterStatesTable();
			await this.createAlarmsTable();
		} catch(e) {
			console.log(e);
		}
	}
	
	createParameterStatesTable() {
		// boolean is really just integer, just send 0 for false and 1 for true
		return new Promise((resolve, reject) => {
			this.db.run(`CREATE TABLE IF NOT EXISTS ParameterStates (
				StateId INTEGER PRIMARY KEY AUTOINCREMENT, 
				user VARCHAR NOT NULL, pH BOOLEAN NOT NULL, 
				orp BOOLEAN NOT NULL, 
				turbidity BOOLEAN NOT NULL, 
				temperature BOOLEAN NOT NULL
			)`, [], (err) => {
				if (err) {
					reject(err);
				}
				else {
					resolve();
				}
			});
		});
	}
	
	createAlarmsTable() {
		return new Promise((resolve, reject) => {
			this.db.run(`CREATE TABLE IF NOT EXISTS Alarms (
				AlarmId INTEGER PRIMARY KEY AUTOINCREMENT, 
				user VARCHAR NOT NULL, 
				parameter VARCHAR NOT NULL, 
				value VARCHAR NOT NULL, 
				created_at INTEGER NOT NULL
			)`, [], (err) => {
				if (err) {
					reject(err);
				}
				else {
					resolve();
				}
			});
		});
	}
	
	/**
	 * when a new user is detected by firebase this method is called to create a row for the new user
	 * @param String user
	 * @return void
	 */
	setUpNewUserStates(user) {
		console.log('adding user ' + user);
		this.db.run('INSERT INTO ParameterStates (user, pH, orp, turbidity, temperature) VALUES (?,?,?,?,?)', user, 0, 0, 0, 0);
	}

	/**
	 * remove data associated with the given user
	 * @param  String user
	 * @return void
	 */
	removeUserData(user) {
		console.log('removing user ' + user);
		//this.db.run('DELETE ...');
	}
	
	getParameterStates(user, callback) {
		this.db.get('SELECT * FROM ParameterStates WHERE user = ?', [user], callback);
	}
	
	setParameterStates(user, par) {
		this.db.run('UPDATE ParameterStates SET pH = ?, orp = ?, turbidity = ?, temperature = ? WHERE user = ?', par.pH, par.orp, par.turbidity, par.temperature, user);
	}

	insertAlarm(user, alarm) {
		this.db.run('INSERT INTO Alarms (user, parameter, value, created_at) VALUES (?,?,?,?)', user, alarm.parameter, alarm.value, alarm.time);
	}
}