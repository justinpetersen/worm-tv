var client = new WormTvClient( );
client.init( );

function WormTvClient( ) {

	//-----------------------------------------------------------------------------------------------
	// private static constants
	//-----------------------------------------------------------------------------------------------
	
	//-----------------------------------------------------------------------------------------------
	// private properties
	//-----------------------------------------------------------------------------------------------
	
	this._model = null;
	this._socket = null;
	this._player = null;
	
	//-----------------------------------------------------------------------------------------------
	// public methods
	//-----------------------------------------------------------------------------------------------
	
	this.init = function( ) {
		
		this._model = new WormTvModel( );
		
		this.connect( );
		
		this.initYouTubePlayer( );
		
	};
	
	this.initYouTubePlayer = function( ) {
		
		console.log( 'WormTvClient.initYouTubePlayer( )' );

		// This code loads the IFrame Player API code asynchronously.
		var tag = document.createElement( 'script' );
		tag.src = "//www.youtube.com/player_api";
		var firstScriptTag = document.getElementsByTagName( 'script' )[ 0 ];
		firstScriptTag.parentNode.insertBefore( tag, firstScriptTag );
		
		onYouTubePlayerAPIReady = $.proxy( this.onYouTubePlayerAPIReady, this );

	};
	
	this.facebookLogin = function( ) {
		
		console.log( 'WormTvClient.facebookLogin( )' );
		
		FB.login( $.proxy( this.onFacebookLoginHandler, this ) );
		
	};

	this.login = function( userName ) {

		console.log( 'WormTvClient.login( ' + userName + ' )' );
		
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

	this.clearAllUsers = function( ) {

		console.log( 'WormTvClient.clearAllUsers( )' );
		
		this._socket.emit( 'clearAllUsers', this._model.getData( ) );

	};
	
	this.addVideo = function( ) {

		console.log( 'WormTvClient.addVideo( )' );
		
		var videoId = $( '#videoId' ).val( );
		$( '#videoId').val( '' );
		
		this._socket.emit( 'addVideo', videoId );
		
	};

	//-----------------------------------------------------------------------------------------------
	// private callback handlers
	//-----------------------------------------------------------------------------------------------
	
	// called on the initial client connection
	this.onInitConnectHandler = function( data ) {
		
		console.log('WormTvClient.onInitConnectHandler( )' );
		
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
		
		console.log('WormTvClient.onFacebookApiHandler( )' );
		console.log( 'name: ' + response.name )
		
		this.login( response.name );
		
	};

	// called on the initial client connection
	this.onConnectHandler = function( data ) {

		console.log('WormTvClient.onConnectHandler( )' );
		console.log( 'clientId: ' + data.clientId );

		// store this client ID for identifying future server calls
		this._model.setClientId( data.clientId );

	};

	// called whenever a new user enters the lobby
	this.onStatusHandler = function( data ) {

		console.log( 'WormTvClient.onStatusHandler( )' );
		console.log( 'usersNames: ' + data.usersNames );

		this.setState( data );

	};

	// called whenever a new video is ready
	this.onGetNextVideoHandler = function( videoId ) {

		console.log( 'WormTvClient.onGetNextVideoHandler( ' + videoId + ' )' );

		this._player.loadVideoById( videoId );

	};
	
	// This function creates an <iframe> (and YouTube player) after the API code downloads.
	this.onYouTubePlayerAPIReady = function( ) {
		
		console.log( 'WormTvClient.onYouTubePlayerAPIReady()' );
		
		this.createYouTubePlayer( );
		
	};
	
	this.onPlayerReady = function( event ) {

		console.log( 'WormTvClient.onPlayerReady( )' );
		
		event.target.playVideo( );

	};

	this.onPlayerStateChange = function( event ) {

		console.log( 'WormTvClient.onPlayerStateChange( )' );
		
		switch ( event.data ) {
			
			case YT.PlayerState.ENDED:
				console.log( 'complete' );
				this._socket.emit( 'getNextVideo' );
				break;
			
		}

	};
	
	//-----------------------------------------------------------------------------------------------
	// private methods
	//-----------------------------------------------------------------------------------------------

	this.connect = function( ) {
		
		console.log( 'WormTvClient.connect( )' );
		
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
		
		this._socket.on( 'onGetNextVideo', $.proxy( this.onGetNextVideoHandler, this ) );

	};
	
	this.createYouTubePlayer = function( ) {
		
		console.log( 'WormTvClient.createYouTubePlayer( )' );
		
		this._player = new YT.Player( 'player', {
			height: '100%',
			width: '100%',
			videoId: 'Jg5wkZ-dJXA',
			autoplay: '1',
			events: {
				'onReady': $.proxy( this.onPlayerReady, this ),
				'onStateChange': $.proxy( this.onPlayerStateChange, this )
			}
		} );
		
	};
	
	this.setState = function( data ) {
		
		// update state
		
	};
	
}

function WormTvModel( ) {
	
	//-----------------------------------------------------------------------------------------------
	// private properties
	//-----------------------------------------------------------------------------------------------
	
	this._state = -1;
	this._clientId = '';
	this._userName = '';
	this._usersNames = [ ];
	
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
	
}