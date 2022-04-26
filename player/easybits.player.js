/*
	Leon is WebGL-accelerated mpeg1-like video decoder

	Copyright (c) 2014-2022 Anton Bilan, Easy Bits Limited
	https://www.easy-bits.com
	JSV is a registered trademark of Easy Bits Limited

	Anyone can use and modify this software for free for non-commercial 
	use only provided they keep this license notice and say out loud word Leon.
	For commercial use obtaining a different license is required.

	This software is distributed WITHOUT ANY WARRANTY;
	even the implied warranty of MERCHANTABILITY or FITNESS FOR 
	A PARTICULAR PURPOSE.

*/

//closure compiler comformance test work around
var _ccc_src = 'src';
var readyBound = false;
var readyDOM = false;

function bindReady(fn){
	if ( readyBound ) return;
	readyBound = true;

	// Mozilla, Opera and webkit nightlies currently support this event
	if ( document.addEventListener ) {
		// Use the handy event callback
		document.addEventListener( 'DOMContentLoaded', function _onDOMContentLoaded(){
			document.removeEventListener( 'DOMContentLoaded', _onDOMContentLoaded, false );
			fn();
		}, false );

	// If IE event model is used
	} else if ( document.attachEvent ) {
		// ensure firing before onload,
		// maybe late but safe also for iframes
		document.attachEvent('onreadystatechange', function _onreadystatechange(){
			if ( document.readyState === 'complete' ) {
				document.detachEvent( 'onreadystatechange', _onreadystatechange );
				fn();
			}
		});

		// If IE and not an iframe
		// continually check to see if the document is ready
		if ( document.documentElement.doScroll && window == window.top ) (function _onScroll(){
			if ( readyDOM ) return;

			try {
				// If IE is used, use the trick by Diego Perini
				// http://javascript.nwbox.com/IEContentLoaded/
				document.documentElement.doScroll('left');
			} catch( error ) {
				setTimeout( _onScroll, 0 );
				return;
			}

			// and execute any waiting functions
			fn();
		})();
	}
}

		

function patchCreateElement(){
	var originalFunction = document.createElement;
	document.createElement = function(tag) {
		if(tag == 'video')
		{
			var element = new window['video_jsv']();
		}
		else
		{
			element = originalFunction.call(document, tag);
		}
		return element;
	};
	patchGetElementsByTagName();
}
function patchGetElementsByTagName(){
	var originalFunction = document.getElementsByTagName;
	document.getElementsByTagName = function(tag) {
		
		var elements = originalFunction.call(document, tag);
		var arr1 = [].slice.call(elements);
		var arr2 = [];
		if(tag == 'video')
		{
			var elements2 = originalFunction.call(document, 'jsv');
			var arr2 = [].slice.call(elements2);
		}
		return arr1.concat(arr2);
	};
}
	
	
function convertVideos(){
	var videos = document.getElementsByTagName('video');
	for(var i=0;i < videos.length;i++){
		if(videos[i].tagName != 'VIDEO'){
			//skip jsv
			continue;
		}
		if(('src' in videos[i]) && /\.jsv$/.test(videos[i]['src'])){
			convertVideo(videos[i], videos[i]['src']);
		}else{
			var srcs = videos[i].getElementsByTagName('source');
			for( var j=0;j < srcs.length;j++){
				if(/\.jsv$/.test(srcs[j]['src'])){
					convertVideo(videos[i], srcs[j]['src']);
				}
			}
		}
	}			
}
		
function convertVideo(video, src){
	var player = new window['video_jsv']();
	player.style.width = video.offsetWidth+'px';
	player.style.height = video.offsetHeight+'px';
	var attr = ['data-audio','preload','loop','autoplay','poster','id','class','muted'];
	for(var i =0; i < attr.length;i++){
		if(video.hasAttribute(attr[i])){
			player.setAttribute(attr[i], video.getAttribute(attr[i]));
		}
	}
	player.setAttribute('src', src);
	var parent = video.parentNode;
	parent.replaceChild(player, video);
}
		
function onDOMReady(){
	readyDOM = true;
	convertVideos();
}	
	
if(!window['jsv_is_ww']){	

	if(window['jsv_config'] === undefined || window['jsv_config']['doNotPatchCreateElement'] === undefined || !window['jsv_config']['doNotPatchCreateElement']){
		patchCreateElement();
	}
	//convert markup to objects
	bindReady(onDOMReady);
			
}
//patching video element and convert markup





jsv_gl['ios'] = /(iPad|iPhone|iPod)/g.test( navigator.userAgent );

window['video_jsv'] = function(){
	
	
	var _getters = [
		'muted',
		'volume',
		'loop',
		'preload',
		'data-audio',
		'poster',
		'src',
		'autoplay',
		'buffered',
		'seeking',
		'controls',
		'currentSrc',
		'currentTime',
		'defaultMuted',
		'defaultPlaybackRate',
		'playbackRate',
		'duration',
		'ended',
		'networkState',
		'paused',
		'readyState',
		'seekable',
		'played',
		'error'
	];
			
	var _setters = [
		'muted',
		'volume',
		'loop',
		'preload',
		'data-audio',
		'poster',
		'src',
		'autoplay',
		'controls',
		'currentSrc',
		'currentTime',
		'defaultMuted',
		'defaultPlaybackRate',
		'playbackRate',
		'duration'
	];
	
	
	//set up container
	if(window['jsv_is_ww']){
		var container = {};
	}else{
		var container = document.createElement('jsv');
		container['on'] = container.addEventListener;
		container['off'] = container.removeEventListener;
		container.style.display = 'block';
		container.style.background = 'black';
		
		console.log( 'Not using worker for GL decoding for now' );
		if( false && window.Worker ){
			if(jsv_gl.worker_blob){
				try{
					//from blob first
					container.jsv_ww = new Worker(jsv_gl.worker_blob);
				}catch(e){
				}
			}
			if(!container.jsv_ww && jsv_gl.worker_url){
				try{
					container.jsv_ww = new Worker(jsv_gl.worker_url);
				}catch(e){
				}
			}
			if(container.jsv_ww){
				//set up messaging from worker
				container.jsv_ww.addEventListener('message', function(event){
					var data = event.data;
					if(data['args'] && !Array.isArray(data['args']) && data['t'] != 'event'){
						var args = Object.keys(data['args']).map(function(k) { return data['args'][k] });;
					}else{
						args = data['args'];
					}
					
					switch(data['t'])
					{
						case 'event':
						// console.log('event from worker '+data['n']);
							container._emit(data['n'], args, true);
						break;
						case 'set':
							container.__lookupSetter__(data['n']).apply( container, args );
						break;
						case 'func':
							container[data['n']].apply(container, args);
						break;
						default:
						case 'eq':
							container[data['n']] = args[0];
						break;
						case 'jsv_gl':
							jsv_gl[data['n']] = args[0];
						break;
					}
				});
				
				container.jsv_ww.postMessage('');
			}	
		}
	
		
		var setAttribute = container.setAttribute;
		
		container.setAttribute = function(p){
			if(_setters.indexOf(p) != -1){
				setAttribute.apply( this, arguments );
				return jsv.prototype.__lookupSetter__(p).apply( this, arguments );
			}
			return setAttribute.apply( this, arguments );
		}
	}
	
	//copy setters and getters onto the container
	for(var p in jsv.prototype){
		
		if(_getters.indexOf(p) != -1)
		{
			
			if(_setters.indexOf(p) != -1)
			{
					
				Object.defineProperty(container, p, {
					configurable:true,
					get: jsv.prototype.__lookupGetter__(p),
					set: jsv.prototype.__lookupSetter__(p)
				});
			}
			else
			{
				Object.defineProperty(container, p, {
					configurable:true,
					get: jsv.prototype.__lookupGetter__(p)
				});
			}
			
		}else{
			container[p] = jsv.prototype[p];
		}
	}
	
	for(var p in jsv){
		container[p] = jsv[p];
	}
	
	
	container._initOnce();
	
	return container;
}

var jsv = window.jsv = function() {
	this._initOnce();
};

jsv.prototype._initOnce = function(){
	//front end deals with rendering and dom
	this.frontEnd = !window['jsv_is_ww'];
	//backend is decoding and loading
	this.backEnd = window['jsv_is_ww'] || (!window['jsv_is_ww'] && !this.jsv_ww);
	
	if(this.frontEnd){
		this._initOnceFront();
	}
	if(this.backEnd){
		this._initOnceBack();
	}
	this['reset'](true);
}
jsv.prototype._initOnceFront = function(){
	var that = this;
	
	
	if(!window['jsv_is_ww'] && !this.jsv_ww){
		window['ez_vi'] = this.bind(this.onPageVisibilityChange, this);
	}
	
	
	this._canGoToLowerBitrate = false;
	this._avSyncInt = false;
	
	
	
	var jsv_config = {
		'unlockAudio':true,
		'syncInt':5000,
		'audioMap':false,
		'audioShiftSec':DEFAULT_AUDIO_SHIFT_SEC,
		'skipHard':false,
		'bufferSec':DEFAULT_FORWARD_BUFFER_SEC,
		'chunkSize':DEFAULT_CHUNK_SIZE,
		'bufferMinSec':DEFAULT_FORWARD_MINBUFFER_SEC
	};
	
	
	if(window['jsv_config'] !== undefined)
	{
		for(var i in jsv_config)
		{
			if(window['jsv_config'][i] === undefined)
			{
				window['jsv_config'][i] = jsv_config[i];
			}
		}
		jsv_config = window['jsv_config'];
	}
	
	for(var k in jsv_config){
		if (jsv_config.hasOwnProperty(k)) {
           this[k] = jsv_config[k];
        }
	}
	
	this.audioEl = document.createElement('audio');
	this.audioEl.preload = this._preload;
	//is audio locked, is never unmuted
	this['ial'] = this['inu'] = /(iPad|iPhone|iPod|Android)/g.test( navigator.userAgent );
	
	if(!window['jsv_is_ww'] && this['unlockAudio']){
		if(this['ial']){
			var onunlocked = function(){
				window['ez_unlock']['off']('unlocked', onunlocked);
				that['unlockaudio']();
			}
			window['ez_unlock']['on']('unlocked', onunlocked);
		}else{
			this.unlockAudioContext();
		}
	}
	
	if(this.jsv_ww){
			
		for(var k in jsv_config){
			if (jsv_config.hasOwnProperty(k)) {
			   this.jsv_ww.postMessage({'t':'eq','n':k, 'args': [jsv_config[k]]});
			}
		}
		
	}
	
	if(this['bufferMinSec'] >= this['bufferSec']){
		return this._onError('bufferMinSec must be smaller bufferSec', MediaError._MEDIA_ERR_ABORTED);
	}
	
	this.reInitCanvas();
	
	
	
	if(this.initWebGL()) {
		//igl = is webgl
		this.setSharedVar('this','igl',true);
	} else {
		this.setSharedVar('this','igl',false);
		this.canvasContext = this.canvasEl.getContext('2d');
	}
	
	this.addEventListener('play', function(){
		if(that._poster && that._poster.style.display != 'none'){
			that._poster.style.display = 'none';
		}
	});
	
	
	
	// this._initDebug();
}
//init once backend
jsv.prototype._initOnceBack = function(){
	
	if(window['jsv_is_ww']){
		window['ez_dis'](this);
	}
	
	if(window['ez_http']){
		
		this._loader = window['ez_http']();
	}
	
}

