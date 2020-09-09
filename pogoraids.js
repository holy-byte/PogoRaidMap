AWS.config.region = 'eu-central-1'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
	IdentityPoolId: 'eu-central-1:9cb166ff-a84d-496c-bbb0-3ef306a6badf'
});


var activeRaids = new Map();
var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();


function httpGetAsync(theUrl, callback) {
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function() { 
		if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
			callback(xmlHttp.responseText);
	}
	xmlHttp.open("GET", theUrl, true); // true for asynchronous 
	xmlHttp.send(null);
}

function queryData() {

	var params = {
		TableName : "PogoRaids"/*,
		KeyConditionExpression: "#yr = :yyyy",
		ExpressionAttributeNames:{
			"#yr": "year"
		},
		ExpressionAttributeValues: {
			":yyyy":1985
		}*/
	};

	docClient.query(params, function(err, data) {
		if (err) {
			document.getElementById('textarea').innerHTML += "Unable to query. Error: " + "\n" + JSON.stringify(err, undefined, 2);
		} else {
			data.Items.forEach(function(movie) {
				document.getElementById('textarea').innerHTML += "\n" + movie.MsgId + ": " + movie.Gym.Latitude;
			});
		 
		}
	});
}

function scanData() {

	var params = {
		TableName: "PogoRaids"
	};

	docClient.scan(params, onScan);

	function onScan(err, data) {
		if (err) {
			//document.getElementById('textarea').innerHTML += "Unable to scan the table: " + "\n" + JSON.stringify(err, undefined, 2);
		} else {
			// Print all the movies
			//document.getElementById('textarea').innerHTML += "Scan succeeded: " + "\n";
			
			let listMsgId = [];
			
			data.Items.forEach(function(raidInfo) {
				
				listMsgId.push(raidInfo.MsgId);
				
				
				if (activeRaids.has(raidInfo.MsgId)) {
					let oldRaid = activeRaids.get(raidInfo.MsgId);
					if (JSON.stringify(oldRaid.raid) === JSON.stringify(raidInfo)) {
						//console.log("same raid ... continue");
						return; //continue;
					} else {
						//console.log("same raid with different values...");
						activeRaids.set(raidInfo.MsgId, {raid: raidInfo, marker: null, popup: null});
						
						if (oldRaid.marker != undefined) {
							mymap.removeLayer(oldRaid.marker);
						}
					}
				} else {
					activeRaids.set(raidInfo.MsgId, {raid:raidInfo, marker:null, popup:null});
				}
				
				
				var raidHtml = "";
				for (var i = 0; i < raidInfo.Participants.length; i++)
				{
					raidHtml += raidInfo.Participants[i].FullText.replace(raidInfo.Participants[i].Name, "<a href=" + raidInfo.Participants[i].Telegram + ">" + raidInfo.Participants[i].Name + "</a>") + "<br>";
				}
				
				var gymImg = "";
				switch(raidInfo.Pokemon.Tier) {
					case "1":
						gymImg = "1.png";
						break;
					case "3":
						gymImg = "3.png";
						break;
					case "M":
						gymImg = "mega.png";
						break;
					default:
						gymImg = "5.png";
				}
				
				// Calc Endtime
				let hour = (raidInfo.TimeInterval.EndTime.charAt(0) - '0') * 10;
				hour += raidInfo.TimeInterval.EndTime.charAt(1) - '0';
				
				let minute = (raidInfo.TimeInterval.EndTime.charAt(3) - '0') * 10;
				minute += raidInfo.TimeInterval.EndTime.charAt(4) - '0';
				
				let dateEnd = new Date(Date.now());
				dateEnd.setHours(hour);
				dateEnd.setMinutes(minute);
				
				// Calc StartTime
				hour = (raidInfo.TimeInterval.StartTime.charAt(0) - '0') * 10;
				hour += raidInfo.TimeInterval.StartTime.charAt(1) - '0';
				
				minute = (raidInfo.TimeInterval.StartTime.charAt(3) - '0') * 10;
				minute += raidInfo.TimeInterval.StartTime.charAt(4) - '0';
				
				let dateStart = new Date(Date.now());
				dateStart.setHours(hour);
				dateStart.setMinutes(minute);
				

				document.getElementById("raidpintemplate").getElementsByClassName("timers")[0].setAttribute("data-raidid", raidInfo.MsgId);
				document.getElementById("raidpintemplate").getElementsByClassName("raidpin_img")[0].src=gymImg;
				document.getElementById("raidpintemplate").getElementsByClassName("remainingtext")[0].setAttribute("data-seconds", (dateEnd - Date.now())/1000 );
				document.getElementById("raidpintemplate").getElementsByClassName("remainingtext")[0].setAttribute("data-opentime", dateStart.toISOString());
				document.getElementById("raidpintemplate").getElementsByClassName("remainingtext")[0].setAttribute("data-endtime", dateEnd.toISOString());
				
				if (typeof raidInfo.ScheduleTime.StartTime != "undefined") {
					// Calc ScheduleTime
					hour = (raidInfo.ScheduleTime.StartTime.charAt(0) - '0') * 10;
					hour += raidInfo.ScheduleTime.StartTime.charAt(1) - '0';
					
					minute = (raidInfo.ScheduleTime.StartTime.charAt(3) - '0') * 10;
					minute += raidInfo.ScheduleTime.StartTime.charAt(4) - '0';
					
					let dateSchedule = new Date(Date.now());
					dateSchedule.setHours(hour);
					dateSchedule.setMinutes(minute);
					
					document.getElementById("raidpintemplate").getElementsByClassName("scheduletext")[0].setAttribute("data-scheduletime", dateSchedule.toISOString());
				} else {
					document.getElementById("raidpintemplate").getElementsByClassName("scheduletext")[0].setAttribute("data-scheduletime", 0);
				}
				
				if ( document.getElementById("raidpintemplate").getElementsByClassName("remainingtext")[0].classList.contains('raid_poke') ) {
					document.getElementById("raidpintemplate").getElementsByClassName("remainingtext")[0].classList.remove('raid_poke');
				}
				
				if (dateStart > Date.now()) {
					document.getElementById("raidpintemplate").getElementsByClassName("remainingtext")[0].classList.add('raid_egg');
					document.getElementById("raidpintemplate").getElementsByClassName("remainingtext")[0].setAttribute("data-seconds", (dateStart - Date.now())/1000 );
				} else if (dateEnd > Date.now()) {
					document.getElementById("raidpintemplate").getElementsByClassName("remainingtext")[0].classList.add('raid_poke');
					document.getElementById("raidpintemplate").getElementsByClassName("remainingtext")[0].setAttribute("data-seconds", (dateEnd - Date.now())/1000 );
				} else {
					return;
				}
				
				//document.getElementById('textarea').innerHTML += raidInfo.MsgId + ": " + raidInfo.Pokemon.FullTextName + " - rating: " + raidInfo.Pokemon.GuideUrl + "\n";
				let raidIcon = L.divIcon({
					className: 'raidpin',
					html: document.getElementById("raidpintemplate").innerHTML,
					iconAnchor: [28, 59],
					popupAnchor: [-5, -58]
				});
				let tempGym = L.marker([raidInfo.Gym.Latitude, raidInfo.Gym.Longitude], {icon: raidIcon}).addTo(mymap);
				
				activeRaids.get(raidInfo.MsgId).marker = tempGym;
				
				let textJoinTelegram = "<b>Entra no grupo de telegram <a href=\"https://t.me/joinchat/K6A9ERf_MemUhNfOCYM0mw\">PoGo Raids Espinho</a>.</b>";
				let textPokemon = raidInfo.Pokemon.GuideUrl ? "<a href=" + raidInfo.Pokemon.GuideUrl + ">" + raidInfo.Pokemon.Name + "</a>" : raidInfo.Pokemon.Name;
				
				tempGym.bindPopup(raidInfo.Pokemon.FullTextName.replace(raidInfo.Pokemon.Name, "<b>" + textPokemon + "</b>") + 
								(raidInfo.Pokemon.FullTextCP ? " [ " + raidInfo.Pokemon.FullTextCP + " ]" : "" )+ "<br>" + 
								raidInfo.Gym.FullText.replace(raidInfo.Gym.GymName, "<a href=" + raidInfo.Gym.MapUrl + ">" + raidInfo.Gym.GymName + "</a>") + "<br>" +
								"🕓 " + (raidInfo.ScheduleTime.FullText ? "Marcada para as <b><u>" + raidInfo.ScheduleTime.StartTime + "</b></u><br>" : "") +
								"<i>Aberta das <b>" + raidInfo.TimeInterval.StartTime + "</b> às <b>" + raidInfo.TimeInterval.EndTime + "</b></i><br>" +
								"📢" + " <i>" + (raidInfo.Organizer.IsOrganized == 0 ? "Anunciada por " : "Organizada por ") + "<a href=" + raidInfo.Organizer.Telegram + ">" + raidInfo.Organizer.Name + "</a></i><br>" +
								(raidInfo.Lobby.FullText ? raidInfo.Lobby.FullText + "<br>" : "") +
								raidHtml +
								(raidInfo.FooterText ? "<br><b>Queres marcar presença nesta raid?</b><br>" + textJoinTelegram : "<br><b>Queres organizar esta raid?</b><br>" + textJoinTelegram));
				
				/*tempGym.bindTooltip("my tooltip text", {
					offset: [0, -30],
					direction: 'center',
					permanent: true,
					sticky: false
				}).openTooltip();*/

			});
			
			activeRaids.forEach((value,key,map)=> {
				if (!listMsgId.includes(key)) {
					
					let currentMarker = value.marker;
			
					if (currentMarker != undefined) {
						mymap.removeLayer(currentMarker);
					}
					
					activeRaids.delete(key);
					//console.log("deleted " + key);
				}
			});

			// Continue scanning if we have more gyms (per scan 1MB limitation)
			if (typeof data.LastEvaluatedKey != "undefined") {
				params.ExclusiveStartKey = data.LastEvaluatedKey;
				docClient.scan(params, onScan);            
			}
		}
	}
}


