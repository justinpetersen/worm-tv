//-----------------------------------------------------------------------------------------------
// initialization
//-----------------------------------------------------------------------------------------------

var application = new WormTvApplication( );
application.init( );

function WormTvApplication( ) {
	
	//-----------------------------------------------------------------------------------------------
	// public static constants
	//-----------------------------------------------------------------------------------------------
	
	// directories to route
	this.ROUTE_DIRECTORIES = [ 'css', 'img', 'js' ];
	
	// file name of index page
	this.INDEX_FILE_NAME = 'index.html';
	
	// file name of admin page
	this.ADMIN_FILE_NAME = 'admin.html';
	
	// file name of Facebook channel file
	this.CHANNEL_FILE_NAME = 'channel.html';
	
	//-----------------------------------------------------------------------------------------------
	// jQuery scope
	//-----------------------------------------------------------------------------------------------

	var $ = null;
	
	//-----------------------------------------------------------------------------------------------
	// private properties
	//-----------------------------------------------------------------------------------------------
	
	this._model = null;
	this._express = null;
	this._app = null;
	this._io = null;
	
	//-----------------------------------------------------------------------------------------------
	// public methods
	//-----------------------------------------------------------------------------------------------
	
	this.init = function( ) {
		
		// set jQuery scope
		$ = require('jquery');
		
		this._model = new WormTvModel( );
		
		this.initServer( );
		
	};

	//-----------------------------------------------------------------------------------------------
	// private callback handlers
	//-----------------------------------------------------------------------------------------------

	this.onServerHandler = function( directory, file, req, res ) {
		
		console.log( 'WormTvApplication.onServerHandler( )' );
		
		var path = __dirname + '/' + directory + '/' + file;

		var fs = require('fs');
		fs.readFile( path,
		function (err, data) {
			if (err) {
				res.writeHead(500);
				return res.end('Error loading file');
			}
			res.writeHead(200);
			res.end(data);
		});

	};

	// called on all new client connections
	this.onConnection = function( socket ) {

		console.log( 'WormTvApplication.onConnection( ' + socket + ' )' );

		// set up login and enterCryptum hooks
		this.bindSocketEvents( socket );

		// add a new user with this client ID
		this._model.addUser( socket.id );

		// notify this client of his ID for identification in future server calls
		socket.emit( 'onConnect', { clientId: socket.id } );

	};

	this.onLogin = function( data ) {

		console.log( 'WormTvApplication.onLogin( )' );
		console.log( 'clientId: ' + data.clientId );
		console.log( 'userName: ' + data.userName );

		// look up this user by his client ID and store his user name
		this._model.getUserByClientId( data.clientId ).setUserName( data.userName );

		// notify all users that a new user has entered the lobby
		this._io.sockets.emit( 'onStatus', this._model.getData( ) );

	};

	this.onClearAllUsers = function( data ) {

		console.log( 'WormTvApplication.onClearAllUsers( )' );

		// clear all users
		this._model.clearAllUsers( );

		// notify all users that a new user has entered the cryptum
		this._io.sockets.emit( 'onStatus', this._model.getData( ) );

	};

	//-----------------------------------------------------------------------------------------------
	// private methods
	//-----------------------------------------------------------------------------------------------
	
	this.initServer = function( ) {
		
		this.initApp( );
		this.initIo( );
		
	};
	
	this.initApp = function( ) {
		
		this._app = require( 'express' ).createServer( );
		this._app.listen( process.env.PORT || 8001 );
		
		this.initRoutes( );
		
	};
	
	this.initRoutes = function( ) {
		
		// route to index.html
		this._app.get( '/', $.proxy( this.onServerHandler, this, '.', this.INDEX_FILE_NAME ) );

		// route to admin.html
		this._app.get( '/admin/', $.proxy( this.onServerHandler, this, '.', this.ADMIN_FILE_NAME ) );

		// route to channel.html
		this._app.get( '/channel.html', $.proxy( this.onServerHandler, this, '.', this.CHANNEL_FILE_NAME ) );

		// route to data.json
		this._app.get( '/data.json', $.proxy( this.onServerHandler, this, '.', this.DATA_FILE_NAME ) );
		
		var fs = require( 'fs' );
		// automatically set up routes to all CSS and JS files
		for ( var i = 0; i < this.ROUTE_DIRECTORIES.length; i++ ) {
			// for each file in the asset directories
			fs.readdirSync( __dirname + '/' + this.ROUTE_DIRECTORIES[ i ] ).forEach( $.proxy( this.routeFile, this, [ this.ROUTE_DIRECTORIES[ i ] ] ) );
		}
		
	};
	
	this.routeFile = function( directory, file ) {
		
		console.log( 'WormTvApplication.routeFile( ' + directory + ', ' + file + ' )' );
		
		var route = '/' + directory + '/' + file;
		this._app.get( route, $.proxy( this.onServerHandler, this, directory, file ) );
		
	}
	
	this.initIo = function( ) {
		
		this._io = require( 'socket.io' ).listen( this._app );
		
		// force long polling and prevent the use of WebSockets
		// https://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku
		$this = this;
		this._io.configure( function( ) {
			$this._io.set( "transports", [ "xhr-polling" ] ); 
			$this._io.set( "polling duration", 10 );
		} );

		// onConnection will be called whenever a new client connects
		this._io.sockets.on( 'connection', $.proxy( this.onConnection, this ) );
		
	};
	
	this.bindSocketEvents = function( socket ) {

		// onLogin will be called whenever a new user logs in
		socket.on( 'login', $.proxy( this.onLogin, this ) );

		// onClearAllUsers will be called to clear all users
		socket.on( 'clearAllUsers', $.proxy( this.onClearAllUsers, this ) );

	};
	
}