jsv.prototype['reset'] = function(_oninit){
	
	if(this.frontEnd){
		if(this.audioNeedsPlaying){
			if(this.audioEl.destroy){
				this.audioEl.destroy();
			}else if(this.audioEl.load){
				this.audioEl.src = '';
				this.audioEl.load();
			}
		}
		
		//audio type
		this.audioType = 'file';
		
		this.bitrateFromSource = 0;
		this._currentSrcs = NaN;
		this.setSharedVar('this','sr','');
		//audio source
		this.audioSrc = '';
		//do we need to play and sync audio
		this.audioNeedsPlaying = false;
		//is video
		this.setSharedVar('this','iv',false);
		this.pendingAudioSrc = false;
		//muted audio source
		this.mutedAudio = false;
	}
	if(this.backEnd){
		this._currentSrcMedia = NaN;
	}
	
	this._volume = 1.0;
	this._defaultPlaybackRate = 1.0;
	this._playbackRate = 1.0;
	this._defaultMuted = false;
	this._muted = false;
	this._preload = 'auto';
	this._poster = false;
	this._autoplay = false;
	this._loop = false;
	
	this._onSrcChangeAndInit();
	
	//reset on init is done separately
	if(this.jsv_ww && !_oninit){
		this.jsv_ww.postMessage({'t':'func','n':'reset', 'args': []});
	}
	
}
jsv.prototype._onSrcChangeAndInit = function(){
	
	var that = this;
	//array for imagedata
	this._imagedata = [];
	//no time ranges yet
	this.startRange = NaN;
	//default playback rate
	this._playbackRate = this._defaultPlaybackRate;
	
	if(this.frontEnd){
		
		this.stopRendering(true);
		this.firstFrameRendered = false;
		this.firstFrameDecoded = false;
		
		this._waitingTimes = 0;
		
		this._loadeddataed = false;
		this._autoplayed = false;
		
		this._decodedFrames = [];
		
		this.lastAudioTimeIsTheSame = 0;
		this._lateCounter = 0;
		
		this._audioRTS = 0;
		
		this.setSharedVar('this','ws',false);
		
		this._firstPlay = true;
		this._firstPlayInit = true;
		this._played = [];
		this._playedFrom = 0;
		
		//can play
		this._canplay = false;
		this._rendering = false;
		//playing
		this._playing = false;
		//was playing
		this._wasplaying = false;
		//was playing before seek
		this._bsplaying = false;
		this['du'] = NaN;
		this._stallingAudio = false;
		this._afterStalledVideo = false;
		this._stallingVideo = false;
		this._seekingTo = NaN;
		this._seeking = false;
		
		//readyState
		this._readyState = HAVE_NOTHING;
		if(this['ns'] > NETWORK_EMPTY){
			this._emit('abort');
		}
		//networkState
		this.setSharedVar('this','ns',NETWORK_EMPTY);
		
	}
	if(this.backEnd){
		
		this._seekingBackend = false;
		
		if(this.WebSocket){
			this.WebSocket.close();
			this.WebSocket = false;
		}
		window.clearInterval(this._livePollInterval);
		
		this._loadingRange = {start:-2, end:"", _currentSrcMedia:''};
		
		this._hlsVideoListSize = 0;
		this._gopHeaderDecoded = false;
		
		this._hls = [];
		
		if(this._loading){
			this._loader.cancel( this._requestId );
			this._emit('suspend');
		}
		
		this._loading = false;
		
		this._requestId = NaN;
		this._bytesLoaded = 0;
		this._contentLength = NaN;
		
		this.decoder = new window['jsv_dec'];
		this.decoder._initGL( this.gl );	
	
		var onmeta = this.bind(this['onm'], this);
		this.decoder['on']('meta', function(e){
			onmeta(e.detail);
		});
		
		var onframe = this.bind(this['onf'], this);
		this.decoder['on']('frame', function(e){
			onframe(e.detail);
		});
		
		var onended = this.bind(this.onendedDecoder, this);
		this.decoder['on']('ended', function(e){
			onended(e.detail);
		});
		
		var onseq = this.bind(this['ons'], this);
		this.decoder['on']('seq', function _onseq(e){
			that.decoder['off']('seq', _onseq);
			onseq(e.detail);
		});
		
		var onseeked = this.bind(this.callFEF, this);
		this.decoder['on']('seeked', function(e){
			that._seekingBackend = false;
			// this.callFEF('ovs', [targetTime, actualTime]);
			onseeked('ovs', [e.detail[0], e.detail[1]]);
		});
		
		
		this._skipTillGopLast = 0;
		this.decoder._skipTillGop = true;
		
		this.buffer = this.decoder.buffer;
		
		var onstalled =  this.bind(this.onNodata, this);
		this.buffer['on']('stalled', function(e){
			onstalled(e.detail);
		});
		
		var onbufferadvance = this.bind(this['ld'], this);
		this.buffer['on']('bufferadvance', function(){
			if(!that._loading){
				onbufferadvance(undefined, true);
			}
		});
		
		var onbufferremoved = this.bind(this._onBufferRemoved, this);
		this.buffer['on']('bufferremoved', function(e){
			onbufferremoved(e.detail);
		});
	}
	
	
	
	
	this._error = null;
	
	this._live = -1;
	this._isHLS = false;
	
	
	
		
	this._ended = false;
	
	//videoWidth should be 0 if not known
	this.frameWidth = 0;
	this.frameHeight = 0;
	
	this._meta = false;
	this._currentTime = 0;
}

