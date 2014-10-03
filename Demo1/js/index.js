var devapp = {
	smpInfo : {},
	
    //Application Constructor
    initialize : function() {
        this.bindEvents();
    },

	//========================================================================
	// Bind Event Listeners
	//========================================================================
     bindEvents : function() {
        //add an event listener for the Cordova deviceReady event.
        document.addEventListener("deviceready", this.onDeviceReady, false);
    },

	
    //========================================================================
    //Cordova Device Ready
    //========================================================================
    onDeviceReady : function() {
     	$.getJSON( ".project.json", function( data ) {
    		devapp.smpInfo.server = data.deployment.server;
    		devapp.smpInfo.port = data.deployment.port;
    		devapp.smpInfo.appID = data.deployment.appid;
    		
			if (devapp.smpInfo.server && devapp.smpInfo.server.length > 0) {
				var context = {
				  "serverHost" : devapp.smpInfo.server,
				  "https" : "false",
				  "serverPort" : devapp.smpInfo.port
				};
				doLogonInit(context, devapp.smpInfo.appID);
			} else {
				startApp();
			}
    	});
  }
};

