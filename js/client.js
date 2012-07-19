var client = new CryptumClient( );
client.init( );

function CryptumClient( ) {

	//-----------------------------------------------------------------------------------------------
	// private static constants
	//-----------------------------------------------------------------------------------------------

	this.LOGIN_STATE = 0;
	this.LOBBY_STATE = 1;
	this.CRYPTUM_STATE = 2;
	this.BACKDOOR_STATE = 3;
	
	//-----------------------------------------------------------------------------------------------
	// private properties
	//-----------------------------------------------------------------------------------------------
	
	this._model = null;
	this._socket = null;
	
	//-----------------------------------------------------------------------------------------------
	// public methods
	//-----------------------------------------------------------------------------------------------
	
	this.init = function( ) {
		
		this._model = new CryptumClientModel( );
		
		this.connect( );
		
	};
	
	this.facebookLogin = function( ) {
		
		console.log( 'CryptumClient.facebookLogin( )' );
		
		FB.login( $.proxy( this.onFacebookLoginHandler, this ) );
		
	};

	this.login = function( userName ) {

		console.log( 'CryptumClient.login( ' + userName + ' )' );
		
		// if a userName was not provided by Facebook
		if ( !userName ) {
			// then get the userName from the input field
			userName = $( '#userName' ).val( );
			
		}
		
		// store the user name in the model
		this._model.setUserName( userName );
		
		console.log( 'clientId: ' + this._model.getData( ).clientId );
		console.log( 'userName: ' + this._model.getData( ).userName );
		
		// submit the client ID and user name to log in
		this._socket.emit( 'login', this._model.getData( ) );

	};

	this.enterCryptum = function( ) {

		console.log( 'CryptumClient.enterCryptum( )' );
		
		// submit the client ID and user name to enter the cryptum
		this._socket.emit( 'enterCryptum', this._model.getData( ) );

	};

	this.clearAllUsers = function( ) {

		console.log( 'CryptumClient.clearAllUsers( )' );
		
		this._socket.emit( 'clearAllUsers', this._model.getData( ) );

	};

	//-----------------------------------------------------------------------------------------------
	// private callback handlers
	//-----------------------------------------------------------------------------------------------
	
	// called on the initial client connection
	this.onInitConnectHandler = function( data ) {
		
		console.log('CryptumClient.onInitConnectHandler( )' );
		
	};
	
	this.onFacebookLoginHandler = function( response ) {
		
		if (response.authResponse) {
				console.log( 'Welcome!  Fetching your information.... ' );
				/*FB.api( '/me', function( response ) {
					console.log( 'Good to see you, ' + response.name + '.' );
				} );*/
				FB.api( '/me', $.proxy( this.onFacebookApiHandler, this ) );
		} else {
			console.log( 'User cancelled login or did not fully authorize.' );
		}
		
	};
	
	this.onFacebookApiHandler = function( response ) {
		
		console.log('CryptumClient.onFacebookApiHandler( )' );
		console.log( 'name: ' + response.name )
		
		this.login( response.name );
		
	};

	// called on the initial client connection
	this.onConnectHandler = function( data ) {

		console.log('CryptumClient.onConnectHandler( )' );
		console.log( 'clientId: ' + data.clientId );

		// store this client ID for identifying future server calls
		this._model.setClientId( data.clientId );
		
		// display the Facebook login button
		this._model.setState( this.LOGIN_STATE );
		this.updateView( );

	};
	
	// called whenever a new user enters the lobby or the cryptum
	this.onStatusHandler = function( data ) {
		
		console.log('CryptumClient.onStatusHandler( )' );
		console.log( 'usersNames: ' + data.usersNames );
		console.log( 'currentUserName: ' + data.currentUserName );
		console.log( 'currentUserClientId: ' + data.currentUserClientId );
		
		this.setState( data );
		
	};
	
	//-----------------------------------------------------------------------------------------------
	// private methods
	//-----------------------------------------------------------------------------------------------

	this.connect = function( ) {
		
		console.log( 'CryptumClient.connect( )' );
		
		if ( this._socket == null ) {
			this._socket = io.connect( null, { 'auto connect': false } );
			this._socket.on( 'connect', $.proxy( this.onInitConnectHandler, this ) );
		}
		this._socket.socket.connect();
		
		this.bindSocketEvents();

	};

	this.bindSocketEvents = function( ) {
		
		this._socket.on('message', function (data) {
			console.log(data);
		});
		
		// onConnectHandler will be called on the initial connection
		this._socket.on( 'onConnect', $.proxy( this.onConnectHandler, this ) );
		
		// onStatus will be called whenever a new user enters the lobby or the cryptum
		this._socket.on( 'onStatus', $.proxy( this.onStatusHandler, this ) );

	};
	
	this.setState = function( data ) {
		
		// set the state of the client view based on a user either entering the lobby or the cryptum
		this._model.setUsersNames( data.usersNames );
		this._model.setCurrentUserName( data.currentUserName );
		
 		// if this client ID matches the client ID of the user in the cryptum
		if ( data.currentUserClientId == this._model.getClientId( ) ) {
			// then enter the cryptum state
			this._model.setState( this.CRYPTUM_STATE );
		} else if ( data.usersNames.length > 0 && this._model.getUserName( ) != '' ) {
			// if users are in the lobby, then enter the lobby
			this._model.setState( this.LOBBY_STATE );
		} else {		
			// if the lobby and cryptum are both empty, then all users must have been cleared
			this._model.setState( this.LOGIN_STATE );
		}
		
		// render the view based on the state change
		this.updateView( );
		
	};
	
	this.updateView = function( ) {
		
		$("#usersNames").val( this._model.getUsersNames().join( '\n' ) );
		$("#currentUserName").val( this._model.getCurrentUserName() );
		
		switch ( this._model.getState( ) ) {
			
			case this.LOGIN_STATE:
				$("#login").show( );
				$("#lobby").hide( );
				$("#cryptum").hide( );
				break;
				
			case this.LOBBY_STATE:
				$("#login").hide( );
				$("#enterCryptum").show( );
				$("#lobby").show( );
				$("#cryptum").hide( );
				break;
				
			case this.CRYPTUM_STATE:
				$("#login").hide( );
				$("#enterCryptum").hide( );
				$("#lobby").show( );
				$("#cryptum").show( );
				break;
				
			case this.BACKDOOR_STATE:
				$("#login").show( );
				$("#lobby").hide( );
				$("#cryptum").hide( );
				break;
		}
		
	};
	
}