jsv.prototype._onSrcChange = function(){
	
	this._onSrcChangeAndInit();
	
	var ext = this['sr'].split(/[#?]/)[0].split('.').pop().trim();
	if(ext == 'jsv'){
		this._live = false;
		this._currentSrcMedia = this['sr'];
	}else if(ext == 'm3u8'){
		this._isHLS = true;
		this._currentSrcMedia = NaN;
	}else if(this['sr'].indexOf('ws://') == 0 || this['sr'].indexOf('wss://') == 0){
		this._live = true;
		this.setSharedVar('this','ws',true);
	}else{
		return this._onError('Unsupported src', MediaError._MEDIA_ERR_SRC_NOT_SUPPORTED);
	}
	
	
	if(this.backEnd){
		if(this['ws']){
			if(!window.WebSocket){
				return this._onError('WebSockets are not supported', MediaError._MEDIA_ERR_NETWORK);
			}
			this.buffer._freeMemory = true;
			this.buffer._ws = true;
		}
		this.buffer._live = this._live;
		
		if(this._isHLS){
			this._getHLSList();
		}else if(!this['ws']){
			if(this._preload == 'auto'){
				this.callBEF('ld', [0]);
			}else if(this._preload == 'metadata'){
				//meta data only
				this.loadAjax( 0, this['chunkSize'], false);
			}
		}
	}
	//frontend
	if(this.frontEnd){
		this._emit('srcchange');
		//why is that?
		if(this['ws']){
			if( this['autoplay'] ) {
				this['play']();
			}
		}else{
			this._emit('loadstart');
		}
	}
}
//cal font end function
jsv.prototype.callFEF = function(func, args){
	if(this.frontEnd){
		this[func].apply(this, args);
	}else{
		//we are in a worker
		window.postMessage({'t':'func','n':func, 'args': args});
	}
}
//cal back end function
jsv.prototype.callBEF = function(func, args){
	if(this.backEnd){
		this[func].apply(this, args);
	}else{
		//we have a worker
		this.jsv_ww.postMessage({'t':'func','n':func, 'args': args});
	}
}
jsv.prototype.onendedDecoder = function(){
	//decoder ended
	this.setSharedVar('this','de',true);
}
//fronend
jsv.prototype._onEnded = function(){
	
	this._readyState = HAVE_CURRENT_DATA;
	
	this.stopRendering(true);
	
	this._ended = true;
	if(this.audioNeedsPlaying){
		this.audioEl.pause();
	}
	
	this._emit('pause');
	
	this._emit('ended');
	
	// Only loop if we found a sequence header && this.sequenceStarted ?
	if( this['loop'] ) {
		this['play']();
	}
}
//on imagedata backend - worker
jsv.prototype['imd'] = function(imagedata){
	// console.log('got imd');
	this._imagedata.push(imagedata);
	// console.log('added to '+this._imagedata.length);

}
//on worker meta - frontend
jsv.prototype['wm'] = function(worker_cap){
	jsv_gl.worker_cap = worker_cap;
	//no webgl and no imagedata constructor in worker
	//need to send imagedata from the main thread
	if(!this['igl'] && !jsv_gl.worker_cap['sid']){
		this.sendImageDataW = true;
	}
}

jsv.prototype._updateRate = function(){
	this.rate = this.pictureRate*this._playbackRate;
	this.frameDuraionNominal = 1000/this.pictureRate;
	this.frameDuration = 1000/this.rate;
}
//on sequence
jsv.prototype['ons'] = function(meta){
	
	if(this.backEnd && this._live){
		meta['d'] = NaN;
		this['onm'](meta);
	}
	
	this.pictureRate = meta['r'];
	
	this._updateRate();
	
	if(window['jsv_is_ww']){
		//send meta to the main thread
		window.postMessage({'t':'func','n':'ons', 'args': [meta]});
		return;
	}
}
//onmeta
jsv.prototype['onm'] = function(meta){
	
	
	this.setSharedVar('this','du', meta['d']);
	this.frameWidth = meta['w'];
	this.frameHeight = meta['h'];
	this.mbWidth = (this.frameWidth + 15) >> 4;
	this.mbHeight = (this.frameHeight + 15) >> 4;
	this.codedWidth = this.mbWidth << 4;
	this.codedHeight = this.mbHeight << 4;
	this.halfWidth = this.mbWidth << 3;
	this.halfHeight = this.mbHeight << 3;
	
	
	if(window['jsv_is_ww']){
		//send meta to the main thread
		window.postMessage({'t':'func','n':'onm', 'args': [meta]});
		return;
	}
	//frontend
	
	
	//set canvas size
	this.canvasEl.width = this.frameWidth;
	this.canvasEl.height = this.frameHeight;
	if( this['igl'] ) {
		if(jsv_gl['ios']){
			this.reInitCanvas(this.frameWidth, this.frameHeight);
			this.initWebGL();
		}else{
			//chrome bug that does not use objectfit contain correctly
			this.canvasEl.style.width = '99.99%';
			var that = this;
			setTimeout(function(){
				that.canvasEl.style.width = '100%';
			}, 30);
		}
		//this.gl.useProgram(this.programRGBA);
		//this.gl.viewport(0, 0, this.codedWidth, this.frameHeight);
	}
	this._readyState = HAVE_METADATA;
	
	this._emit('durationchange');
		
	this._emit('resize');
	
	this._emit('loadedmetadata');
	
	this._canplay = true;

}
//setters


jsv.prototype['canPlayType'] = function( type ){
	return type.indexOf('jsv') != -1?'probably':'';
}


jsv.prototype.__defineGetter__('videoWidth', function(){
	return this.frameWidth;
});

jsv.prototype.__defineGetter__('videoHeight', function(){
	return this.frameHeight;
});

jsv.prototype.__defineGetter__('error', function(){
	return this._error;
});

jsv.prototype.__defineGetter__('readyState', function(){
	return this._readyState;
});

jsv.prototype.__defineGetter__('paused', function(){
	return !this._playing;
});

jsv.prototype.__defineGetter__('networkState', function(){
	return this['ns'];
});

jsv.prototype.__defineGetter__('ended', function(){
	return this._ended;
});

jsv.prototype.__defineGetter__('preload', function(){
	return this._preload;
});

jsv.prototype.__defineSetter__('preload', function(preload){
	if(arguments.length > 1){
		preload = arguments[1];
	}
	
	this._preload = this.audioEl.preload = preload;
	
});	

jsv.prototype.__defineGetter__('defaultPlaybackRate', function(){
	return this._defaultPlaybackRate;
});
jsv.prototype._normClamp = function(value, bottom, up){
	value = parseFloat(value);
	if(value < bottom || value > up){
		value = 1;
	}
	return value;
}
jsv.prototype.__defineSetter__('defaultPlaybackRate', function(defaultPlaybackRate){
	if(arguments.length > 1){
		defaultPlaybackRate = arguments[1];
	}
	this._defaultPlaybackRate = this._normClamp(defaultPlaybackRate, 0, 100);
	
});

jsv.prototype.__defineGetter__('playbackRate', function(){
	return this._playbackRate;
});

jsv.prototype.__defineSetter__('playbackRate', function(playbackRate){
	if(arguments.length > 1){
		playbackRate = arguments[1];
	}
	this._playbackRate = this._normClamp(playbackRate, 0, 100);
	this._updateRate();
	if(this.audioEl){
		this.audioEl.playbackRate = this._playbackRate;
	}
	
	this._emit('ratechange');
});

jsv.prototype.__defineGetter__('defaultMuted', function(){
	return this._defaultMuted;
});

jsv.prototype.__defineSetter__('defaultMuted', function(defaultMuted){
	if(arguments.length > 1){
		defaultMuted = arguments[1];
	}
	this._defaultMuted = defaultMuted;
	
});

jsv.prototype.__defineGetter__('muted', function(){
	return this._muted;
});

jsv.prototype.__defineSetter__('muted', function(muted){
	
	if(arguments.length > 1){
		muted = arguments[1];
	}
	if(muted){
		muted = true;
	}
	
	var wasmuted = this._muted;
	this._muted = muted;
	this.audioEl.muted = this._muted;
	if(jsv_gl['ios'] || this['inu']){
		if(!this._muted && this.mutedAudio && !this['ial']){
			
			this.mutedAudio = false;
			this.audioNeedsPlaying = true;
			if(this['ws']){
				this.audioEl.connect();
				if(this._playing){
					this.audioEl.play();
				}
			}else{
				if(this._playing){
					this.stopRendering(false);
				}
				var that = this;
				syncMedia(this.audioEl, (this._currentTime/1000-this._audioRTS), function(){
					if(that._playing){
						that.startRendering();
					}
				});
			}
		}else if(this._muted && this.audioNeedsPlaying){
			this.mutedAudio = true;
			this.audioNeedsPlaying = false;
			this.audioEl.pause();
		}
		if(!muted && wasmuted){
			//first time unmuted
			this.setSharedVar('this','inu',false);
		}
	}
	if(wasmuted != muted){
		if(!muted){
			this.removeAttribute('muted');
		}
		this._emit('volumechange');
		// console.log('volumechange '+this.muted);
	}
	
});

jsv.prototype.__defineGetter__('volume', function(){
	return this._volume;
});

jsv.prototype.__defineSetter__('volume', function(volume){
	if(arguments.length > 1){
		volume = arguments[1];
	}
	this._volume = this._normClamp(volume, 0, 1);
	this.audioEl.volume = this._volume;
	
	this._emit('volumechange');
});

jsv.prototype.__defineGetter__('data-audio', function(){
	return this.audioSrc;
});

jsv.prototype.__defineSetter__('data-audio', function(src){
	
	var that = this;
	
	if(arguments.length > 1){
		src = arguments[1];
	}
	this.pendingAudioSrc = false;
	
	this.audioSrc = src;
	
	// this.audioEl.addEventListener('stalled',function _onplay(){
		// console.log('A stalled');
	// });
	// this.audioEl.addEventListener('waiting',function _onplay(){
		// console.log('A waiting');
	// });
	// this.audioEl.addEventListener('play',function _onplay(){
		// console.log('A play');
	// });
	// this.audioEl.addEventListener('pause',function _onpause(){
		// console.log('A pause');
	// });
	// this.audioEl.addEventListener('progress',function _onpause(){
		// console.log('A progress');
	// });
	// this.audioEl.addEventListener('loadedmetadata',function _onpause(){
		// console.log('A loadedmetadata');
	// });
	// this.audioEl.addEventListener('playing',function _onplaying(){
		// console.log('A playing');
	// });
	// this.audioEl.addEventListener('seeking',function _onseeking(){
		// console.log('A seeking');
	// });
	// this.audioEl.addEventListener('seeked',function _onseeked(){
		// console.log('A seeked');
	// });
	// this.audioEl.addEventListener('canplay',function _oncanplay(){
		// console.log('A canplay');
	// });
	// this.audioEl.addEventListener('error',function _oncanplay(){
		// console.log('A error');
	// });
	
	
	var live = true;
	
	if(src.indexOf('ws://') != -1 || src.indexOf('wss://') != -1){
		if(!(window.AudioContext || window.webkitAudioContext)){
			this._onError('AudioContext is not supported', MediaError._MEDIA_ERR_SRC_NOT_SUPPORTED);
			return false;
		}
		this.audioType = 'ws';
		
		this.setSharedVar('this','ws',true);
		if(window['jsv_au_de'] === undefined){
			this.audioEl =  new jsv_audio_sockets({
				'url':src,
				'channels':2,
				'bufferMinSec':this['bufferMinSec']+this['audioShiftSec'],
				'skipHard':this['skipHard'],
				'ms':DEFAULT_MARGIN_IN_SEC
			});;
		}else{
			// console.log('aurora');
			this.audioEl = window['jsv_au_de'](src);
		}
		
	}else if(src.indexOf('.m3u8') != -1){
		this.audioType = 'hls';
		this.pendingAudioSrc = src;
		this.audioEl.src = '';
		this.audioEl.load();
	}else if(src.split('?')[0].substr(-4, 1) != '.'){
		this.audioType = 'livehttp';
		this.audioEl[_ccc_src] = src;
	}else{
		this.audioType = 'file';
		live = false;
		this.audioEl[_ccc_src] = src;
		this.audioEl.load();
	}
	
	
	if(src != ''){
		this.audioNeedsPlaying = true;
	}else{
		this.audioNeedsPlaying = false;
	}
	
	
	if(jsv_gl['ios'] || this['inu']){
		if(this._muted && this.audioNeedsPlaying){
			this.mutedAudio = true;
			this.audioNeedsPlaying = false;
			this.audioEl.pause();
		}
	}
	
});


jsv.prototype.__defineGetter__('poster', function(){
	return this._poster?this._poster.src:'';
});

jsv.prototype.__defineSetter__('poster', function(src){
	if(arguments.length > 1){
		src = arguments[1];
	}
	if(!this._poster){
		this.style.position = 'relative';
		this._poster = document.createElement('img');
		this._poster.setAttribute('style', 'z-index:2;position:absolute;top:0px;left:0px;bottom:0px;right:0px;width:100%;height:100%;');
		this.appendChild(this._poster);
	}
	if(src != ''){
		this._poster[_ccc_src] = src;
	}else{
		this._poster.style.display = 'none';
	}
});

jsv.prototype.__defineGetter__('played', function(){
	//add new range first
	this._addPlayedRange();
	
	if(!this._playedTiRa){ 
	
		this._playedTiRa = {};
		var that = this;
		this._playedTiRa.__defineGetter__('length', function(){
			return that._played.length;
		});
		this._playedTiRa.start = function( ind ){
			return that._played[ind].start;
		};
		this._playedTiRa.end = function( ind ){
			return that._played[ind].end;
		};
	}
	return this._playedTiRa;
});

jsv.prototype.__defineGetter__('seekable', function(){
	var that = this;
	return {
		length:1,
		start:function(i){
			return 0;
		},
		end:function(i){
			return  that['du'];
		}
	};
});

jsv.prototype.__defineGetter__('buffered', function(){
	return this.getByteRanges();
});

jsv.prototype.__defineGetter__('seeking', function(){
	return this._seeking;
});

jsv.prototype.__defineGetter__('controls', function(){
	return false;
});

jsv.prototype.__defineSetter__('controls', function(controls){
	return false;
});

jsv.prototype.__defineGetter__('duration', function(){
	return this['du'];
});

jsv.prototype.__defineSetter__('duration', function(duration){
	return false;
});

jsv.prototype.__defineGetter__('src', function(){
	return this['sr'];
});

jsv.prototype._setAudioMap = function(src){
	this['data-audio'] = String.prototype.replace.apply(src, this['audioMap']);
}
jsv.prototype._setMultiSource = function(src){
	if( typeof src !== 'string' ) {
		this._currentSrcs = src;
		this.bitrateFromSource = 0;
		for(var i=0;i<this._currentSrcs.length;i++){
			var b = parseInt(this._currentSrcs[i]['b']);
			if(this._currentSrcs[i]['use']){
				this.bitrateFromSource = b;
				src = this._currentSrcs[i]['src'];
				break;
			}
			if(this.bitrateFromSource < b){
				
				this.bitrateFromSource = b;
				// console.log('new bitrate '+this.bitrateFromSource);
				src = this._currentSrcs[i]['src'];
			}
		}
	}else{
		this._currentSrcs = NaN;
	}
	return src;
}
jsv.prototype.__defineSetter__('src', function(src){
	if(arguments.length > 1){
		src = arguments[1];
	}
	src = this._setMultiSource(src);
	if( src.indexOf( 'http' ) && src.indexOf('ws') ){
		//relative path
		src = new URL(src, document.baseURI).href;
	}

	this['ss'](src);
});

jsv.prototype.__defineGetter__('currentSrc', function(){
	return this['sr'];
});

jsv.prototype.__defineSetter__('currentSrc', function(currentSrc){
	throw new Error('Setting currentSrc is not allowed !');
});

jsv.prototype.__defineGetter__('currentTime', function(){
	return this._currentTime/1000;
});
//set source
jsv.prototype['ss'] = function(src){
	if(this.frontEnd){
		if(this['audioMap']){
			this._setAudioMap(src);
		}
		
		this._checkLowerBitrateExists();
		
		this.setSharedVar('this','iv',true);
		this.setSharedVar('this','sr',src);
	}
	var that = this;
	// if(this.decoder && this.decoder._decoding){
		// window.setTimeout(function(){that._onSrcChange()}, 1000/that.rate);
	// }else{
		this._onSrcChange();
	// }
	//call this function in a worker too
	if(this.jsv_ww){
		this.jsv_ww.postMessage({
					't':'func',
					'n':'ss',
					'args':[src]
				});
	}
}

jsv.prototype._checkLowerBitrateExists = function(){
	this._canGoToLowerBitrate = false;
	for(var i=0;i<this._currentSrcs.length;i++){
		if(this.bitrateFromSource > this._currentSrcs[i]['b']){
			if(!this._canGoToLowerBitrate || (this._canGoToLowerBitrate['b'] < this._currentSrcs[i]['b'])){
				this._canGoToLowerBitrate = this._currentSrcs[i];
			}
		}
	}
}
//frontend
jsv.prototype._goToLowerRate = function() {
	
	this._emit('bitratechange', {'b':this._canGoToLowerBitrate['b'],'src':this._canGoToLowerBitrate['src']});
	
	// console.log('going to lower bitrate '+this._canGoToLowerBitrate['b']+' '+this._canGoToLowerBitrate['src']);
	this.bitrateFromSource = this._canGoToLowerBitrate['b'];
	
	var seconds = this._currentTime/1000;
	
	var that = this;
	this['on']('loadedmetadata', function _onloadedmetadata(){
		that['off']('loadedmetadata', _onloadedmetadata);
		that['on']('seeked', function _onseeked(){
			that['off']('seeked', _onseeked);
			
			that['play']();
		});
		that.currentTime = seconds;
	});
	this['ss'](this._canGoToLowerBitrate['src']);
	
	
}



jsv.prototype._addPlayedRange = function(){
	
	var	_played = this._played;
	
	var currentEnd = this._currentTime/1000;
	if(this._playedFrom != currentEnd){
		var start = false;
		var end = false;
		var splice = false;
		for(var i=0;i<_played.length;i++){
			if(_played[i].end >= this._playedFrom){
			
				start = Math.min(this._playedFrom, _played[i].start);
				
				while(_played.length-1>=i){
					if(_played[i].start <= currentEnd){
						end = Math.max(currentEnd, _played[i].end);
						_played.splice(i, 1);
					}else{
						break;
					}
				}
				_played.splice(i, 0, {start:start, end:end});
				break;
			}
		}
		//insert at the end
		if(start === false){
			_played.push({start:this._playedFrom, end:currentEnd});
		}
	}
	return _played;
}

jsv.prototype._emit = function(type, detail, loop){
	
	if(detail === undefined){
		detail = null;
	}
	if(window['jsv_is_ww']){
		this.dispatchEvent(type, detail);
		if(loop == undefined){
			window.postMessage({'t':'event', 'n':type, 'args':detail});
		}
	}else{
		if(type == 'error'){
			this['error'] = this._error = detail;
		}
		var event = document.createEvent('CustomEvent');
		event.initCustomEvent(type, false, false, detail);
		this.dispatchEvent(event);
		if(this.jsv_ww && loop == undefined){
			this.jsv_ww.postMessage({'t':'event', 'n':type, 'args':detail});
		}	
		
	}
	
}


//on video seeked - frontend
jsv.prototype['ovs'] = function(targetTime, actualTime){
	
	this._currentTime = actualTime;
	
	if(this.audioNeedsPlaying){
		syncMedia(this.audioEl, (this._currentTime/1000-this._audioRTS), this.bind(this._onAfterAVSynced, this));
	}else{
		this._onAfterAVSynced();
	}
}


//frontend video and audio are synced after seeking
jsv.prototype._onAfterAVSynced = function(){
	this._playedFrom = this._currentTime/1000;
	this._seeking = false;
	
	this._seekingTo = NaN;
	
	//start decoding
	this.decodeFrame();
	
	var event = document.createEvent('CustomEvent');
	event.initCustomEvent('timeupdate', false, false, null);
	this.dispatchEvent(event);
	
	this._emit('seeked');
	
	if(this._playing || this._bsplaying){
		
		this._playing = this._wasplaying = true;
		if(this._readyState >= HAVE_FUTURE_DATA){
			this.startRendering();
		}
	}
	
}





jsv.prototype.__defineSetter__('currentTime', function(currentTime){
	if(this._seeking || this._live){
		return false;
	}
	
	
	if(!this['du']){
		//we need to throw an exception as per the spec
		this._toNoFramesState('v', 's');
		return true;
	}
	
	if(currentTime > this['du']){
		return this._onError('Time out of range', MediaError._MEDIA_ERR_DECODE);
	}
	
	if(this.audioNeedsPlaying && this['ial']){
		if(this._muted){
			this.mutedAudio = this.audioSrc;
			this.audioNeedsPlaying = false;
		}else{
			return false;
		}
	}
	
	if(this.audioNeedsPlaying){
		this.audioEl.pause();
		this.audioEl.currentTime = currentTime;
	}
	
	
	this._bsplaying = this._playing;

	this.stopRendering(true);
	
	//reset decoded frames
	this._decodedFrames = [];
	
	this._addPlayedRange();
	
	this._ended = false;
	
	this._stallingVideo = false;
	this._stallingAudio = false;
	
	this._seeking = true;
	this._seekingTo = currentTime;
	
	this._readyState = HAVE_METADATA;
	
	this._emit('seeking');
	
	this.setSharedVar('this','de',false);
	this.callBEF('sct', [currentTime]);
	
	
});
//set current time backend
jsv.prototype['sct'] = function(currentTime){
	this._seekingInProcess = true;
	this._seekingBackend = true;
	this._seekingTo = currentTime;
	
	this.decoder['seek'](currentTime);
	this._seekingInProcess = false;
}

jsv.prototype.__defineGetter__('loop', function(){
	return this._loop;
});

jsv.prototype.__defineSetter__('loop', function(loop){
	this._loop = loop;
});

jsv.prototype.__defineGetter__('autoplay', function(){
	return this._autoplay;
});

jsv.prototype.__defineSetter__('autoplay', function(autoplay){
	this._autoplay = autoplay;
});


//setters

jsv.prototype._onAudioStalled = function(){
	// console.log('_onAudioStalled');
	if(this._stallingAudio){
		return;
	}
	
	this._toNoFramesState('a');
	
	var that = this;
	
	syncMedia(this.audioEl, (this._currentTime/1000-this._audioRTS), function(){
		that._fromStalledState('a');
	});
	
}

var isAcContextLocked = true;

jsv.prototype.unlockAudioContext = function(){
	if(!isAcContextLocked){
		return true;
	}
	
	isAcContextLocked = false;
	
	var AudioContext = window.AudioContext || window.webkitAudioContext;
	
	if(AudioContext){
		
		var AC = new AudioContext();
		
		var buffer = AC.createBuffer(1, 1, 22050);
		var source = AC.createBufferSource();
		source.buffer = buffer;
		

		source.connect(AC.destination);
		var startFun = (typeof source['noteOn'] == 'function')?'noteOn':'start';
		source[startFun](0);
		window['jsv_AC'] = AC;
	}
}


jsv.prototype['unlockaudio'] = function(){
	this.audioEl.play();
	this.audioEl.pause();
	this.unlockAudioContext();
	this['ial'] = false;
	this._emit('audiounlocked');
}
//frontend from stalled state
jsv.prototype._fromStalledState = function(type){
	// console.log('from stalled state');
	this._emit('unstalled');
	
	if(type == 'v'){
		
			this._stallingVideo = false;
			
			if(!this._stallingAudio){
				this._playing = this._wasplaying;
			}
		
	}else{
		this._stallingAudio = false;
		if(!this._stallingVideo){
				
			this._playing = this._wasplaying;
			
			if(this._playing && this._readyState >= HAVE_FUTURE_DATA){
				//start rendering
				this.startRendering();
				
			}
			
		}
	}		
}
//frontend
//typeV: s - stalling (no frame and no data), w - waiting - no frames only
jsv.prototype._toNoFramesState = function(typeAV, typeV){
	// console.log('_toNoFramesState '+typeAV+' '+typeV);
	if(!this._stallingVideo && !this._stallingAudio){
		
		this._wasplaying = this._playing;
		this.stopRendering(true);
		
		if(this._readyState > HAVE_METADATA){
			this._readyState = HAVE_METADATA;
		}		
		
		if(typeAV == 'v' && typeV == 'w'){
			
			this._emit('waiting');
			
			this._waitingTimes++;
			
			if(this._waitingTimes > MAX_WAITINGS && this._canGoToLowerBitrate){
				this._goToLowerRate();
			}
			
		}else{
			this._emit('stalled');
		}
		
	}
	
	if(typeAV == 'v'){
		
		if(this._stallingVideo){
			return;
		}
		
		this._afterStalledVideo = true;
		this._stallingVideo = true;
		
		if(!this['ws']){
			this.audioEl.pause();
		}
		
		if(this['ws']){
			this._wsChunksInBuffer = 0;
		}
	}else{
		this._stallingAudio = true;
	}
	
}
jsv.prototype['log'] = function(){
	console.log.apply(console, arguments);
}
//frontend no data 
jsv.prototype['nd'] = function(){
	this._waitingForData = true;
	if(!this._decodedFrames.length){
		// console.log('no data and no frames avail');
		this._toNoFramesState('v', 's');
	}
}
//backend 
jsv.prototype.onNodata = function(start){
	this.callFEF('nd', null);
	if(!this['ws']){
		this.callBEF('ld', [start]);
	}
}

jsv.prototype.bind = function(f, v){
	return function(){
		return f.apply(v, arguments);
	}
}







jsv.prototype._onBufferRemoved = function(buffer){
	this._bytesLoaded -= buffer.data.byteLength;
	if(this._isHLS){
		var file = this._getHLSFileByStart(buffer.start);
		file.loaded = false;
		if(this._live){
			while(this._hls[0].start <= buffer.start ){
				this._hls.splice(0, 1);
			}
		}
	}
}




jsv.prototype['destroy'] = function(){
	this['reset']();
	delete this.audioEl;
	this.parentNode.removeChild(this);
	if(this.jsv_ww){
		this.jsv_ww.terminate();
	}
}


jsv.prototype._onError = function(m,c){
	
	MediaError['message'] = m;
	MediaError['code'] = c;
	this._error = MediaError;
	this._emit('error', this._error);
	return false;
}
/*
jsv.prototype._initDebug = function(){
	
	if(!document.body){
		return false;
	}
	
	console.log('initDebug');
	
	var that = this;
	
	var _getters = [
		'muted',
		'volume',
		'loop',
		'preload',
		'data-audio',
		'poster',
		'src',
		'autoplay',
		'buffered',
		'seeking',
		'controls',
		'currentSrc',
		'defaultMuted',
		'defaultPlaybackRate',
		'playbackRate',
		'duration',
		'ended',
		'networkState',
		'paused',
		'readyState',
		'seekable',
		'played',
		'error'
	];
	
	var methods = [
		'play',
		'pause',
		'load',
		'canPlayType'
	];
	
	var _setters = [
		'muted',
		'volume',
		'loop',
		'preload',
		'data-audio',
		'poster',
		'src',
		'autoplay',
		'controls',
		'currentTime',
		'defaultMuted',
		'defaultPlaybackRate',
		'playbackRate'
	];
	
	var events = [
			'srcchange',
			'bitratechange',
			'loadstart','progress','suspend','abort','error','emptied','stalled',
			'loadedmetadata','loadeddata','canplay','canplaythrough','playing','waiting','seeking',
			'seeked',
			'ended',
			'durationchange',
			'play',
			'pause',
			'ratechange',
			'resize',
			'volumechange',
			'unstalled'
		];
		
		
		var createFunctionSetter = function(name, type, original){
			
			return function(){
				
				var args = [];
				for(var i=0;i < arguments.length;i++){
					args.push(arguments[i]);
				}
				
				if(type == 'f'){
					eventLogger.innerHTML = 'called: '+name+'<br />'+eventLogger.innerHTML;
				}else if(type == 's'){
					eventLogger.innerHTML = 'set: '+name+' to '+args[0]+'<br />'+eventLogger.innerHTML;
				}else{
					eventLogger.innerHTML = 'get: '+name+'<br />'+eventLogger.innerHTML;
				}
				
				return original.apply(that, args);
			}
		}
		
		var eventLogger = document.createElement('div');
		
		eventLogger.style.position = 'absolute';
		eventLogger.style.backgroundColor = 'white';
		eventLogger.style.zIndex = 1000;
		eventLogger.style.width = '200px';
		eventLogger.style.top = '100px';
		eventLogger.style.right = '100px';
		eventLogger.style.borderWidth = '1px';
		eventLogger.style.borderColor = 'red';
		eventLogger.style.borderStyle = 'solid';
		eventLogger.style.padding = '5px';
		
		document.body.appendChild(eventLogger);
		// var eventLogger = document.getElementById('log');
		
		for(var i=0;i<events.length;i++){
			this.addEventListener(events[i], function(e){
				eventLogger.innerHTML = 'event: '+e.type+'<br />'+eventLogger.innerHTML;
				if(e.detail){
					eventLogger.innerHTML = 'detail: '+JSON.stringify(e.detail)+'<br />'+eventLogger.innerHTML;
				}
			});
		}
		
		for(var i=0;i<methods.length;i++){
			this[methods[i]] = createFunctionSetter(methods[i], 'f', this[methods[i]]);
		}
		for(var i=0;i<_setters.length;i++){
			
			Object.defineProperty(this, _setters[i], {
				set: createFunctionSetter(_setters[i], 's',  that.__lookupSetter__(_setters[i]))
			});
		}
		
		for(var i=0;i<_getters.length;i++){
			
			Object.defineProperty(this, _getters[i], {
				get: createFunctionSetter(_getters[i], 'g',  that.__lookupGetter__(_getters[i]))
			});
		}
		
		// for(var i=0;i<events.length;i++){
			// this.audio.addEventListener(events[i], function(e){
				// eventLogger.innerHTML = 'audio event: '+e.type+'<br />'+eventLogger.innerHTML;
			// });
		// }
	


}
*/



//fronend
jsv.prototype.onPageVisibilityChange = function( vi ){
	if(vi == 'hidden' && this._playing && this.audioNeedsPlaying){
		this['pause']();
		this.pausedBackground = true;
	}else if(vi == 'visible' && this.pausedBackground){
		this.pausedBackground = false;
		this['play']();
	}
}



// ----------------------------------------------------------------------------
// Loading via Ajax
//backend
jsv.prototype.loadAjax = function( start, end, repeat ) {
	
	if(repeat === undefined){
		repeat = true;
	}
	
	if(!this._isHLS){
		if(start === undefined){
			start = 0;
			//to fix
			end = '';
		} 
		if(!this._loader["stream"]){
			if(start%this['chunkSize']){
				if(this._loading && this._loadingRange.start == start && this._currentSrcMedia == this._loadingRange._currentSrcMedia){
					//already loading
					return false;
				}
				//only on chunk boundaries
				// console.log('Not on chunk boundaries '+start)
				start = Math.floor(start/this['chunkSize'])*this['chunkSize'];
			}
			if(end != ""){
				end = Math.ceil(end/this['chunkSize'])*this['chunkSize']-1;
			}
		}
		
		var startRange = start;
		var endRange = end;
		
	}else{
		startRange = start;
		endRange = end;
		// console.log('startRange '+startRange+' endRange '+endRange);
		start = 0;
		end = '';
	}
	if(this._loading && this._loadingRange.start == startRange && this._currentSrcMedia == this._loadingRange._currentSrcMedia){
		//already loading
		return false;
	}
	
	
	if(this._loading){
		this._loader['cancel']( this._requestId );
		this._emit('suspend');
	}
	
	
	this.setSharedVar('this','ns',NETWORK_LOADING);
	this._loading = true;
	this._loadingRange = {start:startRange, end:endRange, _currentSrcMedia:this._currentSrcMedia};
	
	
	
	var that = this;
	var url = this._currentSrcMedia;
	var request = {
					'bpc':this['chunkSize'],
					'mode':this._isHLS?'whole':'range',
					'bType':'arraybuffer',
					'start':start,
					'end':end,
					'url':this._currentSrcMedia,
					'onError':function(e){
						that._onError(e.detail.message, MediaError._MEDIA_ERR_NETWORK);
					},
					'ondata':function( response ){
						if(response['id'] != that._requestId){
							//request was cancelled
							return false;
						}
						//corrent end range
						if(that._loadingRange.end == ""){
							that._loadingRange.end = response["total"]-1;
						}
						
						response.url = url;
						that.onchunk(response);
						
					},
					'done':function( stats ){
						// console.log('done');
						if(stats['id'] != that._requestId){
							//request was cancelled
							return false;
						}
						that.setSharedVar('this','ns',NETWORK_IDLE);
						
						that._loading = false;
						if(repeat){
							// console.log('ld repeat '+(that._loadingRange.end+1));
							that['ld'](that._loadingRange.end+1);
						}
					}
				};
	this._requestId = this._loader['load']( request );	

};
	
//load next chunk
//backend
jsv.prototype['ld'] = function(start, bufferAdvance, repeat){
	if(start % 1 !== 0 && start !== undefined){
		throw Error('not int');
	}
	if(this['ws']){
		return false;
	}
	
	if(repeat === undefined){
		repeat = true;
	}
	
	
	//was called when a new buffer was set up
	if(bufferAdvance !== undefined && this._loading){
		return false;
	}
	
	
	if(this._isHLS){
		if(start === undefined){
			start = this._loadingRange.end+1;
		}
		var nextRange = this.getNextRangeToDownloadHLS(start);
		
	}else{
		
		nextRange = this.buffer.getNextRangeToDownload(start, this['chunkSize'], this._bytesInForwardBufferLimit, this._seekingBackend);
	}
	if(nextRange){
		this.loadAjax( nextRange.start, nextRange.end, repeat);
	}
}

jsv.prototype.getByteRanges = function(){
	if(!this.TiRa){
		this.TiRa = {};
		var that = this;
		this.TiRa.__defineGetter__('length', function(){
			var length = 0;
			if(that.startRange){
				length++;
				var range = that.startRange;
				while(range.nextItem){
					range = range.nextItem;
					length++;
				}
			}
			return length;
		});
		this.TiRa.start = function( ind ){
			var i = 0;
			var range = that.startRange;
			while(true){
				if(i == ind){
					return range.startDuration;
				}
				range = range.nextItem;
				i++;
			}
		};
		this.TiRa.end = function( ind ){
			var i = 0;
			var range = that.startRange;
			while(true){
				if(i == ind){
					return range.endDuration;
				}
				range = range.nextItem;
				i++;
			}
		};
	}
	return this.TiRa;
}
//frontend - add buffer
jsv.prototype['ab'] = function( range ) {
	//load first frame or start decoding if was stalling
	if((!this.firstFrameDecoded || this._waitingForData ) && !this._seeking){
		this._waitingForData = false;
		this.decodeFrame();
	} else {
		this._waitingForData = false;
	}
	
	range.nextItem = null;
	if(!this.startRange){
		this.startRange = range;
	}else if(range.start < this.startRange.start){
		if(range.end+1 == this.startRange.start){
			this.startRange.start = range.start;
			this.startRange.startDuration = range.startDuration;
		}else{
			range.nextItem = this.startRange;
			this.startRange = range;
		}
	}else{
		var nextRange = this.startRange;
		while(nextRange.nextItem && nextRange.nextItem.end < range.start ){
			nextRange = nextRange.nextItem;
		}
		
		var rangeAfter = nextRange.nextItem;
		//lower border
		if(nextRange.end+1 == range.start){
			nextRange.end = range.end;
			nextRange.endDuration = range.endDuration;
			var rangeBefore = nextRange;
		}else{
			nextRange.nextItem = range;
			rangeBefore = range;
		}
		//higher border
		if(rangeAfter && rangeBefore.end+1 == rangeAfter.start){
			rangeBefore.end = rangeAfter.end;
			rangeBefore.endDuration = rangeAfter.endDuration;
			rangeBefore.nextItem = rangeAfter.nextItem;
		}else{
			rangeBefore.nextItem = rangeAfter;
		}
	}
	
	this._emit('suspend');
	this._emit('progress');
}

//backend
jsv.prototype.onchunk = function( response ) {
	var _bytesLoaded = response.data.byteLength;
	this._loadingRange.start += _bytesLoaded;
	this._bytesLoaded += _bytesLoaded;
	
	if(!this._isHLS){
		this._contentLength = response.total;
		if(this._contentLength > FREE_MEMORY_LIMITBYTES){
			this.buffer._freeMemory = true;
		}
		response.startDuration = this['du']*response.start/response.total;
		response.endDuration = this['du']*response.end/response.total;
	}else{
		var file = this._getHLSFileByUrl(response.url);
		// file.byteLength = _bytesLoaded;
		file.loaded = true;
		response.start = file.start;
		response.end = file.end;
		response.startDuration = file.startDuration;
		response.endDuration = file.endDuration;
	}
	
	response.data = new Uint8Array(response.data);
	
	this.buffer.addBuffer(response);
	
	//meta
	if(!this._meta && this.decoder._initMeta()){	
		
		this._meta = true;
		
		this.buffer.startRange.startDuration = response.startDuration = this['du']*response.start/response.total;
		this.buffer.startRange.endDuration = response.endDuration = this['du']*response.end/response.total;
		
	}
	
	//buffer for buffered ranges
	this.callFEF('ab', [{
				start:response.start,
				end:response.end,
				startDuration:response.startDuration,
				endDuration:response.endDuration
			}]);
	
	
	//fully loaded
	if(this._contentLength == this._bytesLoaded){
		this.buffer._fullyLoaded = true;
		this._emit('loaded');
	}
	
	if(this._seekingBackend && !this._seekingInProcess){
		this['sct'](this._seekingTo);
	} 
	
};
//set var both in main thread and worker
jsv.prototype.setSharedVar = function(type, name, value) {
	if(type == 'this'){
		this[name] = value;
		var t = 'eq';
	}else{
		jsv_gl[name] = value;
		var t = 'jsv_gl';
	}
	if(this.jsv_ww){
		this.jsv_ww.postMessage({'t':t,'n':name, 'args': [value]});
	}else if(window['jsv_is_ww']){
		window.postMessage({'t':t,'n':name, 'args': [value]});
	}
}
jsv.prototype['load'] = function() {
	
	this._emit('abort');
	this._emit('emptied');
	// this['reset']();
	//stub
	this.callBEF('ld', null);
}

//frontend
jsv.prototype['in'] = function(){
	this.targetTime = Date.now()+this.frameDuration;
	this._firstPlayInit = true;
	this['play']();
}
jsv.prototype._onFirstPlay = function(){
	var that = this;
	
	this._firstPlay = false;
		
	if(this._live && this._isHLS && !this.audioNeedsPlaying){
		
		this._firstPlayInit = false;
		
		if(!this._hls.length){
			this['on']('vls', function on_VideoListSize(){
				that['off']('vls', on_VideoListSize);
				
				that.callBEF('ld', [that._hls[that._hls.length - that._hlsVideoListSize].start]);
				that._firstPlayInit = true;
				
				that['play']();
			});
		}
		
	}
	
	if(this.pendingAudioSrc){
		this.audioEl[_ccc_src] = this.pendingAudioSrc;
		this.pendingAudioSrc = false;
	}
	if(this.audioNeedsPlaying){
		if(this.audioType != 'ws'){
			
			this._firstPlayInit = false;
			syncMedia(this.audioEl, (this._currentTime/1000-this._audioRTS), function(){
				if(that._live && that.audioType == 'hls'){
					that._getLiveMeta();
				}else{
					that._firstPlayInit = true;
					that['play']();
				}
			});
		}else{
			this.audioEl.connect();
		}
	}
	if(this['ws'] && this['iv']){
		this._firstPlayInit = false;
		this.callBEF('sws', null);
	}
}
//frontend
jsv.prototype['play'] = function() {
	var that = this;
	if(this._error){
		return false;
	}
	if( this._playing ) { return; }
	this._wasplaying = true;
	
	if(this.audioNeedsPlaying && this['ial']){
		if(this._muted){
			this.mutedAudio = this.audioSrc;
			this.audioNeedsPlaying = false;
		}else{
			return false;
		}
	}
	if(this._stallingVideo || this._stallingAudio || this._seeking){
		return false;
	}
	if(this._firstPlay){
		this._onFirstPlay();
	}
	
	if(!this._firstPlayInit){
		//waiting
		return;
	}
	this._playing = true;
	
	if(this.audioNeedsPlaying){
		if(this.audioType == 'livehttp'){
			this.audioEl.load();
		}
	}
	
	if(this._ended){
		this._ended = false;
		this.currentTime = 0;
		return true;
		
	}
	
	setTimeout(function(){
			that._emit('play');
	}, 50);
	
	if(this._readyState >= HAVE_FUTURE_DATA){
		setTimeout(this.bind(this.startRendering, this), 51);	
	}
	
};

jsv.prototype['pause'] = function() {
	this._wasplaying = false;
	
	if(!this._playing){
		return false;
	}
	
	var that = this;
	
	this.stopRendering(true);
	
	if(this.audioNeedsPlaying){
		this.audioEl.pause();
	}
	
	setTimeout(function(){
			that._emit('pause');
	}, 1);
	
};


//front end decode frame
jsv.prototype.decodeFrame = function() {
	if(this.sendImageDataW){
		//send image data to worker first
		this.jsv_ww.postMessage({
					't':'func',
					'n':'imd',
					'args':[this.canvasContext.createImageData(this.frameWidth, this.frameHeight)]
				});
	}
	this.callBEF('df', null);
}
//next frame - decode next frame in a worker
jsv.prototype['df'] = function() {
	this.decoder.decodeFrame();
}
//front end
jsv.prototype.checkAVSync = function() {
	//this._currentTime is the time where a new frame needs to be displayed i.e. an upper boarder
	// 100 - audio needs to be slightly behind the picture
	var avTimeDiff = (this._currentTime - (this.frameDuration - (Date.now() - this.lastRenderTime))) - (this.audioEl.currentTime+this._audioRTS)*1000 + 100;
	
	
	if(avTimeDiff < -AV_SYNC_LIMIT){
			
		this.audioEl.pause();
		
		var that = this;
		window.clearTimeout(this.timeATimeout);
		this.timeATimeout = setTimeout(function(){
			if(that._playing){
				that.audioEl.play();
			}
		}, avTimeDiff);
		
	}else if(avTimeDiff > AV_SYNC_LIMIT){
		if(!this._live && this.audioEl.readyState < HAVE_FUTURE_DATA ){
			// /* for some reason audio was getting paused in vast/vpaid videojs plugin */
			if(this.audioEl.paused){
				this.audioEl.play();
			}else{
				return this._onAudioStalled();
			}
		}
		this.stopRendering(false);
		this.targetTime += avTimeDiff;
		this.lastRenderTime = Date.now() + avTimeDiff;
		
		var that = this;
		window.clearTimeout(this.timeVTimeout);
		this.timeVTimeout = setTimeout(this.bind(this.startRendering, this), avTimeDiff);
		
	}else{
		if(avTimeDiff < 0){
			this.targetTime -= Math.min(this.frameDuration/2, -avTimeDiff);
		}else{
			this.targetTime += avTimeDiff;
		}
	}
}
//front end
jsv.prototype.stopRendering = function(stopPlaying) {
	this._rendering = false;
	window.clearInterval(this._avSyncInt);
	window.clearTimeout(this.displayFrameToken);
	if(stopPlaying){
		this._playing = false;
	}
}
//front end
jsv.prototype.startRendering = function() {
	if(this._rendering){
		return false;
	}
	this._rendering = true;
	this._emit('playing');
	if(this.audioNeedsPlaying){
		this.audioEl.play();
		if(!this['ws']){
			this._avSyncInt = setInterval(this.bind(this.checkAVSync, this), AV_SYNC_INT);
		}
	}
	window.clearTimeout(this.displayFrameToken);
	
	if(!this._afterStalledVideo || !this['ws']){
		//do not update targettime in live web sockets
		this.targetTime = Date.now();
	}
	this._afterStalledVideo = false;
	this.displayFrame();
}
//front end
jsv.prototype.displayOneFrame = function() {
	
	//schedule next frame first
	var behind = Date.now() - this.targetTime;
	
	var scheduleTime = Math.max(0, this.frameDuration - behind);
	
	this.targetTime += this.frameDuration;
	
	var that = this;
	
	//get first decoded frame
	var _frame = this._decodedFrames.shift();
	if(!_frame){
		//decoder ended
		if(this['de']){
			return this._onEnded();
		}else{
			return this._toNoFramesState('v', (this._waitingForData?'s':'w'));
		}
	}
	//window.requestAnimationFrame(this.bind(this.nextFrame, this), this.canvasEl);
	if(this['igl']){
		var render_f = this.bind( this.renderFrameGL, this );
		requestAnimationFrame( function(){ render_f( _frame ); } );
		//requestAnimationFrame( this.bind( this.renderFrameGL, this ) );
	}else{
		requestAnimationFrame( this.bind( this.renderFrame2D, this ) );
	}
	
	//update time and raise event
	if(_frame['ts']){
		//sync time with gop header
		this._currentTime = _frame['ts'];
	}else{
		this._currentTime += this.frameDuraionNominal;
	}
	
	this.lastRenderTime = Date.now();
	
	var event = document.createEvent('CustomEvent');
	event.initCustomEvent('timeupdate', false, false, null);
	this.dispatchEvent(event);
	
	
	
	//start decoding
	// console.log('decodeFrame in displayFrame');
	this.decodeFrame();
}
jsv.prototype.displayFrame = function() {
	
	//schedule next frame first
	var behind = Date.now() - this.targetTime;
	
	var scheduleTime = Math.max(0, this.frameDuration - behind);
	
//	scheduleTime = 0;
	this.displayFrameToken = setTimeout(
		this.bind(this.displayFrame, this)
	, scheduleTime);
	
	this.targetTime += this.frameDuration;
	
	var that = this;
	
	//get first decoded frame
	var _frame = this._decodedFrames.shift();
	if(!_frame){
		//decoder ended
		if(this['de']){
			return this._onEnded();
		}else{
			return this._toNoFramesState('v', (this._waitingForData?'s':'w'));
		}
	}
	//window.requestAnimationFrame(this.bind(this.nextFrame, this), this.canvasEl);
	if(this['igl']){
		var render_f = this.bind( this.renderFrameGL, this );
		requestAnimationFrame( function(){ render_f( _frame ); } );
		//requestAnimationFrame( this.bind( this.renderFrameGL, this ) );
	}else{
		requestAnimationFrame( this.bind( this.renderFrame2D, this ) );
	}
	
	//update time and raise event
	if(_frame['ts']){
		//sync time with gop header
		this._currentTime = _frame['ts'];
	}else{
		this._currentTime += this.frameDuraionNominal;
	}
	
	this.lastRenderTime = Date.now();
	
	var event = document.createEvent('CustomEvent');
	event.initCustomEvent('timeupdate', false, false, null);
	this.dispatchEvent(event);
	
	
	
	//start decoding
	// console.log('decodeFrame in displayFrame');
	this.decodeFrame();
}









jsv.prototype.reInitCanvas = function(width, height) {	
	var c = document.createElement('canvas');
	if(this.canvasEl){
		this.canvasEl.parentNode.removeChild(this.canvasEl);
		c.width = width;
		c.height = height;
	}
	c.style.width = '100%';
	c.style.height = '100%';
	c.style['objectFit'] = 'contain';
	c.style.display = 'block';
	this.canvasEl = c;
	this.appendChild(this.canvasEl);
	this._emit('canvas');
}











// ----------------------------------------------------------------------------
//on frame
jsv.prototype['onf'] = function(_frame){
	if(window['jsv_is_ww'] || (!window['jsv_is_ww'] && !this.jsv_ww)){
		if(!this['igl']){
			//do converstion in worker or in main thread without worker
			var rgba = this.YCbCrToRGBA(_frame['ybr'][0], _frame['ybr'][1], _frame['ybr'][2]);
			if(window['jsv_is_ww']){
				//worker
				window.postMessage({
					't':'func',
					'n':'onf',
					'args':[{'rgba':rgba, 'ts':_frame['ts']}]
				});
			}else{
				//without worker
				this._decodedFrames.push({rgba:rgba, ts:_frame['ts']});
			}
		}else{
			if(window['jsv_is_ww']){
				//worker proxy ycbcr data to main thread for gl rendering
				window.postMessage({
					't':'func',
					'n':'onf',
					'args':[_frame]
				});
			}else{
				
				//main thread gl without worker
				this._decodedFrames.push( _frame );
			}
		}
		
	}else{
		
		if(!this.frameWidth){
			//src has changed
			return false;
		}
		
		if(this['igl']){
			//main thread gl from worker
			this._decodedFrames.push({ybr:[
													new Uint8Array(_frame['ybr'][0]),
													new Uint8Array(_frame['ybr'][1]),
													new Uint8Array(_frame['ybr'][2]),
												], ts:_frame['ts']});
		}else{
			//main thread 2d from worker
			this._decodedFrames.push({rgba:_frame['rgba'], ts:_frame['ts']});
		}
	}
	//fronend
	if(!window['jsv_is_ww'] ){
		
		
		this.firstFrameDecoded = true;
		
		//render first frame if we are not playing already
		if(!this.firstFrameRendered){
			this.firstFrameRendered = true;
			_frame = this._decodedFrames.shift();
			if(this['igl']){
				var render_f = this.bind( this.renderFrameGL, this );
				requestAnimationFrame( function(){ render_f( _frame ); } );
			}else{
				requestAnimationFrame( this.bind( this.renderFrame2D, this ) );
			}	
		}
		var _readyStatePrev = this._readyState;
		
		//decode next frame
		if(this._decodedFrames.length < MAX_DECODED_FRAMES){
			// console.log('decodeFrame in onf');
			if(!this._seeking){
				this.decodeFrame();
			}
			
			if(!this._decodedFrames.length){
				return;
			}else if( false && this._decodedFrames.length == 1){
				
				this._readyState = HAVE_CURRENT_DATA;
				
				if(!this._loadeddataed){
					this._loadeddataed = true;
					this._emit('loadeddata');
				}
			}else{
				this._readyState = HAVE_FUTURE_DATA;
				
				if(this._stallingVideo){
					//have enough data and decoded frame to start rendering
					this._fromStalledState('v');
				}
				
				if(_readyStatePrev < HAVE_FUTURE_DATA){
					this._emit('canplay');
					
					if(this._playing && !this._rendering){
						this.startRendering();
					}
				}
				
				
			}
		}else{
			
			this._readyState = HAVE_ENOUGH_DATA;
			
			if(_readyStatePrev < HAVE_ENOUGH_DATA){
				this._emit('canplaythrough');
			}
			
			if( this._autoplay && !this._autoplayed ) {
				this._autoplayed = true;
				this['play']();
			}
		}
		
		
		
		
		
		
	}
	
}

jsv.prototype.renderFrame2D = function() {
	this.canvasContext.putImageData(this.decodedFrame.rgba, 0, 0);
}

jsv.prototype.YCbCrToRGBA = function(pY, pCb, pCr) {	
	
	if(window['jsv_is_ww']){
		if(jsv_gl.worker_cap['sid']){
			var imagedata = new ImageData(this.frameWidth, this.frameHeight);
		}else{
			imagedata = this._imagedata.shift();
		}
	}else{
		imagedata = this.canvasContext.createImageData(this.frameWidth, this.frameHeight);
	}
	var pRGBA = imagedata.data;
	this.decoder.fillArray(pRGBA, 255);
	
	// Chroma values are the same for each block of 4 pixels, so we proccess
	// 2 lines at a time, 2 neighboring pixels each.
	// I wish we could use 32bit writes to the RGBA buffer instead of writing
	// each byte separately, but we need the automatic clamping of the RGBA
	// buffer.

	var yIndex1 = 0;
	var yIndex2 = this.codedWidth;
	var yNext2Lines = this.codedWidth + (this.codedWidth - this.frameWidth);

	var cIndex = 0;
	var cNextLine = this.halfWidth - (this.frameWidth >> 1);

	var rgbaIndex1 = 0;
	var rgbaIndex2 = this.frameWidth * 4;
	var rgbaNext2Lines = this.frameWidth * 4;
	
	var cols = this.frameWidth >> 1;
	var rows = this.frameHeight >> 1;

	var y, cb, cr, r, g, b, yuvr, yuvg, yuvb;

	for( var row = 0; row < rows; row++ ) {
		for( var col = 0; col < cols; col++ ) {
			cb = pCb[cIndex];
			cr = pCr[cIndex];
			cIndex++;
			
			// r = (cr + ((cr * 103) >> 8)) - 179;
			// g = ((cb * 88) >> 8) - 44 + ((cr * 183) >> 8) - 91;
			// b = (cb + ((cb * 198) >> 8)) - 227;
			
			y = pY[yIndex1++];
			
			yuvr = cr -128;
			yuvb = cb -128;

			yuvg = y  -16;
			r = yuvr * 1.59603;
			g = - 0.81297 * yuvr - 0.39176 * yuvb;
			b = yuvb * 2.01723;
			
			// Line 1
			
			pRGBA[rgbaIndex1] = r+yuvg * 1.16438;
			pRGBA[rgbaIndex1+1] = g+yuvg * 1.16438;
			pRGBA[rgbaIndex1+2] = b+yuvg * 1.16438;
			rgbaIndex1 += 4;
			
			y = pY[yIndex1++];
			
			yuvg = y  -16;
			r = yuvr * 1.59603;
			g = - 0.81297 * yuvr - 0.39176 * yuvb;
			b = yuvb * 2.01723;
			
			
			pRGBA[rgbaIndex1] = r+yuvg * 1.16438;
			pRGBA[rgbaIndex1+1] = g+yuvg * 1.16438;
			pRGBA[rgbaIndex1+2] = b+yuvg * 1.16438;
			rgbaIndex1 += 4;
			
			// Line 2
			y = pY[yIndex2++];
			
			yuvg = y  -16;
			r = yuvr * 1.59603;
			g = - 0.81297 * yuvr - 0.39176 * yuvb;
			b = yuvb * 2.01723;
			
			
			pRGBA[rgbaIndex2] = r+yuvg * 1.16438;
			pRGBA[rgbaIndex2+1] = g+yuvg * 1.16438;
			pRGBA[rgbaIndex2+2] = b+yuvg * 1.16438;
			rgbaIndex2 += 4;
			
			y = pY[yIndex2++];
			
			yuvg = y  -16;
			r = yuvr * 1.59603;
			g = - 0.81297 * yuvr - 0.39176 * yuvb;
			b = yuvb * 2.01723;
			
			
			pRGBA[rgbaIndex2] = r+yuvg * 1.16438;
			pRGBA[rgbaIndex2+1] = g+yuvg * 1.16438;
			pRGBA[rgbaIndex2+2] = b+yuvg * 1.16438;
			rgbaIndex2 += 4;
		}
		
		yIndex1 += yNext2Lines;
		yIndex2 += yNext2Lines;
		rgbaIndex1 += rgbaNext2Lines;
		rgbaIndex2 += rgbaNext2Lines;
		cIndex += cNextLine;
	}
	return imagedata;
};

jsv.prototype.renderFrameGL = function( _frame ) {
	/*console.log( "renderFrameGL" );
	if( !this.decodedFrame.ybr[0].inuse ){
		throw new Error( "not inuse" );
	}
	this.decodedFrame.ybr[0].inuse = false;
	return;*/
	//console.log( 'renderframe' );	
	var gl = this.gl;
	// WebGL doesn't like Uint8ClampedArrays, so we have to create a Uint8Array view for 
	// each plane
	//console.log( "rendering buffer id " + _frame.ybr[0].uid + " inused " + _frame.ybr[0].inuse );
	var uint8Y = _frame.ybr[0],
		uint8Cb = _frame.ybr[1],
		uint8Cr = _frame.ybr[2];
	//var fromTexture = 'length' in uint8Y == false;
	//console.log( 'renderFrameGL ' + (( 'length' in uint8Y == false ) ? 'from texture':'from array'));
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.useProgram( this.programRGBA );
	gl.uniform1f(this.uniforms_width, this.codedWidth);
	
	if( 'length' in uint8Y == false ) {
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, uint8Y);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, uint8Cb);
		
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, uint8Cr);

		gl.viewport(0, this.frameHeight - this.codedHeight, this.codedWidth, this.codedHeight);
		//console.log( "freeing buffer " + uint8Y.uid );
		uint8Y.inuse = false;
		//gl.viewport(0, 0, this.frameWidth, this.frameHeight);

	} else {
/*
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this._T);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, this.codedWidth, this.frameHeight, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, uint8Y);
		
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this._L);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, this.halfWidth, this.frameHeight/2, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, uint8Cb);
		
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this._N);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, this.halfWidth, this.frameHeight/2, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, uint8Cr);
*/	

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture( gl.TEXTURE_2D, this._T );
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.codedWidth / 4, this.frameHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, uint8Y);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this._L);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.halfWidth / 4, this.frameHeight/2, 0, gl.RGBA, gl.UNSIGNED_BYTE, uint8Cb);
		
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this._N);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.halfWidth / 4, this.frameHeight/2, 0, gl.RGBA, gl.UNSIGNED_BYTE, uint8Cr);
		
		gl.viewport(0, 0, this.codedWidth, this.frameHeight);
	}
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	_frame = null;
//	if( !fromTexture ) {
//		throw new Error( '!fromTexture' );
//	}
	
}



