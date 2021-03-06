
app = {
};

app.connecting = false;
app.device = false;
app.timer = false;


app.ALARM_SERVICE = "2BB10000-E8F2-537E-4F6C-D104768A1214";
app.ALARM_CHARACTERISTIC = "2BB10001-E8F2-537E-4F6C-D104768A1214"; 
app.ALARM_THRESHOLD = 2; // ALARM_THRESHOLD shall be 2 meter or less than height of person

var pubnub = new PubNub({
    subscribeKey: 'sub-c-81c369ca-5ba6-11e7-a298-0619f8945a4f', // always required
    publishKey: 'pub-c-6a7a7381-128c-4d9b-b3af-bbc4cc836ec8' // only required if publishing
});


app.initialize = function() {
	document.addEventListener(
		'deviceready',
		function() { evothings.scriptsLoaded(app.onDeviceReady) },
		false);
}

app.status = function(text) {
	if(app.oldStatus == text) return;
	app.oldStatus = text;
	console.log(text);
	document.getElementById("status").innerHTML = text;
}

app.onDeviceReady = function()
{
	app.status("Ready");
	app.onConnectButton();
}

app.onConnectButton = function() {
	if(app.device) return;
	evothings.easyble.stopScan();
	app.status("Scanning...");
	evothings.easyble.startScan(
		function(device) {
			if(app.connecting) return;

			if(app.isFlymouse(device)) {
				evothings.easyble.stopScan();
				app.connect(device);
			}
		},
		function(errorCode) {
			// Report error.
			callbackFun(null, errorCode);
		},
		{allowDuplicates:false}
	);
}

app.isFlymouse = function(device) {
	return device.name == "FLOOD";
}

app.disconnect = function() {
	if(app.timer) {
		clearInterval(app.timer);
		app.timer = false;
	}
	if(app.device) {
		app.device.close();
		app.device = false;
		app.status("Disconnected");
	}
}

app.connect = function(device) {
	app.disconnect();
	app.connecting = true;
	app.device = device;
	app.status("Connecting...");
	device.connect(
		function(device) {
			app.connecting = false;
			app.status("Reading services...");
			device.readServices(
				function(device) {
					app.startNotifications();
					},
				function(errorCode) {
					app.status("readServices error: "+errorCode);
				},
				{ serviceUUIDs: [app.ALARM_SERVICE] });
		},
		function(errorCode) {
			app.status("Connect error: "+errorCode);
		});
}

app.startNotifications = function() {
	 app.timer = window.setInterval(app.poll, 200);

}

app.poll = function() {
	app.device.readCharacteristic(app.ALARM_SERVICE, app.ALARM_CHARACTERISTIC,
		function(data) {
			app.status("Active");
			var w = new Int8Array(data);			
			// app.status(w[0]);
			waterlevel=w[0];
			var floodinfo_text="Water level is "+ waterlevel + "meters  now!";

			if (waterlevel > app.ALARM_THRESHOLD ){
				app.pubnubPublish();
					document.getElementById("floodinfo").innerHTML = floodinfo_text;
					document.getElementById("floodtype").src = "ui/images/flood_alarm.jpg";
				
			} else {
				document.getElementById("floodinfo").innerHTML = "Water level is low in Hogwarts now .	";
					document.getElementById("floodtype").src = "ui/images/floodno.jpg";			
			}

		},
		function(errorCode) {
			app.status("readCharacteristic error: "+errorCode);
		});
}

app.pubnubPublish= function(waterlevel) {
	  pubnub.publish(
    {
        message:  "flood",
        channel: 'flood_alarm_signal'
    },
    function (status, response) {
        if (status.error) {
            console.log(status)
        } else {
            console.log("message Published w/ timetoken", response.timetoken)
        }
    }
    );
}



app.initialize();