function CryptumClientModel( ) {
	
	//-----------------------------------------------------------------------------------------------
	// private properties
	//-----------------------------------------------------------------------------------------------
	
	this._state = -1;
	this._clientId = '';
	this._userName = '';
	this._usersNames = [ ];
	this._currentUserName = '';
	
	//-----------------------------------------------------------------------------------------------
	// public getters/setters
	//-----------------------------------------------------------------------------------------------
	
	this.getData = function( ) {
		
		// return the client ID and user name in a single object
		var data = {
			clientId: this.getClientId( ),
			userName: this.getUserName( )
		};
		
		return data;
		
	};

	this.getState = function( ) {

		return this._state;

	};

	this.setState = function( state ) {

		this._state = state;

	};
	
	this.getClientId = function( ) {
		
		return this._clientId;
		
	};
	
	this.setClientId = function( clientId ) {
		
		this._clientId = clientId;
		
	};

	this.getUserName = function( ) {

		return this._userName;

	};

	this.setUserName = function( userName ) {

		this._userName = userName;

	};

	this.getUsersNames = function( ) {

		return this._usersNames;

	};

	this.setUsersNames = function( usersNames ) {

		this._usersNames = usersNames;

	};

	this.getCurrentUserName = function( ) {

		return this._currentUserName;

	};

	this.setCurrentUserName = function( currentUserName ) {

		this._currentUserName = currentUserName;

	};
	
}