// ----------------------------------------------------------------------------
// Accelerated WebGL YCbCrToRGBA conversion

jsv.prototype.gl = null;
jsv.prototype.programRGBA = null;
jsv.prototype._T = null;
jsv.prototype._L = null;
jsv.prototype._N = null;

jsv.prototype.createTexture = function(index, name, program) {
		var gl = this.gl;
		var texture = gl.createTexture();
		
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		if(name){
			gl.uniform1i(gl.getUniformLocation(program, name), index);
		}
		
		return texture;
};

jsv.prototype.compileShader = function(type, source) {
	var gl = this.gl;
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	
	if( !gl.getShaderParameter(shader, gl.COMPILE_STATUS) ) {
		throw new Error(gl.getShaderInfoLog(shader));
	}
		
	return shader;
};

jsv.prototype.initWebGL = function() {
	// attempt to get a webgl context
	var opts = {preserveDrawingBuffer:true};
	try {
		var gl = this.gl = this.canvasEl.getContext('webgl', opts) || this.canvasEl.getContext('experimental-webgl', opts);
	} catch (e) {
		return false;
	}
	
	if (!gl) {
		return false;
	}

	
	// init buffers
	var buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);

	// The main YCbCrToRGBA Shader
	this.programRGBA = gl.createProgram();
	gl.attachShader(this.programRGBA, this.compileShader(gl.VERTEX_SHADER, SHADER_VERTEX_IDENTITY));
	gl.attachShader(this.programRGBA, this.compileShader(gl.FRAGMENT_SHADER, SHADER_FRAGMENT_YCBCRTORGBA));
	
	gl.linkProgram(this.programRGBA);
	
	if( !gl.getProgramParameter(this.programRGBA, gl.LINK_STATUS) ) {
		throw new Error(gl.getProgramInfoLog(this.programRGBA));
	}
	
	gl.useProgram(this.programRGBA);

	this.uniforms_width = gl.getUniformLocation(this.programRGBA, '_ae');
	// setup textures
	this._T = this.createTexture(0, '_T', this.programRGBA);
	this._L = this.createTexture(1, '_L', this.programRGBA);
	this._N = this.createTexture(2, '_N', this.programRGBA);
	
	var vertexAttr = gl.getAttribLocation(this.programRGBA, 'vertex');
	gl.enableVertexAttribArray(vertexAttr);
	gl.vertexAttribPointer(vertexAttr, 2, gl.FLOAT, false, 0, 0);
	
		
	return true;
};