function WormTvApplicationModel( ) {

	//-----------------------------------------------------------------------------------------------
	// private properties
	//-----------------------------------------------------------------------------------------------
	
	this._users = [ ];
	this._usersLookup = { };
	this._currentUserClientId = '';
	
	//-----------------------------------------------------------------------------------------------
	// public methods
	//-----------------------------------------------------------------------------------------------
	
	// clear all users including the cryptum user
	this.clearAllUsers = function( ) {
		
		this._users = [ ];
		this._usersLookup = { };
		this._currentUserClientId = '';
		
	};
	
	// create a new user and add the new user to the lobby
	this.addUser = function( clientId ) {

		console.log( 'WormTvApplicationModel.addUser( ' + clientId + ' )' );
		
		// create a new user and store his client ID
		var user = new WormTvUser( );
		user.setClientId( clientId );
		
		// add this user to the array of all users
		this._users.push( user );
		
		// store the array position of this user by his client ID
		this._usersLookup[ clientId ] = this._users.length - 1;
		
		return user;
		
	};

	this.getData = function( ) {

		// return a list of user names, the current user's name and the current user's client ID in a single object
		var data = {

			usersNames: this.getUsersNames( )

		};

		return data;

	};

	// returns an array of all user names
	this.getUsersNames = function( ) {
		
		console.log( 'WormTvApplicationModel.getUsersNames( ' + omitCurrentUserName +' )' );

		var usersNames = [ ];

		// for each user, add that user's name to an array of all user's names
		for ( var i = 0; i < this._users.length; i++ ) {
			
			user = this._users[ i ];
			
			// only add users who have logged in
			if ( user.getUserName( ) != '' ) {
				usersNames.push( user.getUserName( ) );
			}
		}

		return usersNames;

	};
	
	this.getUserByClientId = function( clientId ) {
		
		// look up and return a user by his client ID
		var user = this._users[ this._usersLookup[ clientId ] ];
		
		// if no user exists by this client ID, then create that new user
		if ( !user ) {
			user = this.addUser( clientId );
		}
		
		return user;
		
	};

}

function WormTvUser( ) {
	
	//-----------------------------------------------------------------------------------------------
	// private properties
	//-----------------------------------------------------------------------------------------------
	
	this._clientId = '';
	this._userName = '';
	
	//-----------------------------------------------------------------------------------------------
	// public getters/setters
	//-----------------------------------------------------------------------------------------------
	
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
	
}