//httpGetAsync('https://sheets.googleapis.com/v4/spreadsheets/17BNgN1ocvtBQevhmhJZIEoYyPiLSa9MTw4_alq8KVfg/values/A:C?key=AIzaSyDwR5K6Y4N28ZBx7wnUIcatbdK2zzoOYD4', fillMap)

// TIMER COUNTDOWN CALLBACK
setInterval(function(){ 
	
	let pinDivList = document.getElementsByClassName("timers");
	
	for(let i = 0; i < pinDivList.length; i++)
	{
		if (pinDivList[i].parentElement.id == "raidpintemplate") { continue; }
		
		let scheduleDiv = pinDivList[i].getElementsByClassName("scheduletext")[0];
		let remainDiv = pinDivList[i].getElementsByClassName("remainingtext")[0];
		let raidId = pinDivList[i].getAttribute("data-raidid");
		
		let openTime = new Date(remainDiv.getAttribute("data-opentime"));
		let endTime = new Date(remainDiv.getAttribute("data-endtime"));
		
		let secondsLeft = 0;
		
		if (openTime > Date.now()) {
			secondsLeft = (openTime - Date.now()) / 1000;
		} else if (endTime > Date.now()) {
			secondsLeft = (endTime - Date.now()) / 1000;
			if (remainDiv.classList.contains('raid_egg')) { 
				//pinDivList[i].classList.remove('raid_egg');
				//pinDivList[i].classList.add('raid_poke');
				remainDiv.classList.replace('raid_egg', 'raid_poke');
			}
		} else {
			let currentMarker = activeRaids.get(raidId).marker;
			
			if (currentMarker != undefined) {
				mymap.removeLayer(currentMarker);
			}
			
			activeRaids.delete(raidId);
			
			continue;
		}

		let min = Math.floor(secondsLeft / 60);
		let sec = Math.floor(secondsLeft % 60);
		if (min < 10) { min = "0" + min; }
		if (sec < 10) { sec = "0" + sec; }
		remainDiv.textContent = min + ":" + sec ;
		
		let scheduleTime = new Date(scheduleDiv.getAttribute("data-scheduletime"));
		
		if (scheduleTime > Date.now()) {
			
			if (remainDiv.classList.contains('timer_round')) { 
				remainDiv.classList.replace('timer_round', 'timer_flattop');
			}
			
			secondsLeft = (scheduleTime - Date.now()) / 1000;
			min = Math.floor(secondsLeft / 60);
			sec = Math.floor(secondsLeft % 60);
			if (min < 10) { min = "0" + min; }
			if (sec < 10) { sec = "0" + sec; }
			scheduleDiv.textContent = min + ":" + sec ;
		} else {
			if (!scheduleDiv.classList.contains('raid_hide')) { 
				scheduleDiv.classList.add('raid_hide');
			}
			if (remainDiv.classList.contains('timer_flattop')) { 
				remainDiv.classList.replace('timer_flattop', 'timer_round');
			}
		}
		
	}
	//activeRaids.forEach(countDown);
	
	//alert(value.marker.icon.html.getElementsByClassName("remainingtext")[0].value);
	
}, 1000);

setInterval(function(){ 
	
	scanData();
	
}, 60000);

function initMap() {
	let mymap = L.map('mapid').setView([41.004, -8.638], 14);

	/* TESTES
	var marker = L.marker([41.004, -8.638]).addTo(mymap);
	
	var myIcon = L.divIcon({
		className: 'raidpin',
		html: document.getElementById("raidpin").innerHTML,
		iconAnchor: [28, 59]
	});
	// you can set .my-div-icon styles in CSS
	L.marker([41.004, -8.638], {icon: myIcon}).addTo(mymap);

*/
	let corner1 = L.latLng(41.03, -8.56);
	let corner2 = L.latLng(40.97, -8.71);

	let bounds = L.latLngBounds(corner1, corner2);
	mymap.setMaxBounds(bounds);
	
	//mymap.setMaxBounds(mymap.getBounds());
	
	/*
	L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
		maxZoom: 17,
		minZoom: 14,
		tileSize: 512,
		zoomOffset: -1
	}).addTo(mymap);
	*/
	
	L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=' + MBATOKEN, {
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
		maxZoom: 17,
		minZoom: 14,
		id: 'mapbox/streets-v11',
		tileSize: 512,
		zoomOffset: -1,
		accessToken: MBATOKEN
	}).addTo(mymap);
	
	return mymap;
}
