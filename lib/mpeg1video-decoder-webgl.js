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

(function(){
		//global variable shared between jsv instances
var jsv_gl = {};

if(window === undefined){
	var window=self;
}

if (window['document'] === undefined) {
	//web worker
	var console = {};
	
	console.log = function(){
		var args = [];
		for(var i=0;i < arguments.length;i++){
			args.push(arguments[i]);
		}
		window.postMessage({
			't':'func',
			'n':'log',
			'args':args
		});
	};
	//send meta capabilities
	jsv_gl.worker_cap = {
				'xhr':window.XMLHttpRequest !== undefined,
				'fet':window.fetch !== undefined && window.ReadableStream !== undefined,
				'sid':window.ImageData !== undefined
				// 'sid':false
			};
	window.postMessage({
			't':'func',
			'n':'wm',
			'args':[jsv_gl.worker_cap]
	});

	window['jsv_is_ww'] = true;
	var document = {};
	window['navigator'] = {'appVersion':'', 'userAgent':''};
	document.URL = 'http://a.ca';
	//
} else {
	document = window['document'];
	console = window['console'];
	
	window['jsv_is_ww'] = false;
	
	if(window.Worker){
		//always use worker
		var URL = window.URL || window.webkitURL,
		scripts = document.getElementsByTagName("script");
		jsv_gl.worker_url = jsv_gl.worker_blob = false;
		for( var i = 0; i < scripts.length; i++ ) {
			if( scripts[i].src.indexOf('jsv') != -1 ) {
				jsv_gl.worker_url = scripts[i].src;
				var cont = "self.importScripts('" + jsv_gl.worker_url + "');";
				break;
			}
			if( !jsv_gl.worker_url ) {
				cont = scripts[scripts.length-1].textContent;
			}
			
		}	
		
		if(URL !== undefined){
			//supress closure conformance
			var _closureWA = 'createObjectURL';
			jsv_gl.worker_blob = URL[_closureWA](
					new Blob(
						[cont],
						{ type: "text/javascript" }
					)
				);
		}
		// jsv_gl.worker_url = scripts[scripts.length-1].src;
	}
	
}
		(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
								   
    }
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());
		(function(window){	

	
	window['ez_dis'] = function(ojbect){
		ojbect.events = {};

		ojbect['on'] = ojbect.addEventListener = function(name, handler) {
			//
			if (this.events.hasOwnProperty(name))
				this.events[name].push(handler);
			else
				this.events[name] = [handler];
			this['go']('on', {'event':name, 'count':this.events[name].length});
		};

		ojbect['off'] = ojbect.removeEventListener = function(name, handler) {
			/* This is a bit tricky, because how would you identify functions?
			   This simple solution should work if you pass THE SAME handler. */
			if (!this.events.hasOwnProperty(name))
				return;
			
			var that = this;
			setTimeout(function(){
				var index = that.events[name].indexOf(handler);
				if (index != -1)
					that.events[name].splice(index, 1);
				that['go']('off', {'event':name, 'count':that.events[name].length});
			}, 0);
		};

		ojbect['go'] = ojbect.dispatchEvent = function(name, args) {
			if (!this.events.hasOwnProperty(name))
				return;
			
			var e = {};
			e.detail = args;

			var evs = this.events[name], l = evs.length;
			for (var i = 0; i < l; i++) {
				evs[i].apply(null, [e]);
			}
		};
	}
})(window);
		(function(window) {
	
	if (window['jsv_is_ww']) {
		//we are in a web worker
		return; 
	}
	
	var urlToD = function( _url )
	{
		return _url.split('/')[2];
	}
	//set up event dispatcher
	var eventDispater = {};
	window['ez_dis'](eventDispater);
	eventDispater['on']('on', function(e){
		if(e.detail['event'] == 'unlocked' && e.detail['count'] == 1){
			setUpUnlocking();
		}
	});
	
	window['ez_unlock'] = eventDispater;
	
	var isIframe = (window.location!=top.location && urlToD( document.referrer ) == urlToD( document.URL ));


	var setUpUnlocking = function(){
		var events = ['touchstart', 'touchend', 'mousedown', 'keydown'];
		unlockAudio = function() {
			events.forEach(function (event) {
				document.documentElement.removeEventListener(event, unlockAudio );
				if(isIframe){
					window.parent.removeEventListener(event, unlockAudio );
				}
			  });
			  eventDispater.dispatchEvent('unlocked', null);
		};
		events.forEach(function (event) {
		  document.documentElement.addEventListener(event, unlockAudio, false);
			if(isIframe){
				window.parent.addEventListener(event, unlockAudio, false);
			}
		});
		
		
	}
	
	
})(window);
		(function(window) {
	var func = 'ez_vi';
	window[func] = function(){};
	
  var hidden = "hidden";

  // Standards:
  if (hidden in document)
    document.addEventListener("visibilitychange", onchange);
  else if ((hidden = "mozHidden") in document)
    document.addEventListener("mozvisibilitychange", onchange);
  else if ((hidden = "webkitHidden") in document)
    document.addEventListener("webkitvisibilitychange", onchange);
  else if ((hidden = "msHidden") in document)
    document.addEventListener("msvisibilitychange", onchange);
  // IE 9 and lower:
  else if ("onfocusin" in document)
    document.onfocusin = document.onfocusout = onchange;
  // All others:
  else
    window.onpageshow = window.onpagehide
    = window.onfocus = window.onblur = onchange;

  function onchange (evt) {
    var v = "visible", h = "hidden",
        evtMap = {
          focus:v, focusin:v, pageshow:v, blur:h, focusout:h, pagehide:h
        };

    evt = evt || window.event;
    if (evt.type in evtMap)
      window[func](evtMap[evt.type]);
    else
      window[func](this[hidden] ? "hidden" : "visible");
  }

  
  // set the initial state (but only if browser supports the Page Visibility API)
  // if( document[hidden] !== undefined )
    // onchange({type: document[hidden] ? "blur" : "focus"});
})(window);
		if (!ArrayBuffer.prototype.slice){
	ArrayBuffer.prototype.slice = function (start, end) {
		var that = new Uint8Array(this);
		if (end === undefined) end = that.length;
		var result = new ArrayBuffer(end - start);
		var resultArray = new Uint8Array(result);
		for (var i = 0; i < resultArray.length; i++)
		   resultArray[i] = that[i + start];
		return result;
	}
}
		(function(window){
	
	// var eventDispacher = {};
	// window["ez"]["dis"](eventDispacher);
	
	// eventDispacher._emit = function(type, detail){

		// if(detail === undefined){
			// detail = null;
		// }
		// this.dispatchEvent(type, detail);
		
	// }
	
	var request_id = 0;
	var cap_xhrType = "arraybuffer";
	var cap_xhr_streaming = false;
	var cap_streaming = false;
	var strategy = ("fetch" in window && "ReadableStream" in window)?'f':'x';
	
	
	if(strategy == 'x'){
		var xhr = getXhr();
		var types = ["moz-chunked-arraybuffer","ms-stream"];
		for(var type in types){
			if(checkTypeSupport(xhr, types[type])){
				break;
			}
		}
	}
	
	function checkTypeSupport (xhr, type) {
		try {
			xhr.responseType = type;
			if(xhr.responseType === type){
				cap_xhrType = type;
				cap_xhr_streaming = true;
				return true;
			}
		} catch (e) {}
		return false;
	}
	// strategy = 'x';
	// cap_xhr_streaming = false;
	cap_streaming = strategy == "f" || cap_xhr_streaming;
	
	// 
	
	function getXhr() {
		var xhr;
		if (window.XMLHttpRequest)
		{
			xhr = new window.XMLHttpRequest;
		}
		else if(window.ActiveXObject)
		{
			try
			{
				xhr=new ActiveXObject("Msxml2.XMLHTTP");
			}
			catch (e)
			{
				xhr=new ActiveXObject("Microsoft.XMLHTTP");
			}
		}
		return xhr;	
	}
	
	
	
	var optionsMap = {
		bType:"bType",
		modeR:"mode",
		startR:"start",
		endR:"end",
		bpc:"bpc",
		urlR:"url",
		ondata:"ondata",
		onError:"onError",
		doneR:"done"
	};
	
	var defaultOptions = {
		'bType':'arraybuffer',
		'mode':'range',
		'onError':function(e){throw new Error(e)},
		'bpc':100000,
		'start':0,
		'end':''
	};
	
	window["ez_http"] = function(){
		return new ez_http();
	}
	var ez_http = function(){
		this["stream"] = cap_streaming;
		this.requests = [];
	}
	ez_http.prototype["cancel"] = function(id){
		for(var i=0; i < this.requests.length;i++){
			if(this.requests[i].id == id){
				this.requests[i].loader.cancel();
				return true;
			}
		}
		return false;
	}
	ez_http.prototype["load"] = function(requestOptions){
		// 
		var request = {};
		var expandedOptions = {};
		for(var opt in optionsMap){
			if(optionsMap[opt] in requestOptions){
				// 
				expandedOptions[opt] = requestOptions[optionsMap[opt]];
			}else{
				expandedOptions[opt] = defaultOptions[optionsMap[opt]];
			}
		}
		request.id = expandedOptions.id = request_id++;
		//text requests through xhr only
		request.loader = (strategy == 'f' && expandedOptions.bType == "arraybuffer" && expandedOptions.modeR != "whole")?new fetchLoader(expandedOptions):new xhrLoader(expandedOptions);
		request.requestOptions = expandedOptions;
		this.requests.push(request);
		return request.id;
	}
	
	var fetchLoader = function(requestOptions){
		this.totalR = 0;
		this.startR = requestOptions.startR;
		this.endR = requestOptions.endR;
		this.isActive = true;
		this.firstChunk = true;
		this.requestOptions = requestOptions;
		var headers = new Headers();
		if(requestOptions.modeR == 'range' && (requestOptions.startR != 0 || requestOptions.endR != "")){
			//we need a range request
			headers.append("Range", "bytes="+requestOptions.startR+"-"+requestOptions.endR);
		}
		var _this = this;
		fetch(requestOptions.urlR, {"headers":headers}).then(function (res) {
			if(_this.firstChunk){
				if(!_this.onFirstChunk(res)){
					return false;
				}
			}
			_this.reader = res.body.getReader();
			return _this.pump(_this.reader);
		})
		// .catch(function (e) {
			// 
			// requestOptions.onError(e);
		// });
	}
	
	fetchLoader.prototype.onFirstChunk = function(res) {
		this.firstChunk = false;
		
		if(!res.ok){
			this.requestOptions.onError({ 'detail':{ 'id':this.requestOptions.id,'message': this.requestOptions.urlR+' returned '+res.statusText }});
			return false;
		}
	
		
		var range = res.headers.get("Content-Range");
		if(range)
		{
			this.totalR = range.split('/')[1];
		}
		else
		{
			
			//no support for byte range
			this.endR = this.totalR = res.headers.get("Content-Length");
			if(!this.totalR && this.requestOptions.modeR == 'range'){
				this.requestOptions.onError({ 'detail':{'id':this.requestOptions.id,'message': 'No size for '+this.requestOptions.urlR }});
				return false;
			}
		}
		if(this.endR == '' || this.endR >= this.totalR)
		{
			this.endR = this.totalR-1;
		}
		return true;
	}
	fetchLoader.prototype.cancel = function() {
		this.isActive = false;
		if(this.reader){
			this.reader.cancel();
		}
	}
	fetchLoader.prototype.pump = function(reader) {
		if(!this.isActive){
			this.reader.cancel();
			return;
		}
		var _this = this;
        return reader.read().then(function (result) {
            if (result['done']) {
				_this.requestOptions.doneR({
						"id":_this.requestOptions.id
						});
                return;
            }
			var length = result.value.byteLength;
			_this.requestOptions.ondata({
							"url":_this.requestOptions.urlR,
							"total":_this.totalR,
							"end":_this.startR+length-1,
							"start":_this.startR,
							"id":_this.requestOptions.id,
							"data":result.value
					});
			_this.startR += length;		
            // 
			return _this.pump(reader);
        });
    }
	
	var xhrLoader = function(requestOptions){
		this.firstChunk = true;
		this.streaming = cap_xhr_streaming && requestOptions.bType != 'text' && requestOptions.modeR != 'whole';
		this.totalR = 0;
		this.startR = requestOptions.startR;
		this.endR = requestOptions.endR;
		this.isActive = true;
		this.requestOptions = requestOptions;
		this.loadR();
	}
	
	xhrLoader.prototype.onFirstChunk = function(xhr) {
		this.firstChunk = false;
		if(xhr.status < 200 || (xhr.status >= 300 && xhr.status != 304)){
			this.requestOptions.onError({ 'detail':{ 'id':this.requestOptions.id,'message': this.requestOptions.urlR+' returned '+xhr.status+' '+xhr.getAllResponseHeaders().replace('\r\n',' ') }});
			return false;
		}
		
		var range = xhr.getResponseHeader("Content-Range");
		if(range)
		{
			this.totalR = range.split('/')[1];
		}
		else
		{
			
			//no support for byte range
			this.endR = this.totalR = xhr.getResponseHeader("Content-Length");
			if(!this.totalR && this.requestOptions.modeR == 'range'){
				this.requestOptions.onError({ 'detail':{ 'id':this.requestOptions.id,'message': 'No size for '+this.requestOptions.urlR+' '+xhr.getAllResponseHeaders().replace('\r\n',' ') }});
				return false;
			}
					
		}
		if(this.endR == '' || this.endR >= this.totalR)
		{
			this.endR = this.totalR-1;
		}
		return true;
	}
	xhrLoader.prototype.onload = function(xhr) {
		if(!this.isActive){
			return;
		}
		
		if(this.firstChunk){
			if(!this.onFirstChunk(xhr)){
				return false;
			}
		}
	
		if(this.requestOptions.bType == 'text')
		{
			// if(easy_stream_Helper.isIE())
			// {
				// var easy_responseBody = thatthis.easy_bitsLoader_bin2arr(xhr.responseBody);
			// }
			// else
			// {
				easy_responseBody = xhr.responseText;
			// }
			var length = easy_responseBody.length;
		}
		else if(!this.streaming)
		{
			easy_responseBody = xhr.response;
			length = easy_responseBody.byteLength;
		}
		//sending the data
		if(length && !this.streaming)
		{
			//response object
			this.requestOptions.ondata({
							"url":this.requestOptions.urlR,
							"total":this.totalR,
							"end":this.startR+length-1,
							"start":this.startR,
							"id":this.requestOptions.id,
							"data":easy_responseBody
					});
					
			this.startR += length;
		}
		
		this.loadR();
		
	}
	
	xhrLoader.prototype.loadR = function() {
		if((this.totalR && this.startR >= this.totalR) || (this.endR != '' && this.startR >= this.endR)){
			this.requestOptions.doneR({
						"id":this.requestOptions.id
						});
			return;
		}
		if(this.streaming){
			var endR = this.endR;
		}else{	
			endR = this.startR+this.requestOptions.bpc-1;
			if(this.endR != '' && endR > this.endR){
				endR = this.endR;
			}
		}
		this.ajax(endR);
	}
	
	xhrLoader.prototype.cancel = function() {
		if(this.xhr){
			this.xhr.abort();
		}
		this.isActive = false;
	}
	
	xhrLoader.prototype.ajax = function(endR) {
		
		var _this = this;
		
		var range = this.requestOptions.modeR == 'range' && (this.startR != 0 || endR != "");
		
		var xhr = this.xhr = getXhr();
		
		var urlB = this.requestOptions.urlR;
		
		if(range){
			//safari cache workaround
			urlB = (urlB.indexOf('?') == -1)?urlB+'?bytes='+this.startR+endR:urlB+'&bytes='+this.startR+endR;
		}
		
		xhr.open("GET", urlB, true);
		
		if(range){
			//make range requests
			xhr.setRequestHeader("Range", "bytes="+this.startR+"-"+endR);
		}
		
		if(this.requestOptions.bType == 'text')
		{
			if(!(navigator.appVersion.indexOf("MSIE") != -1 || !!navigator.userAgent.match(/Trident.*rv 11\./)))
			{
				xhr.overrideMimeType("text/plain; charset=x-user-defined");
			}
		}
		else
		{
			xhr.responseType = cap_xhrType;
		}
		
		
		var onStateChange = function (e)
		{
			if (xhr.readyState == 4)
			{
				_this.onload( xhr );
			}
		};
		if (xhr.onload !== undefined)
		{
			xhr.onload = onStateChange;
		}
		else
		{
			xhr.onreadystatechange = onStateChange;
		} 
		
		if(this.streaming){
			//streaming in chunks
			xhr.onprogress = function(){
				
				if(_this.firstChunk){
					if(!_this.onFirstChunk(xhr)){
						return false;
					}
				}
				
				_this.requestOptions.ondata({
							"url":_this.requestOptions.urlR,
							"total":_this.totalR,
							"end":_this.startR+xhr.response.byteLength-1,
							"start":_this.startR,
							"id":_this.requestOptions.id,
							"data":xhr.response
					});
				_this.startR += xhr.response.byteLength;
				// 
			};
		}
		xhr.send();
	}
	
})(window);

		
		(function(window){ //'use strict';
		var AV_SYNC_LIMIT_S = 0.1;

function syncMedia(media, targetTime, onsync){
		var count = 0;
		//no metadata yet, cannot seek
		if(media.readyState < HAVE_METADATA){
			media.load();
			media.addEventListener('loadedmetadata', function _onmeta(){
				media.removeEventListener('loadedmetadata', _onmeta);
				syncMedia(media, targetTime, onsync);
			});
			return;
		}
		
		if(Math.abs(media.currentTime - targetTime) < AV_SYNC_LIMIT_S){
			onsync(media);
		}else{
			var _onstalled = function(){
				media.currentTime = targetTime;
			}
			
			media.addEventListener('seeked', function _seeked(){
				if(Math.abs(media.currentTime - targetTime) > AV_SYNC_LIMIT_S){
					count++;
					if(count < 3){
						media.currentTime = targetTime;
						return;
					}
				}
				media.removeEventListener('seeked', _seeked);
				media.removeEventListener('stalled', _onstalled);
				onsync(media);
			});
			media.addEventListener('stalled', _onstalled);
			media.addEventListener('playing', function _onplaying(){
				media.removeEventListener('playing', _onplaying);
				media.pause();
				media.currentTime = targetTime;
			});
			media.play();
		}
	}
			// Bit Reader 
var BitReader = function() {
	
	window['ez_dis'](this);
	
	this.log = '';
	
	this._ws = false;
	this._live = false;
	this._hls = false;
	this.NextMPEGStartCodeLimit = 0;
	this._freeMemory = false;
	
	this.freeBuffers();
};

BitReader.prototype.freeBuffers = function(){

	this.bufferLengthTotal = 0;
	this.bufferLength = 0;
	
	this._fullyLoaded = false;
	
	this.previousBuffer = NaN;
	this.currentBuffer = NaN;
	
	this.startBuffer = NaN;
	this.endBuffer = NaN;
	
	this.TiRa = null;
	this.startRange = NaN;
	this.endRange = NaN;
	
	this.index = 0;
	this.indexInBuffer = 0;
	
}

BitReader.NOT_FOUND = -1;
BitReader.STALLING = -2;

BitReader.prototype.getBytes = function( n_bytes ){
	this.byte_align();
	var start = this.indexInBuffer >> 3;	
	if( this.bufferLength - start >= n_bytes ){
		var subbuffer = this.currentBuffer.data.subarray( start, start + n_bytes );
		this.advance( n_bytes << 3 );
	} else {
		subbuffer = new Uint8Array( n_bytes );
		var copied = 0;
		while( copied < n_bytes ) {
			var needed = n_bytes - copied;
			if( needed < this.bufferLength - start ) {
				var end = start + needed;
				copiedIt = needed;
			} else {	
				end = 0;
				copiedIt = this.bufferLength - start;
			}
			if(start || end) {
				if( !end ) {
					end = this.bufferLength;
				}
				//JSV.log( 'copied start ' + start + ' end ' + end + ' length ' + this.currentBuffer.data.byteLength );
				//JSV.log( 'copied ' + copied + ' needed ' + n_bytes );
				subbuffer.set( this.currentBuffer.data.subarray( start, end ), copied ); 
			} else {
				//JSV.log( 'copied whole' );
				subbuffer.set( this.currentBuffer.data, copied );
			}
			copied += copiedIt;
			this.advance( copiedIt << 3 );
			start = 0;
		}
	}
	//JSV.log( 'first byte ' + subbuffer[0] );
	return subbuffer;
}

BitReader.prototype.get16 = function() {
	var v  = this.getBits( 16 );
	if( v > 32767 ) {
		v -= 65536;
	}
	return v;
}

BitReader.prototype.byte_align = function(){
	var bit;
	if( bit = ( this.index % 8) ) {
		this.advance( 8 - bit );
	}
}

BitReader.prototype.read_sint = function(){
	var value = this.read_uint();
	if( value != 0 ) {
		if( this.getBits( 1 ) == 1 ) {
			value = -value;
		}
	}
	return value;
}

BitReader.prototype.read_uint = function(){
	var value = 1;
	while( this.getBits( 1 ) == 0 ) {
		value <<= 1;
		if( this.getBits( 1 ) == 1 ) {
			value += 1;
		}
	}
	value -= 1;
	return value;
}	

//checks if nBytes are available in buffer from current pos and signals stalled event
BitReader.prototype['has'] = function(nBytes) {
	if(!this.currentBuffer){
		this.onStalled(0);
		return false;
	}
	
	var has = this.currentBuffer.data.byteLength-(this.indexInBuffer >> 3);
	
	
	if(this._ws){
		//for websockets just check we have some space
		return (has > 8 || this.currentBuffer.nextItem);
	}
	
	var nextItem = this.currentBuffer;
	
	while(nextItem.nextItem && nextItem.end+1 == nextItem.nextItem.start){
		has += nextItem.nextItem.data.byteLength;
		nextItem = nextItem.nextItem;
	}
	//second condition needed for the last picture
	if(has >= nBytes || (nextItem.end+1 == this.bufferLengthTotal)){
		return has;
	}else{
		this.onStalled(nextItem.end+1);
		return false;
	}
}
// BitReader.prototype.dumpIndeces = function() {
	// this.dump = {};
	// this.dump.bufferLengthTotal = this.bufferLengthTotal;
	// this.dump.bufferLength = this.bufferLength;
	
	// this.dump.previousBuffer = this.previousBuffer;
	// this.dump.currentBuffer = this.currentBuffer;
	
	// this.dump.buffer = this.currentBuffer;
	// this.dump.index = this.index;
	// this.dump.indexInBuffer = this.indexInBuffer;
// }
// BitReader.prototype.restoreIndeces = function() {
	// this.bufferLengthTotal = this.dump.bufferLengthTotal;
	// this.bufferLength = this.dump.bufferLength;
	
	// this.previousBuffer = this.dump.previousBuffer;
	// this.currentBuffer = this.dump.currentBuffer;
	
	// this.currentBuffer = this.dump.buffer;
	// this.index = this.dump.index;
	// this.indexInBuffer = this.dump.indexInBuffer;
// }

BitReader.prototype.onStalled = function(start){
	this.go('stalled', start);
}

BitReader.prototype._onBufferAdvance = function(){
	this.go('bufferadvance', null);
	if(this._freeMemory){
		var n;
		if(n = this.getNumberOfBuffersToBeRemoved()){
			this.removeBuffersByNumber(n);
		}
	}
}

BitReader.prototype.removeBuffersByNumber = function(number){
	var nextItem = this.startBuffer;
	
	for(var i=0;i < number;i++){
		this.go('bufferremoved', nextItem);
		nextItem = nextItem.nextItem;
	}
	//remove reference - garbage collector ?
	
	this.startBuffer = nextItem;
	
	var range = this.startRange;
	while(range.nextItem && range.nextItem.start <= this.startBuffer.start){
		range = range.nextItem;
	}
	
	range.start = this.startBuffer.start;
	range.startDuration = this.startBuffer.startDuration;
	
	this.startRange =  range;
	// 
}

BitReader.prototype.getNumberOfBuffersToBeRemoved = function(){
	
	var bufferLengths = [];
	var bytesInBackwardBuffer = 0;
	
	var nextItem = this.startBuffer;
	while(nextItem && nextItem.start < this.currentBuffer.start){
		bufferLengths.push(nextItem.data.byteLength);
		nextItem = nextItem.nextItem;
	}
	var numberOfBuffersToRemove = bufferLengths.length-1;
	while(numberOfBuffersToRemove>0 && bytesInBackwardBuffer<this._bytesInBackwardBufferLimit){
		bytesInBackwardBuffer += bufferLengths[numberOfBuffersToRemove];
		
		numberOfBuffersToRemove--;
		// 
	}
	
	return (numberOfBuffersToRemove > 0)?numberOfBuffersToRemove:0;
}

BitReader.prototype.getNextRangeToDownload = function(start, chunkSize, _bytesInForwardBufferLimit, seeking){
	//what if the file was loaded to the end without the begging ?
	if(start === undefined){
		start = Math.floor(this.index >> 3);
	}
		
	if((this.bufferLengthTotal && start >= this.bufferLengthTotal) || this._fullyLoaded){
		return false;
	}
	if(this.endBuffer.end+1 == start){
		var s = start;
		var end = '';
	}else{
		var nextItem = this.startBuffer;
		var prev = this.startBuffer;
		while(nextItem && nextItem.start < start){
			prev = nextItem;
			nextItem = nextItem.nextItem;
		}
		if(prev.start <= start && prev.end+1 >= start){
			if(nextItem && prev.end+1 == nextItem.start){
				while(nextItem && prev.end+1 == nextItem.start){
					prev = nextItem;
					nextItem = nextItem.nextItem;
				}
			}
			s = prev.end+1;
		}else{
			s = start;
		}
		if(nextItem){
			end = nextItem.start-1;
		}else{
			end = '';
		}
	}
	// 
	//limit buffer
	var limit = ((!this.currentBuffer || seeking)?s:this.currentBuffer.end+1)+_bytesInForwardBufferLimit-1;
	if(s > limit ){
		return false;
	}
	// if(end > limit || end == ''){
	if(end > limit){
		end = limit;
	}
	
	if(this.bufferLengthTotal && s >= this.bufferLengthTotal){
		return false;
	}
	
	return {start:s, end:end};
}


// BitReader.prototype.dumpRanges = function(){
	// 
	// var range = this.startRange;
	// var i = 0;
	// while(range){
		// 
		// range = range.nextItem;
		// i++;
	// }
// }

// BitReader.prototype.dumpForwardBuffers = function() {
	// var buffer = this.currentBuffer;
	// var count = 0;
	// while(buffer){
		// count++;
		// 
		// buffer = buffer.nextItem;
	// }
	// return count;
// }	
// BitReader.prototype.dumpBuffers = function() {
	// var buffer = this.startBuffer;
	// 
	// if(this.currentBuffer){
		// 
	// }
	// while(buffer){
		// 
		// buffer = buffer.nextItem;
	// }
// }
BitReader.prototype.addBuffer = function( response ) {
	
	if(this._live){
		this.bufferLengthTotal += response.total;
	}else{
		this.bufferLengthTotal = response.total;
	}
	
	
	this.NextMPEGStartCodeLimit = (this.bufferLengthTotal-4) << 3;
	
	response.nextItem = null;
	
	// 
	
	if(!this.startBuffer){
		// 
		//first buffer
		this.startBuffer = response;
		this.endBuffer = this.startBuffer;
		this.currentBuffer = this.startBuffer;
		this.bufferLength = this.startBuffer.data.byteLength;
		
		this.startRange = {start:response.start, end: response.end, nextItem:null, startDuration:response.startDuration, endDuration: response.endDuration};
		this.endRange = this.startRange;
		
	}else{
		//above
		if(this.endBuffer.end+1 <= response.start){
			// 
			this.endBuffer.nextItem = response;
			this.endBuffer = this.endBuffer.nextItem;
			
			if(this.endRange.end+1 == response.start){
				// 
				this.endRange.end = response.end;
				this.endRange.endDuration = response.endDuration;
			}else{
				// 
				var newRange = {start:response.start, end: response.end, nextItem:null, startDuration:response.startDuration, endDuration: response.endDuration};
				this.endRange.nextItem = newRange;
				this.endRange = this.endRange.nextItem;
			}
			
		}else if(this.startBuffer.start >= response.end+1){
			// 
			//below
			response.nextItem = this.startBuffer;
			this.startBuffer = response;
			
			if(this.startRange.start == response.end + 1){
				this.startRange.start = response.start;
				this.startRange.startDuration = response.startDuration;
			}else{
				var newRange = {start:response.start, end: response.end, nextItem:null, startDuration:response.startDuration, endDuration: response.endDuration};
				newRange.nextItem = this.startRange;
				this.startRange = newRange;
			}
			
		}else{
			// 
			//middle
			var startBuffer = this.startBuffer;
			var prev = this.startBuffer;
			while(startBuffer.end < response.start){
				prev = startBuffer;
				startBuffer = startBuffer.nextItem;
			}
			response.nextItem = startBuffer;
			prev.nextItem = response;
			
			//ranges
			var nextItem = this.startRange;
			prev = this.startRange;
			
			while(nextItem && nextItem.end < response.start){
				prev = nextItem;
				nextItem = nextItem.nextItem;
			}
			if((prev.end+1 == response.start) && (nextItem.start == response.end+1)){
				//merge
				prev.end = nextItem.end;
				prev.endDuration = nextItem.endDuration;
				prev.nextItem = nextItem.nextItem;
			}else if(prev.end+1 == response.start){
				prev.end = response.end;
				prev.endDuration = response.endDuration;
			}else if(nextItem.start == response.end+1){
				nextItem.start = response.start;
				nextItem.startDuration = response.startDuration;
			}else{
				var newRange = {start:response.start, end: response.end, nextItem:null, startDuration:response.startDuration, endDuration: response.endDuration};
				newRange.nextItem = prev.nextItem;
				prev.nextItem = newRange;
			}
		}
	}
	
}
	



BitReader.prototype.appendBuffer = function( buffer1, buffer2 ) {
	
  var tmp = new Uint8Array( buffer1.byteLength + buffer2.byteLength );
  tmp.set( new Uint8Array( buffer1 ), 0 );
  tmp.set( new Uint8Array( buffer2 ), buffer1.byteLength );
  return tmp;
} 

BitReader.prototype.getBits = function(count) {
	
	var joinBuffers = false;
	
	
	var 
		byteOffset = this.indexInBuffer >> 3,
		room = (8 - this.indexInBuffer % 8);
	
	// if((((this.currentBuffer.data.byteLength) << 3)-1) >= this.indexInBuffer+count){
	if(((this.currentBuffer.data.byteLength) << 3) >= this.indexInBuffer+count){
		var bytes = this.currentBuffer.data;
	}
	else{
		
		if(this.currentBuffer.nextItem && (this.currentBuffer.end+1 == this.currentBuffer.nextItem.start)){
			
			joinBuffers = true;
			// if(count==1){
				// bytes = this.currentBuffer.data;
			// }
			// else{
				bytes = this.appendBuffer(this.currentBuffer.data.buffer, this.currentBuffer.nextItem.data.buffer);
			// }
			// 
			this.previousBuffer = this.currentBuffer;
			this.currentBuffer = this.currentBuffer.nextItem;
			this.bufferLength = this.currentBuffer.data.byteLength;
			
			this._onBufferAdvance();
			
		}else{
			// 
			// throw this.indexInBuffer+' '+(this.currentBuffer.data.byteLength<<3);
			this.onStalled(this.currentBuffer.end+1);
			return BitReader.STALLING;
		}
	}
	
	

	if( room >= count ) {
		
		this.index += count;
		if(joinBuffers){
			
			// if(count == 1){
				// this.indexInBuffer = 0;
			// }else{
				this.indexInBuffer = this.index-(this.currentBuffer.start<<3);
			// }
			// if(this.indexInBuffer >= (this.startBuffer.byteLength << 3)){
				// this.indexInBuffer -=  (this.startBuffer.byteLength << 3);
			// }
		}else{
			this.indexInBuffer += count;
		}
		// if(this.index > 3999970 && this.index < 4000050 ){
			// 
		// }
		return (bytes[byteOffset] >> (room - count)) & (0xff >> (8-count));
	}
	
	var 
		leftover = (this.indexInBuffer + count) % 8, // Leftover bits in last byte
		end = (this.indexInBuffer + count -1) >> 3,
		value = bytes[byteOffset] & (0xff >> (8-room)); // Fill out first byte

	for( byteOffset++; byteOffset < end; byteOffset++ ) {
		value <<= 8; // Shift and
		value |= bytes[byteOffset]; // Put nextItem byte
	}

	if (leftover > 0) {
		value <<= leftover; // Make room for remaining bits
		value |= (bytes[byteOffset] >> (8 - leftover));
	}
	else {
		value <<= 8;
		value |= bytes[byteOffset];
	}
	
	this.index += count;
	if(joinBuffers){
		// if(count == 1){
			// this.indexInBuffer = 0;
		// }else{		
			this.indexInBuffer = this.index-(this.currentBuffer.start<<3);
		// }	
	}else{
		this.indexInBuffer += count;
	}
	//remove
	// if(this.index > 3999970 && this.index < 4000050 ){
		// 
	// }	
	return value;
};
BitReader.prototype.setUpNextBuffer = function(count, raise) {
	//anton
	if(raise === undefined){
		raise = 1;
	}
	
	if(count > 0){
		
		if(this.currentBuffer.nextItem && (this.currentBuffer.end+1 == this.currentBuffer.nextItem.start)){
			// 						
			this.previousBuffer = this.currentBuffer;
			this.currentBuffer = this.currentBuffer.nextItem;
			this.bufferLength = this.currentBuffer.data.byteLength;
			this.indexInBuffer = count-1;
			this.index = (this.currentBuffer.start<<3)+ this.indexInBuffer;
			
			if(raise){
				this._onBufferAdvance();
			}
			
		}else{
			if(raise){
				this.onStalled(this.currentBuffer.end +1);
				return BitReader.STALLING;
			}else{
				return false;
			}
		}
	}else{
		
		this.currentBuffer = this.previousBuffer;
		this.bufferLength = this.currentBuffer.data.byteLength;
		this.indexInBuffer = (this.currentBuffer.data.byteLength << 3) + count;
		this.index = ((this.currentBuffer.end +1)<< 3) + count;
	}
	return true;
}

BitReader.prototype.advance = function(count) {
	var borrow;
	//count+1
	if((borrow = ( this.indexInBuffer + count) - ((this.bufferLength << 3)-1)) <= 0){
		this.index += count;
		// if(this.index > 3999970 && this.index < 4000050 ){
			// 
		// }
		return (this.indexInBuffer += count);
	}else{
		return this.setUpNextBuffer(borrow);
	}
};

BitReader.prototype.rewind = function(count) {
	if(count <= this.indexInBuffer){
		this.index -= count;
		// if(this.index > 3999970 && this.index < 4000050 ){
			// 
		// }
		return (this.indexInBuffer -= count);
	}else{
		return this.setUpNextBuffer(this.indexInBuffer - count);
	}
};


BitReader.prototype.seek = function(countBytesAbsolute) {
	
	var startBuffer = this.startBuffer;
	var currentBufferStart = this.currentBuffer.start;
	if(this._hls){
		// 
		for(var i = 0;i < this._hls.length;i++){
			// 
			if(this._hls[i].end >= countBytesAbsolute){
				if(this._hls[i].loaded){
					var offset = countBytesAbsolute - this._hls[i].start;
					// 
				}else{
					this.onStalled(this._hls[i].start);
					return BitReader.STALLING;
				}
				break;
			}
		}
		
		while(startBuffer.start != this._hls[i].start){
			startBuffer = startBuffer.nextItem;
		}
		
		this.currentBuffer = startBuffer;
		this.bufferLength = this.currentBuffer.data.byteLength;
		this.indexInBuffer = (offset << 3);
		this.index = countBytesAbsolute << 3;
		
		if(currentBufferStart != this._hls[i].start){
			this._onBufferAdvance();
		}
		
		return true;
		
	}
	else{
	
		do{
			if(startBuffer.end >= countBytesAbsolute && startBuffer.start <= countBytesAbsolute){
										
				this.currentBuffer = startBuffer;
				this.bufferLength = this.currentBuffer.data.byteLength;
				this.indexInBuffer = ((countBytesAbsolute - this.currentBuffer.start) << 3);
				this.index = countBytesAbsolute << 3;
				
				if(currentBufferStart != this.currentBuffer.start){
					this._onBufferAdvance();
				}
				
				return true;
			}
			if(!startBuffer.nextItem || startBuffer.nextItem.start > countBytesAbsolute){
				// this.dumpForwardBuffers();
				this.onStalled(countBytesAbsolute);
				return BitReader.STALLING;
			}else{
				startBuffer = startBuffer.nextItem;
			}
		}while(true);
	}
};

			var CONV_INT="float _s(vec2 v) {\nfloat _ap = v.r*255. + v.g*255.*256.;\nif(_ap > 32767.)\n{\n_ap -= 65536.;\n}\nreturn _ap;\n}\nfloat _E(vec2 v) {\nfloat _ap;\nif( v.g < .5 ){\n_ap = v.r*255. + v.g*255.*256.;\n} else {\n_ap = (v.r*255.-256.) + (v.g*255. - 255.)*256.;\n}\nreturn _ap;\n}\nvec2 _B(float _aw){\nif(_aw < 0.){\n_aw += 65536.;\n}\nfloat _al = floor( _aw / 256. );\nfloat _ao = _aw - _al*256.;\nreturn vec2(_ao / 255., _al / 255. );\n}",CONV_FLOAT="float _s(vec3 v) {\nfloat _ap = v.r*255. + v.g*255.*256.;\nif(_ap > 32767.)\n{\n_ap -= 65536.;\n}\nreturn _ap;\n}\nfloat _E(vec2 v) {\nfloat _ap;\nif( v.g < .5 ){\n_ap = v.r*255. + v.g*255.*256.;\n} else {\n_ap = (v.r*255.-256.) + (v.g*255. - 255.)*256.;\n}\nreturn _ap;\n}\nconst float _an = 1./255.;\nvec2 normalize_after_multi( vec2 v ){\nfloat v0abs = abs( v.r );\nif( v0abs > 1. ){\nfloat _ai = sign(v.r);\nfloat low = floor( v0abs / _an + .5 );\nfloat new_low = low - 256.*floor(low/256.);\nv.r = _ai * new_low * _an;\nv.g += _ai * ( low - new_low ) / 256. * _an;\n}\nreturn v;\n}\nvec2 _Y(vec2 v, float n){\nfloat d = _an * n;\nfloat v0 = floor( v[0] / d );\nfloat v1 = floor( v[1] * 256. / d ) / 256.;\nreturn vec2( v0*_an, v1*_an );\n}\nvec2 _D( vec2 _aq ){\nif( _aq.g < 0.5 ){\nreturn _aq;\n}else{\nreturn vec2( -(1.-( _aq.r - _an) ) + floor(1. - _aq.r)*(1.+_an), -(1.- (_aq.g-floor( 1.- _aq.r ) * _an ) ) );\n}\n}\nvec2 _x( vec2 _aq ){\nif(abs( _aq.r) > 1.){\n_aq = normalize_after_multi( _aq );\n}\nif( _aq.r < 0. || _aq.g < 0. ){\nfloat abs0 = abs( _aq.r );\nif( abs0 == 0. ){\nreturn vec2( 0., 1.+_aq.g + _an );\n} else {\nreturn vec2( 1.-abs0+_an, 1.+_aq.g );\n}\n}\nreturn _aq;\n}\nvec2 _ab( vec2 _aq[8], float x ){\nfloat _as, _at;\nvec2 _az;\n_az = vec2(0.,0.);\n_at = 3.1415926535897932384626433832795;\n_as = 1./sqrt(2.);\n_az += (_as/2.)*_aq[0];\n_as = 1.;\nfor( int u=1;u<8;u++){\n_az += (_as/2.)*_aq[u]*cos((2.*x+1.)*float(u)*_at/16.);\n}\nreturn _az;\n}",
COLUMNS_0="precision mediump float;\nprecision mediump int;\nuniform sampler2D _G;\nuniform sampler2D _f;\nuniform sampler2D _t;\nuniform sampler2D _b;\nuniform sampler2D _w;\nuniform sampler2D _v;\nuniform sampler2D _c;\nvarying vec2 _S;\nuniform int _ad;\nuniform int _ae;",COLUMNS_1="void main() {\nint b1, b3, b4, b6, b7, tmp1, tmp2, m0, x0, x1, x2, x3, x4, y3, y4, y5, y6, y7;\nvec2 _aj, _ah;\nfloat _A, _z;\nfloat _q;\nfloat _Q, _R;",COLUMNS_INT_1="float _X[8];",COLUMNS_FLOAT_1="vec2 _X[8];",COLUMNS_2=
"float _y = 0.4;\nfloat _m, _l;\nfloat _o, _k;\nfloat _e, _g;\nfloat _d, _h;\n_h = 1.0 / ( float(_ae) / 8. );\n_d = 1.0 / ( float(_ad) / 8. );\n_o = 1.0 / float(_ad);\n_k = 1.0 / float(_ae);\n_g = 2.* _k;\n_e = _o;\n_Q = \tfloor( floor( _S.x / _k ) / 8.0 );\n_R = \tfloor( floor( _S.y / _o ) / 8.0 );\n_A = mod( floor( _S.x / _g ), 4.0 );\n_z = mod( floor( _S.y / _e ), 8.0 );\n_m = _Q * 8. * _k + _z * _k + _k / 2.;\n_l = _R * 8. * _o + _o / 2.;\nfor( int i = 0; i < 8; i++ )\n{",COL_INT_2="_X[i] = _E( texture2D( _G, vec2( _m , _l + _o * float(i) ) ).ra );",
COL_FLOAT_2="_X[i] = _D( texture2D( _G, vec2( _m , _l + _o * float(i) ) ).ra );",COL_3="}\nint _ag = texture2D( _w, vec2( ( _Q + .5 ) * _h, ( _R + .5 ) * _d ) ).r > 0. ? 1 : 0;\nfloat _O;\n_q = floor( texture2D( _t, vec2( _Q * _h, _R * _d ) )[0] * 255. + 0.5 );",COL_INT_21="float dc = _X[0];",COL_FLOAT_21="vec2 dc = _X[0];",COL_31="for( int i = 0; i < 8; i++ )\n{",COL_INT_22="if( _X[i] == 0. )",COL_FLOAT_22="if( _X[i] == vec2(0., 0.) )",COL_32="{\nfloat _U = texture2D( _v, vec2( 0.075 + _z * 0.125, 0.075 + float(i) * 0.125 ) ).r;\nfloat last_non_zero = texture2D( _c, vec2( _Q * _h, _R * _d ) ).r;\nif( _U  + 1.> last_non_zero ){\ncontinue;\n}\n}\n_X[i] *= 2.;\nfloat texelcoord_Q_x = 0.075 + _z * 0.125;\nfloat texelcoord_Q_y = 0.075 + float( i ) * 0.125;\nfloat _j = texelcoord_Q_y / 2.;\nif( _ag ==  0){\n_j += .5;\n}\n_O = floor( texture2D( _f, vec2( texelcoord_Q_x, _j ) )[0] * 255. + 0.5 );",
COL_INT_3="if (_ag == 0){\n_X[i] += _X[i] < 0. ? -1. : 1.;\n}\n_X[i] = floor(  _X[i] * _q * _O  / 16.0 );\nif( mod( _X[i], 2. ) == 0. )\n{\n_X[i] -= ( _X[i] > 0. ) ? 1. : -1.;\n}\n_X[i] = min( _X[i], 2047. );\n_X[i] = max( _X[i], -2048. );\n_X[i] *= floor( texture2D( _b, vec2( texelcoord_Q_x, texelcoord_Q_y ) )[0] * 255. + 0.5 );",COL_FLOAT_3="if (_ag == 0){\n_X[i].r += dot( _X[i], vec2( 1., 256.)) < 0. ? -_an : _an;\n}\n_X[i] =  _Y( _X[i] * _q * _O, 16.0 );\nif( mod( floor( _X[i].r / _an ), 2. ) == 0. ){\n_X[i].r -= dot( _X[i], vec2( 1., 256.)) < 0. ? _an : -_an;\n}\nif( dot( _X[i], vec2( 1., 256.)) > 8.027 ){\n_X[i] = vec2( 1., 7.*_an);\n}\nif( dot( _X[i], vec2( 1., 256.)) < -8.031 ){\n_X[i] = vec2( 0., -8.*_an);\n}",
COL_4="}\nif ( _z == 0.0 && _ag == 1 )\n{",COL_INT_31="_X[0] = dc * 256.;",COL_FLOAT_31="_X[0] = dc * 8.;",COL_41="}",COL_INT_5="b1 = int(_X[4]);\nb3 = int(_X[2]) + int(_X[6]);\nb4 = int(_X[5]) - int(_X[3]);\ntmp1 = int(_X[1]) + int(_X[7]);\ntmp2 = int(_X[3]) + int(_X[5]);\nb6 = int(_X[1]) - int(_X[7]);\nb7 = tmp1 + tmp2;\nm0 =  int(_X[0]);\nx4 =  ((b6*473 - b4*196 + 128) / 256) - b7;\nx0 =  x4 - (((tmp1 - tmp2)*362 + 128) / 256);\nx1 =  m0 - b1;\nx2 =  (((int(_X[2]) - int(_X[6]))*362 + 128) / 256) - b3;\nx3 =  m0 + b1;\ny3 =  x1 + x2;\ny4 =  x3 + b3;\ny5 =  x1 - x2;\ny6 =  x3 - b3;\ny7 = -x0 - ((b4*473 + b6*196 + 128) / 256);\nif( _A == 0.0 )\n{\n_aj = _B( floor( float( b7 + y4 ) * _y ) );\n_ah = _B( floor( float( x4 + y3 ) * _y ) );\n}\nelse if( _A == 1.0 )\n{\n_aj = _B( floor( float ( y5 - x0 ) * _y ) );\n_ah = _B( floor( float ( y6 - y7 ) * _y ) );\n}\nelse if( _A == 2.0 )\n{\n_aj = _B( floor( float ( y6 + y7 ) * _y ) );\n_ah = _B( floor( float ( x0 + y5 ) * _y ) );\n}\nelse\n{\n_aj = _B( floor( float ( y3 - x4 ) * _y ) );\n_ah = _B( floor( float ( y4 - b7 ) * _y ) );\n}",
COL_FLOAT_5="if( _A == 0.0 )\n{\n_aj = _x( _ab( _X, 0.) * _y );\n_ah = _x( _ab( _X, 1.) * _y );\n}\nelse if( _A == 1.0 )\n{\n_aj = _x( _ab( _X, 2.) * _y );\n_ah = _x( _ab( _X, 3.) * _y );\n}\nelse if( _A == 2.0 )\n{\n_aj = _x( _ab( _X, 4.) * _y );\n_ah = _x( _ab( _X, 5.) * _y );\n}\nelse\n{\n_aj = _x( _ab( _X, 6.) * _y );\n_ah = _x( _ab( _X, 7.) * _y );\n}",COL_5="gl_FragColor = vec4(\n_aj.r,\n_aj.g,\n_ah.r,\n_ah.g\n);\n}",SHADER_FRAGMENT_IDCT_ROWS_COM="precision mediump float;\nuniform sampler2D _G;\nuniform sampler2D _i;\nuniform sampler2D _w;\nuniform sampler2D _I;\nvarying vec2 _S;\nuniform int _ad;\nuniform int _ae;\nuniform float _ac;\nfloat _g, _e;\nfloat _F( float _ay ){\nreturn sign( _ay ) * floor( abs( _ay ) );\n}\nvec4 _p( float _ax, float _ay ) {\nvec4 _C;\nfloat _u = sign( _ax ) * floor( abs(_ax) / 4. );\nfloat _n = mod( abs(_ax), 4. );\nvec4 _Z = texture2D( _i, vec2( _S.x + _u * _g, 1.  - _S.y - _ay * _e ));\nvec4 _H;\nif( _n == 0. )\n{\n_C = _Z;\n}\nelse if( _ax > 0. )\n{\n_H = texture2D( _i, vec2( _S.x + ( _u + 1. ) * _g, 1. - _S.y - _ay * _e ));\nif( _n == 1. )\n{\n_C[0] = _Z[1];\n_C[1] = _Z[2];\n_C[2] = _Z[3];\n_C[3] = _H[0];\n}\nelse if( _n == 2. )\n{\n_C[0] = _Z[2];\n_C[1] = _Z[3];\n_C[2] = _H[0];\n_C[3] = _H[1];\n}\nelse\n{\n_C[0] = _Z[3];\n_C[1] = _H[0];\n_C[2] = _H[1];\n_C[3] = _H[2];\n}\n}\nelse\n{\n_H = texture2D( _i, vec2( _S.x + ( _u - 1. ) * _g, 1. - _S.y - _ay  * _e ));\nif( _n == 3. )\n{\n_C[0] = _H[1];\n_C[1] = _H[2];\n_C[2] = _H[3];\n_C[3] = _Z[0];\n}\nelse if( _n == 2. )\n{\n_C[0] = _H[2];\n_C[1] = _H[3];\n_C[2] = _Z[0];\n_C[3] = _Z[1];\n}\nelse\n{\n_C[0] = _H[3];\n_C[1] = _Z[0];\n_C[2] = _Z[1];\n_C[3] = _Z[2];\n}\n}\nreturn _C;\n}",
ROWS_COM_1="float _y = 0.4;\nvoid main() {\nint b1, b3, b4, b6, b7, tmp1, tmp2, m0, x0, x1, x2, x3, x4, y3, y4, y5, y6, y7;\nfloat _a;\nfloat _o, _k, _Q, _R, _A, _z, _m, _l;\nfloat _d, _h;",DCT_COEF_DECL_INT="int _X[8];",DCT_COEF_DECL_FLOAT="vec2 _X[8];",ROWS_COMM_2="_o = 1.0 / float(_ad);\n_k = 1.0 / float(_ae);\n_g = 2. * _k;\n_e = _o;\n_h = 1.0 / ( float(_ae) / 4. );\n_d = 1.0 / ( float(_ad) / 8. );\n_Q = \tfloor( floor( _S.x / _g ) / 2.0 );\n_R = \tfloor( floor( _S.y / _e ) / 8.0 );\n_A = mod( floor( _S.x / _g ), 2.0 );\n_a = 7. - mod( floor( _S.y / _e ), 8.0 );\n_z = mod( floor( _S.y / _e ), 8.0 );\n_m = _Q * 4. * _k + floor( _a / 2. ) * _k + _k * .5;\n_l = ( _R + .95 ) * 8. * _o;\nif( mod( _a, 2. ) == 0.0 )\n{\nfor( int i = 0; i < 8; i++ )\n{\nvec4 texel = texture2D( _G, vec2( _m , _l - _o * float(i) ) );",
ROWS_INT1="_X[i] = int( _E( vec2( texel[0], texel[1] ) ) / _y );",ROWS_FLOAT1="_X[i] = _D( vec2( texel[0], texel[1] ) ) / _y;",ROWSCOM22="}\n}\nelse\n{\nfor( int i = 0; i < 8; i++ )\n{\nvec4 texel = texture2D( _G, vec2( _m , _l - _o * float(i) ) );",ROWS_INT2="_X[i] = int( _E( vec2( texel[2], texel[3] ) ) / _y );",ROWS_FLOAT2="_X[i] = _D( vec2( texel[2], texel[3] ) ) / _y;",ROWS_COM3="}\n}",ROWSCOM_INT4="b1 = _X[4];\nb3 = _X[2] + _X[6];\nb4 = _X[5] - _X[3];\ntmp1 = _X[1] + _X[7];\ntmp2 = _X[3] + _X[5];\nb6 = _X[1] - _X[7];\nb7 = tmp1 + tmp2;\nm0 =  _X[0];\nx4 =  ((b6*473 - b4*196 + 128) / 256) - b7;\nx0 =  x4 - (((tmp1 - tmp2)*362 + 128) / 256);\nx1 =  m0 - b1;\nx2 =  (((_X[2] - _X[6])*362 + 128) / 256) - b3;\nx3 =  m0 + b1;\ny3 =  x1 + x2;\ny4 =  x3 + b3;\ny5 =  x1 - x2;\ny6 =  x3 - b3;\ny7 = -x0 - ((b4*473 + b6*196 + 128) / 256);",
SHADER_FRAGMENT_IDCT_ROWS_INTRA_1_INT="if( _A == 0.0 )\n{\ngl_FragColor = vec4(\nfloat( ( b7 + y4 + 128 ) / 256 ) / 255.,\nfloat( ( x4 + y3 + 128 ) / 256 ) / 255.,\nfloat( ( y5 - x0 + 128 ) / 256 ) / 255.,\nfloat( ( y6 - y7 + 128 ) / 256 ) / 255.\n);\n}\nelse\n{\ngl_FragColor = vec4(\nfloat( ( y6 + y7 + 128 ) / 256 ) / 255.,\nfloat( ( x0 + y5 + 128 ) / 256 ) / 255.,\nfloat( ( y3 - x4 + 128 ) / 256 ) / 255.,\nfloat( ( y4 - b7 + 128 ) / 256 ) / 255.\n);\n}\n}",SHADER_FRAGMENT_IDCT_ROWS_INTRA_1_FLOAT=
"if( _A == 0.0 )\n{\ngl_FragColor = vec4(\ndot( _ab( _X, 0.), vec2(1.,256.) ),\ndot( _ab( _X, 1.), vec2(1.,256.) ),\ndot( _ab( _X, 2.), vec2(1.,256.) ),\ndot( _ab( _X, 3.), vec2(1.,256.) )\n);\n}\nelse\n{\ngl_FragColor = vec4(\ndot( _ab( _X, 4.), vec2(1.,256.) ),\ndot( _ab( _X, 5.), vec2(1.,256.) ),\ndot( _ab( _X, 6.), vec2(1.,256.) ),\ndot( _ab( _X, 7.), vec2(1.,256.) )\n);\n}\n}",SHADER_FRAGMENT_IDCT_ROWS_INTER_1="vec4 _C;\nif( _Q < 4. || _R > 3. ){\n}\nif ( texture2D( _w, vec2( ( _Q + .5 ) * _h, 1. - ( _R + .5 ) * _d ) ).r > 0.5 )\n{\n_C = vec4(0.,0.,0.,0.);\n}\nelse\n{\nvec4 _ar = texture2D( _I, vec2( _S.x, 1. - _e * 0.25 - _S.y) );\nfloat _W = _E( _ar.rg );\nfloat _V = _E( _ar.ba );\nfloat _ax, _ay;\nbool odd_h, odd_v;\nif( _ac == 1.){\n_ax = floor( _W / 2. );\n_ay = floor( _V / 2. );\nodd_h = abs(_W - _ax * 2.) > 0.5;\nodd_v = abs(_V - _ay * 2.) > 0.5;\n}else{\n_ax = floor( _F( _W / 2.) / 2. );\n_ay = floor( _F( _V / 2.) / 2. );\nodd_h = ( mod( _F( _W / 2. ), 2. ) != 0.);\nodd_v = ( mod( _F( _V / 2. ), 2. ) != 0.);\n}\n_ay *= -1.;\n_C = _p( _ax, _ay );\nfloat _aa = 1.;\nvec4 _am = vec4( .001953125, .001953125, .001953125, .001953125 );\nif( odd_h ) {\n_C += _p( _ax + 1., _ay ) + _am;\n_aa *= 2.;\n}\nif ( odd_v ) {\n_C += _p( _ax, _ay - 1. ) + _am;\n_aa *= 2.;\n}\nif( odd_h && odd_v ) {\n_C += _p( _ax + 1., _ay - 1. );\n}\n_C /= _aa;\n}",
INTER_INT1="if( _A == 0.0 )\n{\ngl_FragColor = vec4(\n(float( ( b7 + y4 + 128 ) / 256 ) / 255.),\n(float( ( x4 + y3 + 128 ) / 256 ) / 255.),\n(float( ( y5 - x0 + 128 ) / 256 ) / 255.),\n(float( ( y6 - y7 + 128 ) / 256 ) / 255.)\n);\n}\nelse\n{\ngl_FragColor = vec4(\n(float( ( y6 + y7 + 128 ) / 256 ) / 255.),\n(float( ( x0 + y5 + 128 ) / 256 ) / 255.),\n(float( ( y3 - x4 + 128 ) / 256 ) / 255.),\n(float( ( y4 - b7 + 128 ) / 256 ) / 255.)\n);\n}\ngl_FragColor += _C;\n}",INTER_FLOAT1="if( _A == 0.0 )\n{\ngl_FragColor = vec4(\ndot( _ab( _X, 0.), vec2(1.,256.) ),\ndot( _ab( _X, 1.), vec2(1.,256.) ),\ndot( _ab( _X, 2.), vec2(1.,256.) ),\ndot( _ab( _X, 3.), vec2(1.,256.) )\n);\n}\nelse\n{\ngl_FragColor = vec4(\ndot( _ab( _X, 4.), vec2(1.,256.) ),\ndot( _ab( _X, 5.), vec2(1.,256.) ),\ndot( _ab( _X, 6.), vec2(1.,256.) ),\ndot( _ab( _X, 7.), vec2(1.,256.) )\n);\n}\ngl_FragColor += _C;\n}";
			(function(window){

window['jsv_dec'] = jsv = function( ){
	
	window['ez_dis'](this);

	this.rendered_frames_n = 13;
	this.buffer = new BitReaderJsv();
	
	//default buffer size
	this.bufferSize = 300000;
	
	this._meta = false;

	this.customIntraQuantMatrix = new Uint8Array(64);
	this.customNonIntraQuantMatrix = new Uint8Array(64);
	this.blockData = new Int32Array(64);
	
	this.sequenceStarted = false;
	this._needMetaBasic = true;
	this._keyMap = false;
	this._lastCustomIntraMatrix = 0;
	this._lastCustomNonIntraMatrix = 0;
	this.frameWidth = NaN;
	this.frameHeight = NaN;
	this._bitRate = NaN;
	
	this.max = this.min = 0;
	// var that = this;
	// setInterval( function(){
		// 
	// }, 3000 );
}
jsv.prototype.initGLBuffers = function(){
	
	var gl = this.gl;	
	
	this.glFrameBuffers = {};

	gl.activeTexture(gl.TEXTURE7);
	var fbo_rendered = this.glFrameBuffers.rendered = new Array( this.rendered_frames_n );
	for( var i = 0; i < this.rendered_frames_n; i++ ){
		fbo_rendered[i] = new Array( this.n_comps );
		for( var comp = 0; comp < this.n_comps; comp++){
			var shift = ( comp == 1 || comp == 2 ) ? 1 : 0;
			var width = this.codedWidth >> shift;
			var height = this.codedHeight >> shift;
			var framebuffer = gl.createFramebuffer();
			var texture = this.createTexture(0,0,0);
			texture.uid = i;
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width / 4, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
			fbo_rendered[i][comp] = {framebuffer: framebuffer, texture: texture};
		}
	}
	var idct_1d = this.glFrameBuffers.idct_1d = new Array( this.n_comps );
	for( var comp = 0; comp < this.n_comps; comp++){
		var shift = ( comp == 1 || comp == 2 ) ? 1 : 0;
		var width = this.codedWidth >> shift;
		var height = this.codedHeight >> shift;
		var framebuffer = gl.createFramebuffer();
		var texture = this.createTexture(0,0,0);
		texture.uid = comp;
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width / 2, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
		idct_1d[comp] = {framebuffer: framebuffer, texture: texture};
	}
}
jsv.prototype._initGL = function( gl ){
	this.gl = gl;
	//by default webgl 1 alines rows by 4 bytes
	gl.pixelStorei( gl.UNPACK_ALIGNMENT, 1 );	
	//IDCT
	var range = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
	if( !range ){
		range = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT);
	}
	
	var range = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_INT);
	/*if( !range ){
		range = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_INT);
	}*/
	
	this.integer = range.rangeMax >= 30;
	/*
	const urlParams = new URLSearchParams(window.location.search);
	const myParam = parseInt(urlParams.get('int'));
	this.integer = myParam;
	*/
		
	composeShaders( this.integer );

	this.programs = {};
	this.programs.idct_columns = {uniforms:{}};
	var program = this.programs.idct_columns.program =  gl.createProgram();
	gl.attachShader(program, this.compileShader(gl.VERTEX_SHADER, SHADER_VERTEX_IDENTITY));
	gl.attachShader(program, this.compileShader(gl.FRAGMENT_SHADER, SHADER_FRAGMENT_IDCT_COLUMNS));
	
	gl.linkProgram(program);
	
	if( !gl.getProgramParameter(program, gl.LINK_STATUS) ) {
		throw new Error(gl.getProgramInfoLog(program));
	}
	
	this.gl.useProgram(program);
	
	
	var vertexAttr = gl.getAttribLocation(program, 'vertex');
	gl.enableVertexAttribArray(vertexAttr);
	gl.vertexAttribPointer(vertexAttr, 2, gl.FLOAT, false, 0, 0);
	
	var uniforms = this.programs.idct_columns.uniforms;
	uniforms.width = gl.getUniformLocation(program, '_ae');
	uniforms.height = gl.getUniformLocation(program, '_ad');
	
	//holds input DCT coefficients	
	this.TextureDCT = this.createTexture(0, '_G', program);
	
	//holds dequantdiser values ( unique per macroblock );
	this.QUANT_MATRIX = new Uint8Array( 128 );
	this.QUANT_MATRIX.set( DEFAULT_INTRA_QUANT_MATRIX );
	this.QUANT_MATRIX.set( DEFAULT_NON_INTRA_QUANT_MATRIX, 64 );

	this.TextureDCTQuant = this.createTexture(1, '_f', program);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 8, 16, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.QUANT_MATRIX );


	this.TextureDCTQuantScale = this.createTexture(2, '_t', program);
	
	this.TextureDCTPremultiple = this.createTexture(3, '_b', program);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 8, 8, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, PREMULTIPLIER_MATRIX );
	
	this.TextureIntre = this.createTexture(4, '_w', program);
	
	this.TextureZigZag = this.createTexture(5, '_v', program);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 8, 8, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, ZIG_ZAG_INVERSE );

	this.TextureLastNonZero = this.createTexture(6, '_c', program);
	
	this.programs.idct_rows_intra = {uniforms:{}};
	program = this.programs.idct_rows_intra.program =  gl.createProgram();
	gl.attachShader(program, this.compileShader(gl.VERTEX_SHADER, SHADER_VERTEX_IDENTITY));
	gl.attachShader(program, this.compileShader(gl.FRAGMENT_SHADER, SHADER_FRAGMENT_IDCT_ROWS_INTRA));
	
	gl.linkProgram(program);
	
	if( !gl.getProgramParameter(program, gl.LINK_STATUS) ) {
		throw new Error(gl.getProgramInfoLog(program));
	}
	
	var vertexAttr = gl.getAttribLocation(program, 'vertex');
	gl.enableVertexAttribArray(vertexAttr);
	gl.vertexAttribPointer(vertexAttr, 2, gl.FLOAT, false, 0, 0);
	
	this.gl.useProgram(program);
	
	uniforms = this.programs.idct_rows_intra.uniforms;
	uniforms.width = gl.getUniformLocation(program, '_ae');
	uniforms.height = gl.getUniformLocation(program, '_ad');
	
	this.programs.idct_rows_inter = {uniforms:{}};
	program = this.programs.idct_rows_inter.program =  gl.createProgram();
	gl.attachShader(program, this.compileShader(gl.VERTEX_SHADER, SHADER_VERTEX_IDENTITY));
	gl.attachShader(program, this.compileShader(gl.FRAGMENT_SHADER, SHADER_FRAGMENT_IDCT_ROWS_INTER));
	
	gl.linkProgram(program);
	
	if( !gl.getProgramParameter(program, gl.LINK_STATUS) ) {
		throw new Error(gl.getProgramInfoLog(program));
	}
	
	this.gl.useProgram(program);
	
	uniforms = this.programs.idct_rows_inter.uniforms;
	uniforms.width = gl.getUniformLocation(program, '_ae');
	uniforms.height = gl.getUniformLocation(program, '_ad');
	uniforms.mv_coef = gl.getUniformLocation(program, '_ac');
	
	gl.uniform1i(gl.getUniformLocation(program, '_G'), 0);
	gl.uniform1i(gl.getUniformLocation(program, '_i'), 1);
	gl.uniform1i(gl.getUniformLocation(program, '_w'), 2);
	this.TextureMV = this.createTexture(3, '_I', program);

	var vertexAttr = gl.getAttribLocation(program, 'vertex');
	gl.enableVertexAttribArray(vertexAttr);
	gl.vertexAttribPointer(vertexAttr, 2, gl.FLOAT, false, 0, 0);
	

}
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
jsv.prototype._initMeta = function(){
	if(this.buffer._live){
		return true;
	}else if(this._decoding){
		return false;
	}
	
	this._decoding = true;
	
	if(this._needMetaBasic){
		this._needMetaBasic = false;
		this.buffer.advance(16);
		this._meta = {};
		this._meta['w'] = this.buffer.getBits(16);
		this._meta['h'] = this.buffer.getBits(16);
		
		this._meta['d'] = this.buffer.getBits(16)/100;
		if(!this._meta['d']){
			
			this._meta['a'] = this.yuva = this.buffer.getBits(1);
			this._meta['d'] = this.buffer.getBits(23)/100;
			this.n_comps = this.yuva ? 4 : 3;
			
		}
		//dispatch meta not waiting for gop info
		this['go']('meta', this._meta);
		
		var tmp = this.buffer.getBits(32);
		//start code for all gops
		if(tmp == START_MAP){
			this.countGOP = this.buffer.getBits(32);
			return this._initGop();
		}else{
			this.buffer.rewind(32);
		}
	}else{
		return this._initGop();
	}	
	
	this._decoding = false;
	
	return true;
	
};

jsv.prototype._initGop = function(){
	var count = this.countGOP;
	var itemSize = 8;
	var offset = (this.buffer.index >> 3);
	var size = bytesleft = itemSize*count;
	var buffer = this.buffer.currentBuffer;
	var outputBuffer = new ArrayBuffer(0);
	while(bytesleft){
		if(buffer.data.buffer.byteLength >= offset+bytesleft){
			outputBuffer = this.buffer.appendBuffer(outputBuffer, buffer.data.buffer.slice(offset, offset+bytesleft));
			break;
		}else{
			
			outputBuffer = this.buffer.appendBuffer(outputBuffer, buffer.data.buffer);
			bytesleft -= buffer.data.buffer.byteLength;
			if(buffer.nextItem){
				buffer = buffer.nextItem;
			}else{
				this._decoding = false;
				return false;
			}
		}
		
	}
	this._keyMap = {
			count:count,
			buffer:new Uint8Array(this.buffer.currentBuffer.data.buffer.slice(offset, offset+itemSize*count))
		};
	this.buffer.advance((itemSize*count) << 3);	
	this._decoding = false;
	return true;
}

jsv.prototype._getTimeByKeyNumber = function(gopNumber){
	// 
	var buffer = this._keyMap.buffer;
	var j = gopNumber*8+4;
	var hour = ( buffer[j] & 0x7C ) >> 2;
	
	var minute = (( buffer[j] & 0x3 ) << 4)+((buffer[j+1] & 0xF0) >> 4);
	
	var second = (( buffer[j+1] & 0x7 ) << 3)+((buffer[j+2] & 0xE0) >> 5);
	var frame = (( buffer[j+2] & 0x1F ) << 1)+((buffer[j+3] & 0x80) >> 7);
	return (hour*60 + minute)*60+second+(frame+1)/this.pictureRate;
}
jsv.prototype._getByteFromKeyMap = function(currentTime){
	var gopNumber = Math.floor(this._keyMap.count*currentTime/this._meta['d']);
	var time = this._getTimeByKeyNumber(gopNumber);
	if(time > currentTime){
		while(time > currentTime && gopNumber > 0){
			gopNumber--;
			time = this._getTimeByKeyNumber(gopNumber);
		}
	}else if(time < currentTime){
		while(time <= currentTime && gopNumber < this._keyMap.count){
			gopNumber++;
			time = this._getTimeByKeyNumber(gopNumber);
		}
		if(time > currentTime){
			gopNumber--;
		}
	}
	// 
	gopNumber *= 8;
	var buffer = this._keyMap.buffer;
	var offset = (buffer[gopNumber] << 24)+(buffer[gopNumber+1] << 16)+(buffer[gopNumber+2] << 8)+buffer[gopNumber+3];
	// 
	return offset;
}




jsv.prototype.initBuffers = function() {	
	//why do we need this on each sequence ?
	this.intraQuantMatrix = DEFAULT_INTRA_QUANT_MATRIX;
	this.nonIntraQuantMatrix = DEFAULT_NON_INTRA_QUANT_MATRIX;
	
	this.mbWidth = (this.frameWidth + 15) >> 4;
	this.mbHeight = (this.frameHeight + 15) >> 4;
	this.mbSize = this.mbWidth * this.mbHeight;
	
	this.codedWidth = this.mbWidth << 4;
	this.codedHeight = this.mbHeight << 4;
	this.codedSize = this.codedWidth * this.codedHeight;
	
	this.halfWidth = this.mbWidth << 3;
	this.halfHeight = this.mbHeight << 3;
	this.quarterSize = this.codedSize >> 2;
	
	
	// we expect dimetions not to change duration video
	// Sequence already started? Don't allocate buffers again
	if( this.sequenceStarted ) { return; }
	this.sequenceStarted = true;
	this.initGLBuffers();
	
	// Manually clamp values when writing macroblocks for shitty browsers
	// that don't support Uint8ClampedArray
	var MaybeClampedUint8Array = window.Uint8Array;
	/*
	var MaybeClampedUint8Array = window.Uint8ClampedArray || window.Uint8Array;
	if( !window.Uint8ClampedArray ) {
		this.copyBlockToDestination = this.copyBlockToDestinationClamp;
		this.addBlockToDestination = this.addBlockToDestinationClamp;
	}
	*/
	// Allocated buffers and resize the canvas

	this.last_non_zero = new Array( new Uint8Array( this.mbSize * 4 ), new Uint8Array( this.mbSize ), new Uint8Array( this.mbSize ) ); 
	this.macroblockQuant = new Uint8Array( this.mbSize ); 
	this.macroblockIsIntra = new Uint8Array( this.mbSize ); 

	this.currentYDCT16 = new Int16Array(this.codedSize);
	this.currentYDCTU8 = new Uint8Array(this.currentYDCT16.buffer);
	
	this.currentY = new MaybeClampedUint8Array(this.codedSize);
	this.currentY32 = new Uint32Array(this.currentY.buffer);

	this.currentCrDCT16 = new Int16Array(this.codedSize >> 2);
	this.currentCrDCTU8 = new Uint8Array(this.currentCrDCT16.buffer);
	
	this.currentCr = new MaybeClampedUint8Array(this.codedSize >> 2);
	this.currentCr32 = new Uint32Array(this.currentCr.buffer);

	this.currentCbDCT16 = new Int16Array(this.codedSize >> 2);
	this.currentCbDCTU8 = new Uint8Array(this.currentCbDCT16.buffer);
	
	this.currentCb = new MaybeClampedUint8Array(this.codedSize >> 2);
	this.currentCb32 = new Uint32Array(this.currentCb.buffer);
	

	this.forwardY = new MaybeClampedUint8Array(this.codedSize);
	this.forwardY32 = new Uint32Array(this.forwardY.buffer);

	this.forwardCr = new MaybeClampedUint8Array(this.codedSize >> 2);
	this.forwardCr32 = new Uint32Array(this.forwardCr.buffer);

	this.forwardCb = new MaybeClampedUint8Array(this.codedSize >> 2);
	this.forwardCb32 = new Uint32Array(this.forwardCb.buffer);
	
};


jsv.prototype.decodeFrame = function() {
	if(this._decoding){
		return false;
	}
	this._decoding = true;
	var hasBuffer = true;
	while(hasBuffer) {
		
		var code = this.buffer.findNextMPEGStartCode();
		if( code == BitReader.NOT_FOUND ) {
			hasBuffer = false;
			this['go']('ended', null);
		}else if( code == BitReader.STALLING ){
			this.buffer.rewind(32);
			hasBuffer = false;
		}else{
			if( code == START_SEQUENCE ) {
				hasBuffer = this.decodeSequenceHeader(true);
				if(this._skipTillGop && hasBuffer){
					this._skipTillGop = false;
				}
			}else if(this._skipTillGop){
				continue;
			}else if( code == START_GOP ) {
				hasBuffer = this.decodeGopHeader(true);
			}else if( code == START_PICTURE ) {
				hasBuffer = this.decodePicture(true);
				if(hasBuffer){
					return hasBuffer;
				}
			}
			if(!hasBuffer){
				this.buffer.rewind(32);
			}
		}
	}
	this._decoding = false;
	return false;
		
};
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Sequence Layer

jsv.prototype.pictureRate = 30;
jsv.prototype.decodeGopHeader = function(safeFlag) {
	// if(!safeFlag && (!this.buffer['has'](SIZE_GOP_HEADER) || this._decoding)){
	if((!safeFlag && this._decoding) || !this.buffer['has'](SIZE_GOP_HEADER)){
		return false;
	}
	this._decoding = true;
	
	//
	this._gopHeaderDecoded = true;
	this.buffer.advance(1);
	var hour = this.buffer.getBits(5);
	var minute = this.buffer.getBits(6);
	this.buffer.advance(1);
	var second = this.buffer.getBits(6);
	var _frame = this.buffer.getBits(6);
	this._currentTime = this._currentTimeSeqUpdate = ((hour*60 + minute)*60+second+(_frame+1)/this.pictureRate)*1000;
	this._decoding = false;
	return true;
}
	
jsv.prototype.decodeSequenceHeader = function(safeFlag) {
	// if(!safeFlag && (!this.buffer['has'](SIZE_SEQUENCE_HEADER) || this._decoding)){
	if((!safeFlag && this._decoding) || !this.buffer['has'](SIZE_SEQUENCE_HEADER)){	
		return false;
	}
	this._decoding = true;
	
	this._skipTillGop = false;
	this.frameWidth = this.buffer.getBits(12);
	this.frameHeight = this.buffer.getBits(12);
	
	
	this.buffer.advance(4); // skip pixel aspect ratio
	this.pictureRate = PICTURE_RATE[this.buffer.getBits(4)];
	this.frameDuration = 1000/this.pictureRate;
	
	//send rate only once
	if(!this.seqSent){
		this.seqSent = true;
		this['go']('seq', {
			'r':this.pictureRate,
			'w':this.frameWidth,
			'h':this.frameHeight
			});
	}
	
	this.rate = this.pictureRate*this._playbackRate;
	
	if(!this._bitRate){
		this._bitRate = this.buffer.getBits(18);
		this._bytesInForwardBufferLimit = this._bitRate*this['bufferSec']>>3;
		this.buffer._bytesInBackwardBufferLimit = this._bitRate*DEFAULT_SECONDS_PLAYED_LIMIT>>3;
		var ad = 1;
	}
	else{
		ad = 18 + 1;
	}
	this.buffer.advance(ad); // skip marker

	//bufferSize
	this.bufferSize = 16*1024*this.buffer.getBits(10);
	// 
	
	//skip constrained bit
	this.buffer.advance(1);
	
	this.initBuffers();

	var gl = this.gl;
	if( this._lastCustomIntraMatrix = this.buffer.getBits(1) ) { // load custom intra quant matrix?
		for( var i = 0; i < 64; i++ ) {
			this.customIntraQuantMatrix[ZIG_ZAG[i]] = this.buffer.getBits(8);
		}
		this.intraQuantMatrix = this.customIntraQuantMatrix;
		this.QUANT_MATRIX.set( this.intraQuantMatrix );
		gl.bindTexture(gl.TEXTURE_2D, this.TextureDCTQuant);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 8, 16, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.QUANT_MATRIX );
	}
	
	if( this._lastCustomNonIntraMatrix = this.buffer.getBits(1) ) { // load custom non intra quant matrix?
		for( var i = 0; i < 64; i++ ) {
			this.customNonIntraQuantMatrix[ZIG_ZAG[i]] = this.buffer.getBits(8);
		}
		this.nonIntraQuantMatrix = this.customNonIntraQuantMatrix;
		this.QUANT_MATRIX.set( this.nonIntraQuantMatrix, 64 );
		gl.bindTexture(gl.TEXTURE_2D, this.TextureDCTQuantInter);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 8, 16, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.QUANT_MATRIX );
	}
	this._decoding = false;
	return true;
};
// Picture Layer

jsv.prototype.currentY = null;
jsv.prototype.currentCr = null;
jsv.prototype.currentCb = null;

jsv.prototype.currentRGBA = null;

jsv.prototype.pictureCodingType = 0;

// Buffers for motion compensation
jsv.prototype.forwardY = null;
jsv.prototype.forwardCr = null;
jsv.prototype.forwardCb = null;

jsv.prototype.fullPelForward = false;
jsv.prototype.forwardFCode = 0;
jsv.prototype.forwardRSize = 0;
jsv.prototype.forwardF = 0;


jsv.prototype.decodePicture = function(safeFlag) {
	
	// if(!safeFlag && (!this.buffer['has'](this.bufferSize) || this._decoding)){
	if((!safeFlag && this._decoding) || !this.buffer['has'](this.bufferSize)){	
		return false;
	}
	this.mbn = 0;
	/*
	this.setRenderBuffer();
	this.prev_pic_framebuffer = this.framebuffer;	
	this._decoding = false;
	
	var ts = 0;
	if(this._currentTimeSeqUpdate){
		ts = this._currentTimeSeqUpdate;
		this._currentTimeSeqUpdate = 0;
	}
	this['go']('frame', {'ybr': [this.prev_pic_framebuffer[0].texture, this.prev_pic_framebuffer[1].texture, this.prev_pic_framebuffer[2].texture], 'ts':ts});
	
	return true;
	*/
	
	
	var atStart = this.buffer.index;
	this._decoding = true;
	this.buffer.advance(10); // skip temporalReference
	pictureCodingTypePrevious = this.pictureCodingType;	
	this.pictureCodingType = this.buffer.getBits(3);
	this.buffer.advance(16); // skip vbv_delay
	// Skip B and D frames or unknown coding type
	if( this.pictureCodingType <= 0 || this.pictureCodingType >= PICTURE_TYPE_B ) {
		this._decoding = false;
		return false;
	}
	
	// full_pel_forward, forward_f_code
	this.macroblockMV = new Int16Array( this.mbSize*2 );
	if( this.pictureCodingType == PICTURE_TYPE_P ) {
		this.macroblockMVUint8 = new Uint8Array( this.macroblockMV.buffer ); 
		this.macroblockRepAdd = new Uint8Array( this.mbSize ); 
		this.fullPelForward = this.buffer.getBits(1);
		this.forwardFCode = this.buffer.getBits(3);
		if( this.forwardFCode == 0 ) {
			// Ignore picture with zero forward_f_code
			this._decoding = false;
			return false;
		}
		this.forwardRSize = this.forwardFCode - 1;
		this.forwardF = 1 << this.forwardRSize;
	}

	var currentY = this.currentY;
	var currentCb = this.currentCb;
	var currentCr = this.currentCr;
	
	// If this is a reference picutre then rotate the prediction pointers
	if( this.pictureCodingType != PICTURE_TYPE_I && ( pictureCodingTypePrevious == PICTURE_TYPE_I || this.pictureCodingType == PICTURE_TYPE_P ) ) {

		//reset residue buffers	
		this.currentYDCT16 = new Int16Array(this.codedSize);
		this.currentYDCTU8 = new Uint8Array(this.currentYDCT16.buffer);
		this.currentCrDCT16 = new Int16Array(this.codedSize >> 2);
		this.currentCrDCTU8 = new Uint8Array(this.currentCrDCT16.buffer);
		this.currentCbDCT16 = new Int16Array(this.codedSize >> 2);
		this.currentCbDCTU8 = new Uint8Array(this.currentCbDCT16.buffer);

	}

	var code = 0;
	do {
		code = this.buffer.findNextMPEGStartCode();
	} while( code == START_EXTENSION || code == START_USER_DATA );
	while( code >= START_SLICE_FIRST && code <= START_SLICE_LAST ) {
		this.decodeSlice( (code & 0x000000FF) );
		code = this.buffer.findNextMPEGStartCode();
	}
	// We found the nextItem start code; rewind 32bits and let the main loop handle it.
	this.buffer.rewind(32);

	this.IDCT_GL();
	
	
	this.prev_pic_framebuffer = this.framebuffer;	
	this._decoding = false;
	
	var ts = 0;
	if(this._currentTimeSeqUpdate){
		ts = this._currentTimeSeqUpdate;
		this._currentTimeSeqUpdate = 0;
	}
	this['go']('frame', {'ybr': [this.prev_pic_framebuffer[0].texture, this.prev_pic_framebuffer[1].texture, this.prev_pic_framebuffer[2].texture], 'ts':ts});
	
	return true;
};
// ----------------------------------------------------------------------------
// Slice Layer

jsv.prototype.quantizerScale = 0;
jsv.prototype.sliceBegin = false;

jsv.prototype.decodeSlice = function(slice) {	
	this.sliceBegin = true;
	this.macroblockAddress = (slice - 1) * this.mbWidth - 1;
	
	// Reset motion vectors and DC predictors
	this.motionFwH = this.motionFwHPrev = 0;
	this.motionFwV = this.motionFwVPrev = 0;
	this.dcPredictorY  = 128;
	this.dcPredictorCr = 128;
	this.dcPredictorCb = 128;
	
	this.quantizerScale = this.buffer.getBits(5);
	
	// skip extra bits
	while( this.buffer.getBits(1)) {
		this.buffer.advance(8);
	}

	do {
		this.decodeMacroblock();
		// We may have to ignore Video Stream Start Codes here (0xE0)!?
		//We know we have enough data - already checked picture size
	} while( !this.buffer.nextBytesAreStartCode());
}


// ----------------------------------------------------------------------------
// Macroblock Layer

jsv.prototype.macroblockAddress = 0;
jsv.prototype.mbRow = 0;
jsv.prototype.mbCol = 0;
	
jsv.prototype.macroblockType = 0;
jsv.prototype.macroblockIntra = false;
jsv.prototype.macroblockMotFw = false;
	
jsv.prototype.motionFwH = 0;
jsv.prototype.motionFwV = 0;
jsv.prototype.motionFwHPrev = 0;
jsv.prototype.motionFwVPrev = 0;

jsv.prototype.decodeMacroblock = function() {
	//
	// Decode macroblock_address_increment
	var 
		increment = 0,
		t = this.readCode(MACROBLOCK_ADDRESS_INCREMENT);
	
	while( t == 34 ) {
		// macroblock_stuffing
		t = this.readCode(MACROBLOCK_ADDRESS_INCREMENT);
	}
	while( t == 35 ) {
		// macroblock_escape
		increment += 33;
		t = this.readCode(MACROBLOCK_ADDRESS_INCREMENT);
	}
	increment += t;
	// Process any skipped macroblocks
	if( this.sliceBegin ) {
		// The first macroblock_address_increment of each slice is relative
		// to beginning of the preverious row, not the preverious macroblock
		this.sliceBegin = false;
		this.macroblockAddress += increment;
	}
	else {
		if( this.macroblockAddress + increment >= this.mbSize ) {
			// Illegal (too large) macroblock_address_increment
			return;
		}
		if( increment > 1 ) {
			// Skipped macroblocks reset DC predictors
			this.dcPredictorY  = 128;
			this.dcPredictorCr = 128;
			this.dcPredictorCb = 128;
			
			// Skipped macroblocks in P-pictures reset motion vectors
			if( this.pictureCodingType == PICTURE_TYPE_P ) {
				this.motionFwH = this.motionFwHPrev = 0;
				this.motionFwV = this.motionFwVPrev = 0;
			}
		}
		
		// Predict skipped macroblocks
		while( increment > 1) {
			this.macroblockAddress++;
			this.mbRow = (this.macroblockAddress / this.mbWidth)|0;
			this.mbCol = this.macroblockAddress % this.mbWidth;
			
			this.macroblockMV[2*(this.mbRow*this.mbWidth+this.mbCol)] = this.motionFwH;
			this.macroblockMV[2*(this.mbRow*this.mbWidth+this.mbCol)+1] = this.motionFwV;
			
			//this.copyMacroblock(this.motionFwH, this.motionFwV, this.forwardY, this.forwardCr, this.forwardCb);
			increment--;
		}
		this.macroblockAddress++;
	}
	this.mbRow = (this.macroblockAddress / this.mbWidth)|0;
	this.mbCol = this.macroblockAddress % this.mbWidth;

	// Process the current macroblock
	this.macroblockType = this.readCode(MACROBLOCK_TYPE_TABLES[this.pictureCodingType]);
	this.macroblockIntra = (this.macroblockType & 0x01);
	this.macroblockMotFw = (this.macroblockType & 0x08);

	// Quantizer scale
	if( (this.macroblockType & 0x10) != 0 ) {
		this.quantizerScale = this.buffer.getBits(5);
	}

	this.macroblockQuant[this.mbRow*this.mbWidth+this.mbCol] = this.quantizerScale;
	this.macroblockIsIntra[this.mbRow*this.mbWidth+this.mbCol] = this.macroblockIntra?255:0;

	if( this.macroblockIntra ) {
		// Intra-coded macroblocks reset motion vectors
		this.motionFwH = this.motionFwHPrev = 0;
		this.motionFwV = this.motionFwVPrev = 0;
	}
	else {
		// Non-intra macroblocks reset DC predictors
		this.dcPredictorY = 128;
		this.dcPredictorCr = 128;
		this.dcPredictorCb = 128;
		
		this.decodeMotionVectors();
		
		this.macroblockMV[2*(this.mbRow*this.mbWidth+this.mbCol)] = this.motionFwH;
		this.macroblockMV[2*(this.mbRow*this.mbWidth+this.mbCol)+1] = this.motionFwV;
		
		//this.copyMacroblock(this.motionFwH, this.motionFwV, this.forwardY, this.forwardCr, this.forwardCb);
	}

	// Decode blocks
	var cbp = ((this.macroblockType & 0x02) != 0) 
		? this.readCode(CODE_BLOCK_PATTERN) 
		: (this.macroblockIntra ? 0x3f : 0);

	for( var block = 0, mask = 0x20; block < 6; block++ ) {
		if( (cbp & mask) != 0 ) {
			this.decodeBlockGL(block);
		}
		mask >>= 1;
	}
	this.mbn++;	
};


jsv.prototype.decodeMotionVectors = function() {
	var code, d, r = 0;
	
	// Forward
	if( this.macroblockMotFw ) {
		// Horizontal forward
		code = this.readCode(MOTION);
		if( (code != 0) && (this.forwardF != 1) ) {
			r = this.buffer.getBits(this.forwardRSize);
			d = ((Math.abs(code) - 1) << this.forwardRSize) + r + 1;
			if( code < 0 ) {
				d = -d;
			}
		}
		else {
			d = code;
		}
		
		this.motionFwHPrev += d;
		if( this.motionFwHPrev > (this.forwardF << 4) - 1 ) {
			this.motionFwHPrev -= this.forwardF << 5;
		}
		else if( this.motionFwHPrev < ((-this.forwardF) << 4) ) {
			this.motionFwHPrev += this.forwardF << 5;
		}
		
		this.motionFwH = this.motionFwHPrev;
		if( this.fullPelForward ) {
			this.motionFwH <<= 1;
		}
		
		// Vertical forward
		code = this.readCode(MOTION);
		if( (code != 0) && (this.forwardF != 1) ) {
			r = this.buffer.getBits(this.forwardRSize);
			d = ((Math.abs(code) - 1) << this.forwardRSize) + r + 1;
			if( code < 0 ) {
				d = -d;
			}
		}
		else {
			d = code;
		}
		
		this.motionFwVPrev += d;
		if( this.motionFwVPrev > (this.forwardF << 4) - 1 ) {
			this.motionFwVPrev -= this.forwardF << 5;
		}
		else if( this.motionFwVPrev < ((-this.forwardF) << 4) ) {
			this.motionFwVPrev += this.forwardF << 5;
		}
		
		this.motionFwV = this.motionFwVPrev;
		if( this.fullPelForward ) {
			this.motionFwV <<= 1;
		}
	}
	else if( this.pictureCodingType == PICTURE_TYPE_P ) {
		// No motion information in P-picture, reset vectors
		this.motionFwH = this.motionFwHPrev = 0;
		this.motionFwV = this.motionFwVPrev = 0;
	}
};

jsv.prototype.copyMacroblock = function(motionH, motionV, sY, sCr, sCb ) {
	var 
		width, scan, 
		H, V, oddH, oddV,
		src, dest, last;

	// We use 32bit writes here
	var dY = this.currentY32;
	var dCb = this.currentCb32;
	var dCr = this.currentCr32;

	// Luminance
	width = this.codedWidth;
	scan = width - 16;
	
	H = motionH >> 1;
	V = motionV >> 1;
	oddH = (motionH & 1) == 1;
	oddV = (motionV & 1) == 1;
	
	src = ((this.mbRow << 4) + V) * width + (this.mbCol << 4) + H;
	dest = (this.mbRow * width + this.mbCol) << 2;
	last = dest + (width << 2);

	var y1, y2, y;
	if( oddH ) {
		if( oddV ) {
			while( dest < last ) {
				y1 = sY[src] + sY[src+width]; src++;
				for( var x = 0; x < 4; x++ ) {
					y2 = sY[src] + sY[src+width]; src++;
					y = (((y1 + y2 + 2) >> 2) & 0xff);

					y1 = sY[src] + sY[src+width]; src++;
					y |= (((y1 + y2 + 2) << 6) & 0xff00);
					
					y2 = sY[src] + sY[src+width]; src++;
					y |= (((y1 + y2 + 2) << 14) & 0xff0000);

					y1 = sY[src] + sY[src+width]; src++;
					y |= (((y1 + y2 + 2) << 22) & 0xff000000);

					dY[dest++] = y;
				}
				dest += scan >> 2; src += scan-1;
			}
		}
		else {
			while( dest < last ) {
				y1 = sY[src++];
				for( var x = 0; x < 4; x++ ) {
					y2 = sY[src++];
					y = (((y1 + y2 + 1) >> 1) & 0xff);
					
					y1 = sY[src++];
					y |= (((y1 + y2 + 1) << 7) & 0xff00);
					
					y2 = sY[src++];
					y |= (((y1 + y2 + 1) << 15) & 0xff0000);
					
					y1 = sY[src++];
					y |= (((y1 + y2 + 1) << 23) & 0xff000000);

					dY[dest++] = y;
				}
				dest += scan >> 2; src += scan-1;
			}
		}
	}
	else {
		if( oddV ) {
			while( dest < last ) {
				for( var x = 0; x < 4; x++ ) {
					y = (((sY[src] + sY[src+width] + 1) >> 1) & 0xff); src++;
					y |= (((sY[src] + sY[src+width] + 1) << 7) & 0xff00); src++;
					y |= (((sY[src] + sY[src+width] + 1) << 15) & 0xff0000); src++;
					y |= (((sY[src] + sY[src+width] + 1) << 23) & 0xff000000); src++;
					
					dY[dest++] = y;
				}
				dest += scan >> 2; src += scan;
			}
		}
		else {
			while( dest < last ) {
				for( var x = 0; x < 4; x++ ) {
					y = sY[src]; src++;
					y |= sY[src] << 8; src++;
					y |= sY[src] << 16; src++;
					y |= sY[src] << 24; src++;

					dY[dest++] = y;
				}
				dest += scan >> 2; src += scan;
			}
		}
	}
	
	// if( this.bwFilter ) {
		// No need to copy chrominance when black&white filter is active
		// return;
	// }
	

	// Chrominance
	
	width = this.halfWidth;
	scan = width - 8;
	
	H = (motionH/2) >> 1;
	V = (motionV/2) >> 1;
	oddH = ((motionH/2) & 1) == 1;
	oddV = ((motionV/2) & 1) == 1;
	
	src = ((this.mbRow << 3) + V) * width + (this.mbCol << 3) + H;
	dest = (this.mbRow * width + this.mbCol) << 1;
	last = dest + (width << 1);
	
	var cr1, cr2, cr;
	var cb1, cb2, cb;
	if( oddH ) {
		if( oddV ) {
			while( dest < last ) {
				cr1 = sCr[src] + sCr[src+width];
				cb1 = sCb[src] + sCb[src+width];
				src++;
				for( var x = 0; x < 2; x++ ) {
					cr2 = sCr[src] + sCr[src+width];
					cb2 = sCb[src] + sCb[src+width]; src++;
					cr = (((cr1 + cr2 + 2) >> 2) & 0xff);
					cb = (((cb1 + cb2 + 2) >> 2) & 0xff);

					cr1 = sCr[src] + sCr[src+width];
					cb1 = sCb[src] + sCb[src+width]; src++;
					cr |= (((cr1 + cr2 + 2) << 6) & 0xff00);
					cb |= (((cb1 + cb2 + 2) << 6) & 0xff00);

					cr2 = sCr[src] + sCr[src+width];
					cb2 = sCb[src] + sCb[src+width]; src++;
					cr |= (((cr1 + cr2 + 2) << 14) & 0xff0000);
					cb |= (((cb1 + cb2 + 2) << 14) & 0xff0000);

					cr1 = sCr[src] + sCr[src+width];
					cb1 = sCb[src] + sCb[src+width]; src++;
					cr |= (((cr1 + cr2 + 2) << 22) & 0xff000000);
					cb |= (((cb1 + cb2 + 2) << 22) & 0xff000000);

					dCr[dest] = cr;
					dCb[dest] = cb;
					dest++;
				}
				dest += scan >> 2; src += scan-1;
			}
		}
		else {
			while( dest < last ) {
				cr1 = sCr[src];
				cb1 = sCb[src];
				src++;
				for( var x = 0; x < 2; x++ ) {
					cr2 = sCr[src];
					cb2 = sCb[src++];
					cr = (((cr1 + cr2 + 1) >> 1) & 0xff);
					cb = (((cb1 + cb2 + 1) >> 1) & 0xff);

					cr1 = sCr[src];
					cb1 = sCb[src++];
					cr |= (((cr1 + cr2 + 1) << 7) & 0xff00);
					cb |= (((cb1 + cb2 + 1) << 7) & 0xff00);

					cr2 = sCr[src];
					cb2 = sCb[src++];
					cr |= (((cr1 + cr2 + 1) << 15) & 0xff0000);
					cb |= (((cb1 + cb2 + 1) << 15) & 0xff0000);

					cr1 = sCr[src];
					cb1 = sCb[src++];
					cr |= (((cr1 + cr2 + 1) << 23) & 0xff000000);
					cb |= (((cb1 + cb2 + 1) << 23) & 0xff000000);

					dCr[dest] = cr;
					dCb[dest] = cb;
					dest++;
				}
				dest += scan >> 2; src += scan-1;
			}
		}
	}
	else {
		if( oddV ) {
			while( dest < last ) {
				for( var x = 0; x < 2; x++ ) {
					cr = (((sCr[src] + sCr[src+width] + 1) >> 1) & 0xff);
					cb = (((sCb[src] + sCb[src+width] + 1) >> 1) & 0xff); src++;

					cr |= (((sCr[src] + sCr[src+width] + 1) << 7) & 0xff00);
					cb |= (((sCb[src] + sCb[src+width] + 1) << 7) & 0xff00); src++;

					cr |= (((sCr[src] + sCr[src+width] + 1) << 15) & 0xff0000);
					cb |= (((sCb[src] + sCb[src+width] + 1) << 15) & 0xff0000); src++;

					cr |= (((sCr[src] + sCr[src+width] + 1) << 23) & 0xff000000);
					cb |= (((sCb[src] + sCb[src+width] + 1) << 23) & 0xff000000); src++;
					
					dCr[dest] = cr;
					dCb[dest] = cb;
					dest++;
				}
				dest += scan >> 2; src += scan;
			}
		}
		else {
			while( dest < last ) {
				for( var x = 0; x < 2; x++ ) {
					cr = sCr[src];
					cb = sCb[src]; src++;

					cr |= sCr[src] << 8;
					cb |= sCb[src] << 8; src++;

					cr |= sCr[src] << 16;
					cb |= sCb[src] << 16; src++;

					cr |= sCr[src] << 24;
					cb |= sCb[src] << 24; src++;

					dCr[dest] = cr;
					dCb[dest] = cb;
					dest++;
				}
				dest += scan >> 2; src += scan;
			}
		}
	}
};


// ----------------------------------------------------------------------------
// Block layer

jsv.prototype.dcPredictorY;
jsv.prototype.dcPredictorCr;
jsv.prototype.dcPredictorCb;

jsv.prototype.blockData = null;

jsv.prototype.print_data = function(width, height, pixels ){
	for( var j = 0; j < height; j++ ){
		var line = '';
		for( var i = 0; i < width; i++ ){
			line += pixels[j*width+i] + ' ';
		}
		
	}
			
}
jsv.prototype.dumpPixels2 = function(width, height){
		
		var gl = this.gl;
		var pixelsNumber = width*height;
		var multipl = 4;
		var pixels = new Uint8Array(pixelsNumber*multipl);
		var imgData = gl.readPixels( 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		this.print_data( width*multipl, height, pixels );
	}
jsv.prototype.GLfreeDecodedBuffers = function(){
	for( var j = 0; j < this.rendered_frames_n; j++ ){ 
		this.glFrameBuffers.rendered[j][0].texture.inuse = 0;
	}
}
jsv.prototype.setRenderBuffer = function(){
	for( var j = 0; j < this.rendered_frames_n; j++ ){ 
		var fbo_rendered = this.glFrameBuffers.rendered[j];
		if( !fbo_rendered[0].texture.inuse ){
			//
			fbo_rendered[0].texture.inuse = 1;
			this.framebuffer = fbo_rendered;
			return;
		}
	}	
	throw new Error( "no free render buffers" );
}
jsv.prototype.IDCT_GL = function() {
	
	this._dctData = [
		this.currentYDCTU8,
		this.currentCbDCTU8,
		this.currentCrDCTU8
	];
	this._prediction = [
		this.currentY,
		this.currentCb,
		this.currentCr
	];
	// -32768 : 32767
	//if( this.pictureCodingType == PICTURE_TYPE_P ) {
	//	this['go']('frame', {'ybr': this._prediction, 'ts':0});
	//	return;	
		//throw new Error( 'prediction' );
	//}
	var gl = this.gl;

	var uniforms = this.programs.idct_columns.uniforms;
	gl.useProgram( this.programs.idct_columns.program );
	
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, this.TextureDCTQuant);
	

	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, this.TextureDCTQuantScale);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, this.mbWidth, this.mbHeight, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.macroblockQuant );

	if( !this.yuva ){	
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, this.TextureDCTPremultiple);
	}

	//
	//
	gl.activeTexture(gl.TEXTURE4);
	gl.bindTexture(gl.TEXTURE_2D, this.TextureIntre);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, this.mbWidth, this.mbHeight, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.macroblockIsIntra );

	//TODO:remove this ?
	//gl.activeTexture(gl.TEXTURE5);
	//gl.bindTexture(gl.TEXTURE_2D, this.TextureZigZag);
	
	for( var comp = 0; comp < 3; comp++ ) {

		//
		var width = this.codedWidth;
		var height = this.codedHeight;
		if( comp != 0 ) {
			width >>= 1;
			height >>= 1;
		}
		gl.activeTexture(gl.TEXTURE6);
		gl.bindTexture(gl.TEXTURE_2D, this.TextureLastNonZero);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, comp ? this.mbWidth : this.mbWidth * 2, comp ? this.mbHeight : this.mbHeight * 2, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.last_non_zero[comp] );

		//we pack input coeff in luminance alpha and not rgba to avoid non constant index into a pel ( rg vs ba )
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.TextureDCT);
		//
		//
		//
		//
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE_ALPHA, width, height, 0, gl.LUMINANCE_ALPHA, gl.UNSIGNED_BYTE, this._dctData[comp] );
/*
		if( comp == 1 ) {
			for( var h = 0; h <  height; h++ ) { 
				var line = '';
				for( var w = 0; w < width; w++ ) {
					line += ' ' + w + ':' + this.currentCbDCT16[h*width+w];
				}
				
			}
		}	
*/
		gl.uniform1i(uniforms.width, width);
		gl.uniform1i(uniforms.height, height);

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.glFrameBuffers.idct_1d[comp].framebuffer);
		
		gl.viewport(0, 0, width / 2, height);
			
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		//if( comp == 1 ){
			//this.dumpPixels2( width / 2, height );
		//}
			

	}

	//return;
	//throw new Error('vse');
	if( this.pictureCodingType == PICTURE_TYPE_I ) { 
		var program = this.programs.idct_rows_intra.program;
		var uniforms = this.programs.idct_rows_intra.uniforms;
	} else {
		program = this.programs.idct_rows_inter.program;
		uniforms = this.programs.idct_rows_inter.uniforms;
	}
	gl.useProgram( program );

	if( this.pictureCodingType == PICTURE_TYPE_P ) {
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.TextureIntre);	
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, this.mbWidth, this.mbHeight, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.macroblockRepAdd );
	
		//
		//
/*
		for( var t = 0; t < this.macroblockMV.length; t++ ) {
			this.macroblockMV[t] >>= 1;
		}
		//this.macroblockMV[12] = -4;
		//this.macroblockMV[13] = -4;
*/		
	
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, this.TextureMV);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.mbWidth, this.mbHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.macroblockMVUint8 );
		//		
		//
	}
	//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	
	this.setRenderBuffer();
	for( var comp = 0; comp < 3; comp++ ) {
		var width = this.codedWidth;
		var height = this.codedHeight;
		if( comp != 0 ) {
			width >>= 1;
			height >>= 1;
		}


		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.glFrameBuffers.idct_1d[comp].texture);
		
		if( this.pictureCodingType == PICTURE_TYPE_P ) { 
			gl.uniform1f(uniforms.mv_coef, comp == 0 ? 1.0 : 0.5 );
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, this.prev_pic_framebuffer[comp].texture);
		}
	
		gl.uniform1i(uniforms.width, width / 2);
		gl.uniform1i(uniforms.height, height);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer[comp].framebuffer);
			
		gl.viewport(0, 0, width / 4, height);
			
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		if( comp == 0 && this.pictureCodingType == PICTURE_TYPE_P){
			//this.dumpPixels2( width / 4, height );
		}
		
	}
	//throw new Error( 'ta' );
}

jsv.prototype.decodeBlockGL = function(block) {
	var
		n = 0;
	
	// Clear preverious data
	this.fillArray(this.blockData, 0);
	
	// Decode DC coefficient of intra-coded blocks
	if( this.macroblockIntra ) {
		var 
			predictor,
			dctSize;
		
		// DC prediction
		
		if( block < 4 ) {
			predictor = this.dcPredictorY;
			dctSize = this.readCode(DCT_DC_SIZE_LUMINANCE);
		}
		else {
			predictor = (block == 4 ? this.dcPredictorCr : this.dcPredictorCb);
			dctSize = this.readCode(DCT_DC_SIZE_CHROMINANCE);
		}
		
		// Read DC coeff
		if( dctSize > 0 ) {
			var differential = this.buffer.getBits(dctSize);
			if( (differential & (1 << (dctSize - 1))) != 0 ) {
				this.blockData[0] = predictor + differential;
			}
			else {
				this.blockData[0] = predictor + ((-1 << dctSize)|(differential+1));
			}
		}
		else {
			this.blockData[0] = predictor;
		}
		
		// Save predictor value
		if( block < 4 ) {
			this.dcPredictorY = this.blockData[0];
		}
		else if( block == 4 ) {
			this.dcPredictorCr = this.blockData[0];
		}
		else {
			this.dcPredictorCb = this.blockData[0];
		}
		
		// Dequantize + premultiply
		// this.blockData[0] <<= (3 + 5);
		
		// if( this.blockData[0] > 32767 || this.blockData[0] < -32768) {
			// throw new Error( 'DC out of range ' + this.blockData[0] );
		// }
		
		n = 1;
	}
	else {
	}
	// Decode AC coefficients (+DC for non-intra)
	var level = 0;
	while( true ) {
		var 
			run = 0,
			coeff = this.readCode(DCT_COEFF);
		
		if( (coeff == 0x0001) && (n > 0) && (this.buffer.getBits(1) == 0) ) {
			// end_of_block
			break;
		}
		if( coeff == 0xffff ) {
			// escape
			run = this.buffer.getBits(6);
			level = this.buffer.getBits(8);
			if( level == 0 ) {
				level = this.buffer.getBits(8);
			}
			else if( level == 128 ) {
				level = this.buffer.getBits(8) - 256;
			}
			else if( level > 128 ) {
				level = level - 256;
			}
		}
		else {
			run = coeff >> 8;
			level = coeff & 0xff;
			if( this.buffer.getBits(1) ) {
				level = -level;
			}
		}
		n += run;
		var dezigZagged = ZIG_ZAG[n];
		n++;
		
		// Dequantize, oddify, clip
		/*
		level <<= 1;
		if( !this.macroblockIntra ) {
			level += (level < 0 ? -1 : 1);
		}
		*/
		// Save premultiplied coefficient
		this.blockData[dezigZagged] = level;
	};
	// Transform block data to the spatial domain
/*	
	if( n == 1 ) {
		// Only DC coeff., no IDCT needed
		
		//this.fillArray(this.blockData, (this.blockData[0] + 128) >> 8);
	}
*/
	//	
	//
	// Move block to its place
	var
		z,
		last_non_zero_index,
		destArray,
		destIndex,
		scan;
	
	if( block < 4 ) {
		z = 0;
		var blockRow = this.mbRow*2;
		var blockCol = this.mbCol*2;
		destArray = this.currentYDCT16;
		scan = this.codedWidth - 8;
		destIndex = (this.mbRow * this.codedWidth + this.mbCol) << 4;
		if( (block & 1) != 0 ) {
			blockCol++;
			destIndex += 8;
		}
		if( (block & 2) != 0 ) {
			blockRow++;
			destIndex += this.codedWidth << 3;
		}
		last_non_zero_index = blockRow*(this.mbWidth*2) + blockCol;
	}
	else {
		z = block == 4 ? 1 : 2;
		last_non_zero_index = this.mbRow*this.mbWidth+this.mbCol;
		destArray = (block == 4) ? this.currentCbDCT16 : this.currentCrDCT16;
		scan = (this.codedWidth >> 1) - 8;
		destIndex = ((this.mbRow * this.codedWidth) << 2) + (this.mbCol << 3);
	}


	this.last_non_zero[z][last_non_zero_index] = n;
	/*
	
	for( var j = 0;j<8;j++){
		var l ='';
		for( var i = 0; i <8; i++){
			l += this.blockData[j*8+i] + ' ';
		}
		
	}
	*/	
	var blockData = this.blockData;
	//
	this.copyBlockToDestination(this.blockData, destArray, destIndex, scan);
	if( this.pictureCodingType == PICTURE_TYPE_P && this.macroblockIntra ) {
		//
		this.macroblockRepAdd[this.mbRow*this.mbWidth+this.mbCol] = 255;
	}
	/*if( block == 0 && this.macroblockIntra && this.pictureCodingType == PICTURE_TYPE_P ) {
		
		printBlock( this.blockData );
	}*/
		/*
	if( this.macroblockIntra && this.pictureCodingType == PICTURE_TYPE_P ) {
		//we need to clear prediction
		if( block < 4 ) {
			destArray = this.currentY;
		} else if ( block == 4 ) {
			destArray = this.currentCb;
		} else {
			destArray = this.currentCr;
		}

		this.clearBlock( destArray, destIndex, scan );

	}
	*/
};
function printBlock( block ){
	for( var y = 0; y <8;y++){
		var s ='';
		for( var x=0;x<8;x++){
			s += block[y*8+x] + ', ';
		}
		
	}
}
jsv.prototype.clearBlock = function( destArray, destIndex, scan) {
	//
	var n = 0;
	for( var i = 0; i < 8; i++ ) {
		for( var j = 0; j < 8; j++ ) {
			destArray[destIndex++] = 0;
		}
		destIndex += scan;
	}
}

jsv.prototype.copyBlockToDestination = function(blockData, destArray, destIndex, scan) {
	var n = 0;
	for( var i = 0; i < 8; i++ ) {
		for( var j = 0; j < 8; j++ ) {
			destArray[destIndex++] = blockData[n++];
		}
		destIndex += scan;
	}
};

jsv.prototype.addBlockToDestination = function(blockData, destArray, destIndex, scan) {
	var n = 0;
	for( var i = 0; i < 8; i++ ) {
		for( var j = 0; j < 8; j++ ) {
			destArray[destIndex++] += blockData[n++];
		}
		destIndex += scan;
	}
};
/*
// Clamping version for shitty browsers (IE) that don't support Uint8ClampedArray
jsv.prototype.copyBlockToDestinationClamp = function(blockData, destArray, destIndex, scan) {
	var n = 0;
	for( var i = 0; i < 8; i++ ) {
		for( var j = 0; j < 8; j++ ) {
			var p = blockData[n++];
			destArray[destIndex++] = p > 255 ? 255 : (p < 0 ? 0 : p);
		}
		destIndex += scan;
	}
};

jsv.prototype.addBlockToDestinationClamp = function(blockData, destArray, destIndex, scan) {
	var n = 0;
	for( var i = 0; i < 8; i++ ) {
		for( var j = 0; j < 8; j++ ) {
			var p = blockData[n++] + destArray[destIndex];
			destArray[destIndex++] = p > 255 ? 255 : (p < 0 ? 0 : p);
		}
		destIndex += scan;
	}
};
*/

// ----------------------------------------------------------------------------
// Utilities

jsv.prototype.readCode = function(codeTable) {
	var state = 0;
	do {
		state = codeTable[state + this.buffer.getBits(1)];
	} while( state >= 0 && codeTable[state] != 0);
	return codeTable[state+2];
};

jsv.prototype.findStartCode = function( code ) {
	var current = 0;
	while( true ) {
		current = this.buffer.findNextMPEGStartCode();
		if( current == code || current == BitReader.NOT_FOUND || current == BitReader.STALLING ) {
			return current;
		}
	}
};

jsv.prototype.fillArray = function(a, value) {
	var len = a.length;
	while (--len >= 0) {
     		a[len] = value;
    	}
};

jsv.prototype['seek'] = function(targetTime){
	
	if(this._decoding){
		return false;
	}
	this.GLfreeDecodedBuffers();	
	if(this._keyMap){
		var seekedByte = this._getByteFromKeyMap(targetTime);
	}else{
		seekedByte = Math.round(this.buffer.bufferLengthTotal*targetTime/this._meta['d']);
	}
	if(this.buffer.seek(seekedByte) === true){
		
		do{
			if(this.findStartCode(START_SEQUENCE) == BitReader.STALLING){
				return false;
			}
			this.decodeSequenceHeader();
			if(this.findStartCode(START_GOP) == BitReader.STALLING){
				return false;
			}
			this.decodeGopHeader();
		}while(targetTime - this._currentTime > SEEK_PRESISION_MS)
		
		this['go']('seeked', [targetTime, this._currentTime]);
		return true;
	}else{
		// 
		return false;
	}
};

//bitreader
var BitReaderJsv = function(){
  BitReader.apply(this,arguments);
}

BitReaderJsv.prototype = Object.create(BitReader.prototype);
BitReaderJsv.prototype.constructor = BitReaderJsv;

BitReaderJsv.prototype.moreThan4BytesLeft = function() {	
	if(this._live){
		return true;
	}else if(!this._hls){
		return this.index < this.NextMPEGStartCodeLimit;
	}else{
		// 
		return (this.currentBuffer.start != this._hls[this._hls.length-1].start) || ((this.currentBuffer.data.byteLength << 3) - this.indexInBuffer >= 32)
	}
}


BitReaderJsv.prototype.findNextMPEGStartCode = function() {	
	this.indexInBuffer = (this.indexInBuffer+7 >> 3) << 3;
	this.index = (this.index+7 >> 3) << 3;
	while( this.moreThan4BytesLeft() ) {
		if(this.nextBytesAreStartCode()) {
			
			var diff = (this.indexInBuffer >> 3) +4 -this.currentBuffer.data.byteLength-1;
			if(diff > 0){
				
				if(this.currentBuffer.nextItem && (this.currentBuffer.end+1 == this.currentBuffer.nextItem.start)){
					// 
					this.previousBuffer = this.currentBuffer;
					this.currentBuffer = this.currentBuffer.nextItem;
					this.bufferLength = this.currentBuffer.data.byteLength;
					this.index = (this.currentBuffer.start + diff) << 3;
					this.indexInBuffer = diff << 3;
					
					this._onBufferAdvance();
					return this.currentBuffer.data[diff];
					
					
					
				}else{
					this.onStalled(this.currentBuffer.end+1);
					return BitReader.STALLING;
				}
			}else{
				this.indexInBuffer += 32;
				this.index += 32;
				return this.currentBuffer.data[(this.indexInBuffer-8)>>3];
			}
		}
		
		this.advance(8);
	}
	this.index = (this.bufferLengthTotal << 3);
	return BitReader.NOT_FOUND;
};


BitReaderJsv.prototype.nextBytesAreStartCode = function() {
	if((this.index+7 >> 3) >= this.bufferLengthTotal){
		return true;
	}
	var i = (this.indexInBuffer+7 >> 3);
	var diff = this.bufferLength - i;
	if(diff>2){
		return (
			(
				this.currentBuffer.data[i] == 0x00 && 
				this.currentBuffer.data[i+1] == 0x00 &&
				this.currentBuffer.data[i+2] == 0x01
			)
		);
	}else{
		if(this.currentBuffer.nextItem && (this.currentBuffer.end+1 == this.currentBuffer.nextItem.start)){
			switch(diff){
				case 2:
					return (
						(
							this.currentBuffer.data[i] == 0x00 && 
							this.currentBuffer.data[i+1] == 0x00 &&
							this.currentBuffer.nextItem.data[0] == 0x01
						)
					);
				break;
				case 1:
					return (
						(
							this.currentBuffer.data[i] == 0x00 && 
							this.currentBuffer.nextItem.data[0] == 0x00 &&
							this.currentBuffer.nextItem.data[1] == 0x01
						)
					);
				break;
				default:
					return (
						(
							this.currentBuffer.nextItem.data[0] == 0x00 && 
							this.currentBuffer.nextItem.data[1] == 0x00 &&
							this.currentBuffer.nextItem.data[2] == 0x01
						)
					);
				break;
			}
		}else{
			this.onStalled(this.currentBuffer.end+1);
			return BitReader.STALLING;
		}
	}
};

var PICTURE_RATE = [
		0.000, 23.976, 24.000, 25.000, 29.970, 30.000, 50.000, 59.940,
		60.000,  15.000,  5.000,  10.000,  12.000,  15.000,  0.000,  0.000
	],
	ZIG_ZAG = new Uint8Array([
		 0,  1,  8, 16,  9,  2,  3, 10,
		17, 24, 32, 25, 18, 11,  4,  5,
		12, 19, 26, 33, 40, 48, 41, 34,
		27, 20, 13,  6,  7, 14, 21, 28,
		35, 42, 49, 56, 57, 50, 43, 36,
		29, 22, 15, 23, 30, 37, 44, 51,
		58, 59, 52, 45, 38, 31, 39, 46,
		53, 60, 61, 54, 47, 55, 62, 63
	]),
ZIG_ZAG_INVERSE = new Uint8Array([0, 1, 5, 6, 14, 15, 27, 28, 2, 4, 7, 13, 16, 26, 29, 42, 3, 8, 12, 17, 25, 30, 41, 43, 9, 11, 18, 24, 31, 40, 44, 53, 10, 19, 23, 32, 39, 45, 52, 54, 20, 22, 33, 38, 46, 51, 55, 60, 21, 34, 37, 47, 50, 56, 59, 61, 35, 36, 48, 49, 57, 58, 62, 63]),
	DEFAULT_INTRA_QUANT_MATRIX = new Uint8Array([
		 8, 16, 19, 22, 26, 27, 29, 34,
		16, 16, 22, 24, 27, 29, 34, 37,
		19, 22, 26, 27, 29, 34, 34, 38,
		22, 22, 26, 27, 29, 34, 37, 40,
		22, 26, 27, 29, 32, 35, 40, 48,
		26, 27, 29, 32, 35, 40, 48, 58,
		26, 27, 29, 34, 38, 46, 56, 69,
		27, 29, 35, 38, 46, 56, 69, 83
	]),
	DEFAULT_NON_INTRA_QUANT_MATRIX = new Uint8Array([
		16, 16, 16, 16, 16, 16, 16, 16,
		16, 16, 16, 16, 16, 16, 16, 16,
		16, 16, 16, 16, 16, 16, 16, 16,
		16, 16, 16, 16, 16, 16, 16, 16,
		16, 16, 16, 16, 16, 16, 16, 16,
		16, 16, 16, 16, 16, 16, 16, 16,
		16, 16, 16, 16, 16, 16, 16, 16,
		16, 16, 16, 16, 16, 16, 16, 16
	]),
	PREMULTIPLIER_MATRIX = new Uint8Array([
		32, 44, 42, 38, 32, 25, 17,  9,
		44, 62, 58, 52, 44, 35, 24, 12,
		42, 58, 55, 49, 42, 33, 23, 12,
		38, 52, 49, 44, 38, 30, 20, 10,
		32, 44, 42, 38, 32, 25, 17,  9,
		25, 35, 33, 30, 25, 20, 14,  7,
		17, 24, 23, 20, 17, 14,  9,  5,
		 9, 12, 12, 10,  9,  7,  5,  2
	]),

	
	
	// MPEG-1 VLC
	
	//  macroblock_stuffing decodes as 34.
	//  macroblock_escape decodes as 35.
	
	MACROBLOCK_ADDRESS_INCREMENT = new Int16Array([
		 1*3,  2*3,  0, //   0
		 3*3,  4*3,  0, //   1  0
		   0,    0,  1, //   2  1.
		 5*3,  6*3,  0, //   3  00
		 7*3,  8*3,  0, //   4  01
		 9*3, 10*3,  0, //   5  000
		11*3, 12*3,  0, //   6  001
		   0,    0,  3, //   7  010.
		   0,    0,  2, //   8  011.
		13*3, 14*3,  0, //   9  0000
		15*3, 16*3,  0, //  10  0001
		   0,    0,  5, //  11  0010.
		   0,    0,  4, //  12  0011.
		17*3, 18*3,  0, //  13  0000 0
		19*3, 20*3,  0, //  14  0000 1
		   0,    0,  7, //  15  0001 0.
		   0,    0,  6, //  16  0001 1.
		21*3, 22*3,  0, //  17  0000 00
		23*3, 24*3,  0, //  18  0000 01
		25*3, 26*3,  0, //  19  0000 10
		27*3, 28*3,  0, //  20  0000 11
		  -1, 29*3,  0, //  21  0000 000
		  -1, 30*3,  0, //  22  0000 001
		31*3, 32*3,  0, //  23  0000 010
		33*3, 34*3,  0, //  24  0000 011
		35*3, 36*3,  0, //  25  0000 100
		37*3, 38*3,  0, //  26  0000 101
		   0,    0,  9, //  27  0000 110.
		   0,    0,  8, //  28  0000 111.
		39*3, 40*3,  0, //  29  0000 0001
		41*3, 42*3,  0, //  30  0000 0011
		43*3, 44*3,  0, //  31  0000 0100
		45*3, 46*3,  0, //  32  0000 0101
		   0,    0, 15, //  33  0000 0110.
		   0,    0, 14, //  34  0000 0111.
		   0,    0, 13, //  35  0000 1000.
		   0,    0, 12, //  36  0000 1001.
		   0,    0, 11, //  37  0000 1010.
		   0,    0, 10, //  38  0000 1011.
		47*3,   -1,  0, //  39  0000 0001 0
		  -1, 48*3,  0, //  40  0000 0001 1
		49*3, 50*3,  0, //  41  0000 0011 0
		51*3, 52*3,  0, //  42  0000 0011 1
		53*3, 54*3,  0, //  43  0000 0100 0
		55*3, 56*3,  0, //  44  0000 0100 1
		57*3, 58*3,  0, //  45  0000 0101 0
		59*3, 60*3,  0, //  46  0000 0101 1
		61*3,   -1,  0, //  47  0000 0001 00
		  -1, 62*3,  0, //  48  0000 0001 11
		63*3, 64*3,  0, //  49  0000 0011 00
		65*3, 66*3,  0, //  50  0000 0011 01
		67*3, 68*3,  0, //  51  0000 0011 10
		69*3, 70*3,  0, //  52  0000 0011 11
		71*3, 72*3,  0, //  53  0000 0100 00
		73*3, 74*3,  0, //  54  0000 0100 01
		   0,    0, 21, //  55  0000 0100 10.
		   0,    0, 20, //  56  0000 0100 11.
		   0,    0, 19, //  57  0000 0101 00.
		   0,    0, 18, //  58  0000 0101 01.
		   0,    0, 17, //  59  0000 0101 10.
		   0,    0, 16, //  60  0000 0101 11.
		   0,    0, 35, //  61  0000 0001 000. -- macroblock_escape
		   0,    0, 34, //  62  0000 0001 111. -- macroblock_stuffing
		   0,    0, 33, //  63  0000 0011 000.
		   0,    0, 32, //  64  0000 0011 001.
		   0,    0, 31, //  65  0000 0011 010.
		   0,    0, 30, //  66  0000 0011 011.
		   0,    0, 29, //  67  0000 0011 100.
		   0,    0, 28, //  68  0000 0011 101.
		   0,    0, 27, //  69  0000 0011 110.
		   0,    0, 26, //  70  0000 0011 111.
		   0,    0, 25, //  71  0000 0100 000.
		   0,    0, 24, //  72  0000 0100 001.
		   0,    0, 23, //  73  0000 0100 010.
		   0,    0, 22  //  74  0000 0100 011.
	]),
	
	//  macroblock_type bitmap:
	//    0x10  macroblock_quant
	//    0x08  macroblock_motion_forward
	//    0x04  macroblock_motion_backward
	//    0x02  macrobkock_pattern
	//    0x01  macroblock_intra
	//
	
	MACROBLOCK_TYPE_I = new Int8Array([
		 1*3,  2*3,     0, //   0
		  -1,  3*3,     0, //   1  0
		   0,    0,  0x01, //   2  1.
		   0,    0,  0x11  //   3  01.
	]),
	
	MACROBLOCK_TYPE_P = new Int8Array([
		 1*3,  2*3,     0, //  0
		 3*3,  4*3,     0, //  1  0
		   0,    0,  0x0a, //  2  1.
		 5*3,  6*3,     0, //  3  00
		   0,    0,  0x02, //  4  01.
		 7*3,  8*3,     0, //  5  000
		   0,    0,  0x08, //  6  001.
		 9*3, 10*3,     0, //  7  0000
		11*3, 12*3,     0, //  8  0001
		  -1, 13*3,     0, //  9  00000
		   0,    0,  0x12, // 10  00001.
		   0,    0,  0x1a, // 11  00010.
		   0,    0,  0x01, // 12  00011.
		   0,    0,  0x11  // 13  000001.
	]),
	
	MACROBLOCK_TYPE_B = new Int8Array([
		 1*3,  2*3,     0,  //  0
		 3*3,  5*3,     0,  //  1  0
		 4*3,  6*3,     0,  //  2  1
		 8*3,  7*3,     0,  //  3  00
		   0,    0,  0x0c,  //  4  10.
		 9*3, 10*3,     0,  //  5  01
		   0,    0,  0x0e,  //  6  11.
		13*3, 14*3,     0,  //  7  001
		12*3, 11*3,     0,  //  8  000
		   0,    0,  0x04,  //  9  010.
		   0,    0,  0x06,  // 10  011.
		18*3, 16*3,     0,  // 11  0001
		15*3, 17*3,     0,  // 12  0000
		   0,    0,  0x08,  // 13  0010.
		   0,    0,  0x0a,  // 14  0011.
		  -1, 19*3,     0,  // 15  00000
		   0,    0,  0x01,  // 16  00011.
		20*3, 21*3,     0,  // 17  00001
		   0,    0,  0x1e,  // 18  00010.
		   0,    0,  0x11,  // 19  000001.
		   0,    0,  0x16,  // 20  000010.
		   0,    0,  0x1a   // 21  000011.
	]),
	
	CODE_BLOCK_PATTERN = new Int16Array([
		  2*3,   1*3,   0,  //   0
		  3*3,   6*3,   0,  //   1  1
		  4*3,   5*3,   0,  //   2  0
		  8*3,  11*3,   0,  //   3  10
		 12*3,  13*3,   0,  //   4  00
		  9*3,   7*3,   0,  //   5  01
		 10*3,  14*3,   0,  //   6  11
		 20*3,  19*3,   0,  //   7  011
		 18*3,  16*3,   0,  //   8  100
		 23*3,  17*3,   0,  //   9  010
		 27*3,  25*3,   0,  //  10  110
		 21*3,  28*3,   0,  //  11  101
		 15*3,  22*3,   0,  //  12  000
		 24*3,  26*3,   0,  //  13  001
		    0,     0,  60,  //  14  111.
		 35*3,  40*3,   0,  //  15  0000
		 44*3,  48*3,   0,  //  16  1001
		 38*3,  36*3,   0,  //  17  0101
		 42*3,  47*3,   0,  //  18  1000
		 29*3,  31*3,   0,  //  19  0111
		 39*3,  32*3,   0,  //  20  0110
		    0,     0,  32,  //  21  1010.
		 45*3,  46*3,   0,  //  22  0001
		 33*3,  41*3,   0,  //  23  0100
		 43*3,  34*3,   0,  //  24  0010
		    0,     0,   4,  //  25  1101.
		 30*3,  37*3,   0,  //  26  0011
		    0,     0,   8,  //  27  1100.
		    0,     0,  16,  //  28  1011.
		    0,     0,  44,  //  29  0111 0.
		 50*3,  56*3,   0,  //  30  0011 0
		    0,     0,  28,  //  31  0111 1.
		    0,     0,  52,  //  32  0110 1.
		    0,     0,  62,  //  33  0100 0.
		 61*3,  59*3,   0,  //  34  0010 1
		 52*3,  60*3,   0,  //  35  0000 0
		    0,     0,   1,  //  36  0101 1.
		 55*3,  54*3,   0,  //  37  0011 1
		    0,     0,  61,  //  38  0101 0.
		    0,     0,  56,  //  39  0110 0.
		 57*3,  58*3,   0,  //  40  0000 1
		    0,     0,   2,  //  41  0100 1.
		    0,     0,  40,  //  42  1000 0.
		 51*3,  62*3,   0,  //  43  0010 0
		    0,     0,  48,  //  44  1001 0.
		 64*3,  63*3,   0,  //  45  0001 0
		 49*3,  53*3,   0,  //  46  0001 1
		    0,     0,  20,  //  47  1000 1.
		    0,     0,  12,  //  48  1001 1.
		 80*3,  83*3,   0,  //  49  0001 10
		    0,     0,  63,  //  50  0011 00.
		 77*3,  75*3,   0,  //  51  0010 00
		 65*3,  73*3,   0,  //  52  0000 00
		 84*3,  66*3,   0,  //  53  0001 11
		    0,     0,  24,  //  54  0011 11.
		    0,     0,  36,  //  55  0011 10.
		    0,     0,   3,  //  56  0011 01.
		 69*3,  87*3,   0,  //  57  0000 10
		 81*3,  79*3,   0,  //  58  0000 11
		 68*3,  71*3,   0,  //  59  0010 11
		 70*3,  78*3,   0,  //  60  0000 01
		 67*3,  76*3,   0,  //  61  0010 10
		 72*3,  74*3,   0,  //  62  0010 01
		 86*3,  85*3,   0,  //  63  0001 01
		 88*3,  82*3,   0,  //  64  0001 00
		   -1,  94*3,   0,  //  65  0000 000
		 95*3,  97*3,   0,  //  66  0001 111
		    0,     0,  33,  //  67  0010 100.
		    0,     0,   9,  //  68  0010 110.
		106*3, 110*3,   0,  //  69  0000 100
		102*3, 116*3,   0,  //  70  0000 010
		    0,     0,   5,  //  71  0010 111.
		    0,     0,  10,  //  72  0010 010.
		 93*3,  89*3,   0,  //  73  0000 001
		    0,     0,   6,  //  74  0010 011.
		    0,     0,  18,  //  75  0010 001.
		    0,     0,  17,  //  76  0010 101.
		    0,     0,  34,  //  77  0010 000.
		113*3, 119*3,   0,  //  78  0000 011
		103*3, 104*3,   0,  //  79  0000 111
		 90*3,  92*3,   0,  //  80  0001 100
		109*3, 107*3,   0,  //  81  0000 110
		117*3, 118*3,   0,  //  82  0001 001
		101*3,  99*3,   0,  //  83  0001 101
		 98*3,  96*3,   0,  //  84  0001 110
		100*3,  91*3,   0,  //  85  0001 011
		114*3, 115*3,   0,  //  86  0001 010
		105*3, 108*3,   0,  //  87  0000 101
		112*3, 111*3,   0,  //  88  0001 000
		121*3, 125*3,   0,  //  89  0000 0011
		    0,     0,  41,  //  90  0001 1000.
		    0,     0,  14,  //  91  0001 0111.
		    0,     0,  21,  //  92  0001 1001.
		124*3, 122*3,   0,  //  93  0000 0010
		120*3, 123*3,   0,  //  94  0000 0001
		    0,     0,  11,  //  95  0001 1110.
		    0,     0,  19,  //  96  0001 1101.
		    0,     0,   7,  //  97  0001 1111.
		    0,     0,  35,  //  98  0001 1100.
		    0,     0,  13,  //  99  0001 1011.
		    0,     0,  50,  // 100  0001 0110.
		    0,     0,  49,  // 101  0001 1010.
		    0,     0,  58,  // 102  0000 0100.
		    0,     0,  37,  // 103  0000 1110.
		    0,     0,  25,  // 104  0000 1111.
		    0,     0,  45,  // 105  0000 1010.
		    0,     0,  57,  // 106  0000 1000.
		    0,     0,  26,  // 107  0000 1101.
		    0,     0,  29,  // 108  0000 1011.
		    0,     0,  38,  // 109  0000 1100.
		    0,     0,  53,  // 110  0000 1001.
		    0,     0,  23,  // 111  0001 0001.
		    0,     0,  43,  // 112  0001 0000.
		    0,     0,  46,  // 113  0000 0110.
		    0,     0,  42,  // 114  0001 0100.
		    0,     0,  22,  // 115  0001 0101.
		    0,     0,  54,  // 116  0000 0101.
		    0,     0,  51,  // 117  0001 0010.
		    0,     0,  15,  // 118  0001 0011.
		    0,     0,  30,  // 119  0000 0111.
		    0,     0,  39,  // 120  0000 0001 0.
		    0,     0,  47,  // 121  0000 0011 0.
		    0,     0,  55,  // 122  0000 0010 1.
		    0,     0,  27,  // 123  0000 0001 1.
		    0,     0,  59,  // 124  0000 0010 0.
		    0,     0,  31   // 125  0000 0011 1.
	]),
	
	MOTION = new Int16Array([
		  1*3,   2*3,   0,  //   0
		  4*3,   3*3,   0,  //   1  0
		    0,     0,   0,  //   2  1.
		  6*3,   5*3,   0,  //   3  01
		  8*3,   7*3,   0,  //   4  00
		    0,     0,  -1,  //   5  011.
		    0,     0,   1,  //   6  010.
		  9*3,  10*3,   0,  //   7  001
		 12*3,  11*3,   0,  //   8  000
		    0,     0,   2,  //   9  0010.
		    0,     0,  -2,  //  10  0011.
		 14*3,  15*3,   0,  //  11  0001
		 16*3,  13*3,   0,  //  12  0000
		 20*3,  18*3,   0,  //  13  0000 1
		    0,     0,   3,  //  14  0001 0.
		    0,     0,  -3,  //  15  0001 1.
		 17*3,  19*3,   0,  //  16  0000 0
		   -1,  23*3,   0,  //  17  0000 00
		 27*3,  25*3,   0,  //  18  0000 11
		 26*3,  21*3,   0,  //  19  0000 01
		 24*3,  22*3,   0,  //  20  0000 10
		 32*3,  28*3,   0,  //  21  0000 011
		 29*3,  31*3,   0,  //  22  0000 101
		   -1,  33*3,   0,  //  23  0000 001
		 36*3,  35*3,   0,  //  24  0000 100
		    0,     0,  -4,  //  25  0000 111.
		 30*3,  34*3,   0,  //  26  0000 010
		    0,     0,   4,  //  27  0000 110.
		    0,     0,  -7,  //  28  0000 0111.
		    0,     0,   5,  //  29  0000 1010.
		 37*3,  41*3,   0,  //  30  0000 0100
		    0,     0,  -5,  //  31  0000 1011.
		    0,     0,   7,  //  32  0000 0110.
		 38*3,  40*3,   0,  //  33  0000 0011
		 42*3,  39*3,   0,  //  34  0000 0101
		    0,     0,  -6,  //  35  0000 1001.
		    0,     0,   6,  //  36  0000 1000.
		 51*3,  54*3,   0,  //  37  0000 0100 0
		 50*3,  49*3,   0,  //  38  0000 0011 0
		 45*3,  46*3,   0,  //  39  0000 0101 1
		 52*3,  47*3,   0,  //  40  0000 0011 1
		 43*3,  53*3,   0,  //  41  0000 0100 1
		 44*3,  48*3,   0,  //  42  0000 0101 0
		    0,     0,  10,  //  43  0000 0100 10.
		    0,     0,   9,  //  44  0000 0101 00.
		    0,     0,   8,  //  45  0000 0101 10.
		    0,     0,  -8,  //  46  0000 0101 11.
		 57*3,  66*3,   0,  //  47  0000 0011 11
		    0,     0,  -9,  //  48  0000 0101 01.
		 60*3,  64*3,   0,  //  49  0000 0011 01
		 56*3,  61*3,   0,  //  50  0000 0011 00
		 55*3,  62*3,   0,  //  51  0000 0100 00
		 58*3,  63*3,   0,  //  52  0000 0011 10
		    0,     0, -10,  //  53  0000 0100 11.
		 59*3,  65*3,   0,  //  54  0000 0100 01
		    0,     0,  12,  //  55  0000 0100 000.
		    0,     0,  16,  //  56  0000 0011 000.
		    0,     0,  13,  //  57  0000 0011 110.
		    0,     0,  14,  //  58  0000 0011 100.
		    0,     0,  11,  //  59  0000 0100 010.
		    0,     0,  15,  //  60  0000 0011 010.
		    0,     0, -16,  //  61  0000 0011 001.
		    0,     0, -12,  //  62  0000 0100 001.
		    0,     0, -14,  //  63  0000 0011 101.
		    0,     0, -15,  //  64  0000 0011 011.
		    0,     0, -11,  //  65  0000 0100 011.
		    0,     0, -13   //  66  0000 0011 111.
	]),
	
	DCT_DC_SIZE_LUMINANCE = new Int8Array([
		  2*3,   1*3, 0,  //   0
		  6*3,   5*3, 0,  //   1  1
		  3*3,   4*3, 0,  //   2  0
		    0,     0, 1,  //   3  00.
		    0,     0, 2,  //   4  01.
		  9*3,   8*3, 0,  //   5  11
		  7*3,  10*3, 0,  //   6  10
		    0,     0, 0,  //   7  100.
		 12*3,  11*3, 0,  //   8  111
		    0,     0, 4,  //   9  110.
		    0,     0, 3,  //  10  101.
		 13*3,  14*3, 0,  //  11  1111
		    0,     0, 5,  //  12  1110.
		    0,     0, 6,  //  13  1111 0.
		 16*3,  15*3, 0,  //  14  1111 1
		 17*3,    -1, 0,  //  15  1111 11
		    0,     0, 7,  //  16  1111 10.
		    0,     0, 8   //  17  1111 110.
	]),
	
	DCT_DC_SIZE_CHROMINANCE = new Int8Array([
		  2*3,   1*3, 0,  //   0
		  4*3,   3*3, 0,  //   1  1
		  6*3,   5*3, 0,  //   2  0
		  8*3,   7*3, 0,  //   3  11
		    0,     0, 2,  //   4  10.
		    0,     0, 1,  //   5  01.
		    0,     0, 0,  //   6  00.
		 10*3,   9*3, 0,  //   7  111
		    0,     0, 3,  //   8  110.
		 12*3,  11*3, 0,  //   9  1111
		    0,     0, 4,  //  10  1110.
		 14*3,  13*3, 0,  //  11  1111 1
		    0,     0, 5,  //  12  1111 0.
		 16*3,  15*3, 0,  //  13  1111 11
		    0,     0, 6,  //  14  1111 10.
		 17*3,    -1, 0,  //  15  1111 111
		    0,     0, 7,  //  16  1111 110.
		    0,     0, 8   //  17  1111 1110.
	]),
	
	//  dct_coeff bitmap:
	//    0xff00  run
	//    0x00ff  level
	
	//  Decoded values are unsigned. Sign bit follows in the stream.
	
	//  Interpretation of the value 0x0001
	//    for dc_coeff_first:  run=0, level=1
	//    for dc_coeff_next:   If the nextItem bit is 1: run=0, level=1
	//                         If the nextItem bit is 0: end_of_block
	
	//  escape decodes as 0xffff.
	
	DCT_COEFF = new Int32Array([
		  1*3,   2*3,      0,  //   0
		  4*3,   3*3,      0,  //   1  0
		    0,     0, 0x0001,  //   2  1.
		  7*3,   8*3,      0,  //   3  01
		  6*3,   5*3,      0,  //   4  00
		 13*3,   9*3,      0,  //   5  001
		 11*3,  10*3,      0,  //   6  000
		 14*3,  12*3,      0,  //   7  010
		    0,     0, 0x0101,  //   8  011.
		 20*3,  22*3,      0,  //   9  0011
		 18*3,  21*3,      0,  //  10  0001
		 16*3,  19*3,      0,  //  11  0000
		    0,     0, 0x0201,  //  12  0101.
		 17*3,  15*3,      0,  //  13  0010
		    0,     0, 0x0002,  //  14  0100.
		    0,     0, 0x0003,  //  15  0010 1.
		 27*3,  25*3,      0,  //  16  0000 0
		 29*3,  31*3,      0,  //  17  0010 0
		 24*3,  26*3,      0,  //  18  0001 0
		 32*3,  30*3,      0,  //  19  0000 1
		    0,     0, 0x0401,  //  20  0011 0.
		 23*3,  28*3,      0,  //  21  0001 1
		    0,     0, 0x0301,  //  22  0011 1.
		    0,     0, 0x0102,  //  23  0001 10.
		    0,     0, 0x0701,  //  24  0001 00.
		    0,     0, 0xffff,  //  25  0000 01. -- escape
		    0,     0, 0x0601,  //  26  0001 01.
		 37*3,  36*3,      0,  //  27  0000 00
		    0,     0, 0x0501,  //  28  0001 11.
		 35*3,  34*3,      0,  //  29  0010 00
		 39*3,  38*3,      0,  //  30  0000 11
		 33*3,  42*3,      0,  //  31  0010 01
		 40*3,  41*3,      0,  //  32  0000 10
		 52*3,  50*3,      0,  //  33  0010 010
		 54*3,  53*3,      0,  //  34  0010 001
		 48*3,  49*3,      0,  //  35  0010 000
		 43*3,  45*3,      0,  //  36  0000 001
		 46*3,  44*3,      0,  //  37  0000 000
		    0,     0, 0x0801,  //  38  0000 111.
		    0,     0, 0x0004,  //  39  0000 110.
		    0,     0, 0x0202,  //  40  0000 100.
		    0,     0, 0x0901,  //  41  0000 101.
		 51*3,  47*3,      0,  //  42  0010 011
		 55*3,  57*3,      0,  //  43  0000 0010
		 60*3,  56*3,      0,  //  44  0000 0001
		 59*3,  58*3,      0,  //  45  0000 0011
		 61*3,  62*3,      0,  //  46  0000 0000
		    0,     0, 0x0a01,  //  47  0010 0111.
		    0,     0, 0x0d01,  //  48  0010 0000.
		    0,     0, 0x0006,  //  49  0010 0001.
		    0,     0, 0x0103,  //  50  0010 0101.
		    0,     0, 0x0005,  //  51  0010 0110.
		    0,     0, 0x0302,  //  52  0010 0100.
		    0,     0, 0x0b01,  //  53  0010 0011.
		    0,     0, 0x0c01,  //  54  0010 0010.
		 76*3,  75*3,      0,  //  55  0000 0010 0
		 67*3,  70*3,      0,  //  56  0000 0001 1
		 73*3,  71*3,      0,  //  57  0000 0010 1
		 78*3,  74*3,      0,  //  58  0000 0011 1
		 72*3,  77*3,      0,  //  59  0000 0011 0
		 69*3,  64*3,      0,  //  60  0000 0001 0
		 68*3,  63*3,      0,  //  61  0000 0000 0
		 66*3,  65*3,      0,  //  62  0000 0000 1
		 81*3,  87*3,      0,  //  63  0000 0000 01
		 91*3,  80*3,      0,  //  64  0000 0001 01
		 82*3,  79*3,      0,  //  65  0000 0000 11
		 83*3,  86*3,      0,  //  66  0000 0000 10
		 93*3,  92*3,      0,  //  67  0000 0001 10
		 84*3,  85*3,      0,  //  68  0000 0000 00
		 90*3,  94*3,      0,  //  69  0000 0001 00
		 88*3,  89*3,      0,  //  70  0000 0001 11
		    0,     0, 0x0203,  //  71  0000 0010 11.
		    0,     0, 0x0104,  //  72  0000 0011 00.
		    0,     0, 0x0007,  //  73  0000 0010 10.
		    0,     0, 0x0402,  //  74  0000 0011 11.
		    0,     0, 0x0502,  //  75  0000 0010 01.
		    0,     0, 0x1001,  //  76  0000 0010 00.
		    0,     0, 0x0f01,  //  77  0000 0011 01.
		    0,     0, 0x0e01,  //  78  0000 0011 10.
		105*3, 107*3,      0,  //  79  0000 0000 111
		111*3, 114*3,      0,  //  80  0000 0001 011
		104*3,  97*3,      0,  //  81  0000 0000 010
		125*3, 119*3,      0,  //  82  0000 0000 110
		 96*3,  98*3,      0,  //  83  0000 0000 100
		   -1, 123*3,      0,  //  84  0000 0000 000
		 95*3, 101*3,      0,  //  85  0000 0000 001
		106*3, 121*3,      0,  //  86  0000 0000 101
		 99*3, 102*3,      0,  //  87  0000 0000 011
		113*3, 103*3,      0,  //  88  0000 0001 110
		112*3, 116*3,      0,  //  89  0000 0001 111
		110*3, 100*3,      0,  //  90  0000 0001 000
		124*3, 115*3,      0,  //  91  0000 0001 010
		117*3, 122*3,      0,  //  92  0000 0001 101
		109*3, 118*3,      0,  //  93  0000 0001 100
		120*3, 108*3,      0,  //  94  0000 0001 001
		127*3, 136*3,      0,  //  95  0000 0000 0010
		139*3, 140*3,      0,  //  96  0000 0000 1000
		130*3, 126*3,      0,  //  97  0000 0000 0101
		145*3, 146*3,      0,  //  98  0000 0000 1001
		128*3, 129*3,      0,  //  99  0000 0000 0110
		    0,     0, 0x0802,  // 100  0000 0001 0001.
		132*3, 134*3,      0,  // 101  0000 0000 0011
		155*3, 154*3,      0,  // 102  0000 0000 0111
		    0,     0, 0x0008,  // 103  0000 0001 1101.
		137*3, 133*3,      0,  // 104  0000 0000 0100
		143*3, 144*3,      0,  // 105  0000 0000 1110
		151*3, 138*3,      0,  // 106  0000 0000 1010
		142*3, 141*3,      0,  // 107  0000 0000 1111
		    0,     0, 0x000a,  // 108  0000 0001 0011.
		    0,     0, 0x0009,  // 109  0000 0001 1000.
		    0,     0, 0x000b,  // 110  0000 0001 0000.
		    0,     0, 0x1501,  // 111  0000 0001 0110.
		    0,     0, 0x0602,  // 112  0000 0001 1110.
		    0,     0, 0x0303,  // 113  0000 0001 1100.
		    0,     0, 0x1401,  // 114  0000 0001 0111.
		    0,     0, 0x0702,  // 115  0000 0001 0101.
		    0,     0, 0x1101,  // 116  0000 0001 1111.
		    0,     0, 0x1201,  // 117  0000 0001 1010.
		    0,     0, 0x1301,  // 118  0000 0001 1001.
		148*3, 152*3,      0,  // 119  0000 0000 1101
		    0,     0, 0x0403,  // 120  0000 0001 0010.
		153*3, 150*3,      0,  // 121  0000 0000 1011
		    0,     0, 0x0105,  // 122  0000 0001 1011.
		131*3, 135*3,      0,  // 123  0000 0000 0001
		    0,     0, 0x0204,  // 124  0000 0001 0100.
		149*3, 147*3,      0,  // 125  0000 0000 1100
		172*3, 173*3,      0,  // 126  0000 0000 0101 1
		162*3, 158*3,      0,  // 127  0000 0000 0010 0
		170*3, 161*3,      0,  // 128  0000 0000 0110 0
		168*3, 166*3,      0,  // 129  0000 0000 0110 1
		157*3, 179*3,      0,  // 130  0000 0000 0101 0
		169*3, 167*3,      0,  // 131  0000 0000 0001 0
		174*3, 171*3,      0,  // 132  0000 0000 0011 0
		178*3, 177*3,      0,  // 133  0000 0000 0100 1
		156*3, 159*3,      0,  // 134  0000 0000 0011 1
		164*3, 165*3,      0,  // 135  0000 0000 0001 1
		183*3, 182*3,      0,  // 136  0000 0000 0010 1
		175*3, 176*3,      0,  // 137  0000 0000 0100 0
		    0,     0, 0x0107,  // 138  0000 0000 1010 1.
		    0,     0, 0x0a02,  // 139  0000 0000 1000 0.
		    0,     0, 0x0902,  // 140  0000 0000 1000 1.
		    0,     0, 0x1601,  // 141  0000 0000 1111 1.
		    0,     0, 0x1701,  // 142  0000 0000 1111 0.
		    0,     0, 0x1901,  // 143  0000 0000 1110 0.
		    0,     0, 0x1801,  // 144  0000 0000 1110 1.
		    0,     0, 0x0503,  // 145  0000 0000 1001 0.
		    0,     0, 0x0304,  // 146  0000 0000 1001 1.
		    0,     0, 0x000d,  // 147  0000 0000 1100 1.
		    0,     0, 0x000c,  // 148  0000 0000 1101 0.
		    0,     0, 0x000e,  // 149  0000 0000 1100 0.
		    0,     0, 0x000f,  // 150  0000 0000 1011 1.
		    0,     0, 0x0205,  // 151  0000 0000 1010 0.
		    0,     0, 0x1a01,  // 152  0000 0000 1101 1.
		    0,     0, 0x0106,  // 153  0000 0000 1011 0.
		180*3, 181*3,      0,  // 154  0000 0000 0111 1
		160*3, 163*3,      0,  // 155  0000 0000 0111 0
		196*3, 199*3,      0,  // 156  0000 0000 0011 10
		    0,     0, 0x001b,  // 157  0000 0000 0101 00.
		203*3, 185*3,      0,  // 158  0000 0000 0010 01
		202*3, 201*3,      0,  // 159  0000 0000 0011 11
		    0,     0, 0x0013,  // 160  0000 0000 0111 00.
		    0,     0, 0x0016,  // 161  0000 0000 0110 01.
		197*3, 207*3,      0,  // 162  0000 0000 0010 00
		    0,     0, 0x0012,  // 163  0000 0000 0111 01.
		191*3, 192*3,      0,  // 164  0000 0000 0001 10
		188*3, 190*3,      0,  // 165  0000 0000 0001 11
		    0,     0, 0x0014,  // 166  0000 0000 0110 11.
		184*3, 194*3,      0,  // 167  0000 0000 0001 01
		    0,     0, 0x0015,  // 168  0000 0000 0110 10.
		186*3, 193*3,      0,  // 169  0000 0000 0001 00
		    0,     0, 0x0017,  // 170  0000 0000 0110 00.
		204*3, 198*3,      0,  // 171  0000 0000 0011 01
		    0,     0, 0x0019,  // 172  0000 0000 0101 10.
		    0,     0, 0x0018,  // 173  0000 0000 0101 11.
		200*3, 205*3,      0,  // 174  0000 0000 0011 00
		    0,     0, 0x001f,  // 175  0000 0000 0100 00.
		    0,     0, 0x001e,  // 176  0000 0000 0100 01.
		    0,     0, 0x001c,  // 177  0000 0000 0100 11.
		    0,     0, 0x001d,  // 178  0000 0000 0100 10.
		    0,     0, 0x001a,  // 179  0000 0000 0101 01.
		    0,     0, 0x0011,  // 180  0000 0000 0111 10.
		    0,     0, 0x0010,  // 181  0000 0000 0111 11.
		189*3, 206*3,      0,  // 182  0000 0000 0010 11
		187*3, 195*3,      0,  // 183  0000 0000 0010 10
		218*3, 211*3,      0,  // 184  0000 0000 0001 010
		    0,     0, 0x0025,  // 185  0000 0000 0010 011.
		215*3, 216*3,      0,  // 186  0000 0000 0001 000
		    0,     0, 0x0024,  // 187  0000 0000 0010 100.
		210*3, 212*3,      0,  // 188  0000 0000 0001 110
		    0,     0, 0x0022,  // 189  0000 0000 0010 110.
		213*3, 209*3,      0,  // 190  0000 0000 0001 111
		221*3, 222*3,      0,  // 191  0000 0000 0001 100
		219*3, 208*3,      0,  // 192  0000 0000 0001 101
		217*3, 214*3,      0,  // 193  0000 0000 0001 001
		223*3, 220*3,      0,  // 194  0000 0000 0001 011
		    0,     0, 0x0023,  // 195  0000 0000 0010 101.
		    0,     0, 0x010b,  // 196  0000 0000 0011 100.
		    0,     0, 0x0028,  // 197  0000 0000 0010 000.
		    0,     0, 0x010c,  // 198  0000 0000 0011 011.
		    0,     0, 0x010a,  // 199  0000 0000 0011 101.
		    0,     0, 0x0020,  // 200  0000 0000 0011 000.
		    0,     0, 0x0108,  // 201  0000 0000 0011 111.
		    0,     0, 0x0109,  // 202  0000 0000 0011 110.
		    0,     0, 0x0026,  // 203  0000 0000 0010 010.
		    0,     0, 0x010d,  // 204  0000 0000 0011 010.
		    0,     0, 0x010e,  // 205  0000 0000 0011 001.
		    0,     0, 0x0021,  // 206  0000 0000 0010 111.
		    0,     0, 0x0027,  // 207  0000 0000 0010 001.
		    0,     0, 0x1f01,  // 208  0000 0000 0001 1011.
		    0,     0, 0x1b01,  // 209  0000 0000 0001 1111.
		    0,     0, 0x1e01,  // 210  0000 0000 0001 1100.
		    0,     0, 0x1002,  // 211  0000 0000 0001 0101.
		    0,     0, 0x1d01,  // 212  0000 0000 0001 1101.
		    0,     0, 0x1c01,  // 213  0000 0000 0001 1110.
		    0,     0, 0x010f,  // 214  0000 0000 0001 0011.
		    0,     0, 0x0112,  // 215  0000 0000 0001 0000.
		    0,     0, 0x0111,  // 216  0000 0000 0001 0001.
		    0,     0, 0x0110,  // 217  0000 0000 0001 0010.
		    0,     0, 0x0603,  // 218  0000 0000 0001 0100.
		    0,     0, 0x0b02,  // 219  0000 0000 0001 1010.
		    0,     0, 0x0e02,  // 220  0000 0000 0001 0111.
		    0,     0, 0x0d02,  // 221  0000 0000 0001 1000.
		    0,     0, 0x0c02,  // 222  0000 0000 0001 1001.
		    0,     0, 0x0f02   // 223  0000 0000 0001 0110.
	]),
	
	SEEK_PRESISION_MS = 150,
	
	PICTURE_TYPE_I = 1,
	PICTURE_TYPE_P = 2,
	PICTURE_TYPE_B = 3,
	PICTURE_TYPE_D = 4,
	
	START_MAP = 0x01C4,
	SIZE_SEQUENCE_HEADER = 140,
	START_SEQUENCE = 0xC3,
	SIZE_GOP_HEADER = 8,
	START_GOP = 0xB8,
	START_SLICE_FIRST = 0x01,
	START_SLICE_LAST = 0xAF,
	START_PICTURE = 0x00,
	START_EXTENSION = 0xB5,
	START_USER_DATA = 0xB2,
	
	MACROBLOCK_TYPE_TABLES = [
		null,
		MACROBLOCK_TYPE_I,
		MACROBLOCK_TYPE_P,
		MACROBLOCK_TYPE_B
	],
SHADER_FRAGMENT_IDCT_COLUMNS,
SHADER_FRAGMENT_IDCT_ROWS_INTRA,
SHADER_FRAGMENT_IDCT_ROWS_INTER;

function composeShaders(integer){

if( integer ){
	SHADER_FRAGMENT_IDCT_COLUMNS = COLUMNS_0 + '\n' + CONV_INT + '\n' + COLUMNS_1 + '\n' + COLUMNS_INT_1 + '\n' + COLUMNS_2 + '\n' + COL_INT_2 + '\n' + COL_3 + '\n' + COL_INT_21 + '\n' + COL_31 + '\n' +COL_INT_22 + '\n' + COL_32 + '\n'+ COL_INT_3 + '\n' + COL_4 + '\n' + COL_INT_31 + '\n' + COL_41 + '\n' + COL_INT_5 + '\n' + COL_5;
	SHADER_FRAGMENT_IDCT_ROWS_INTRA = SHADER_FRAGMENT_IDCT_ROWS_COM+ '\n' + CONV_INT + '\n'+ROWS_COM_1+'\n'+DCT_COEF_DECL_INT+'\n'+ROWS_COMM_2+'\n'+ROWS_INT1+'\n'+ROWSCOM22+'\n'+ROWS_INT2+'\n'+ROWS_COM3+'\n'+ROWSCOM_INT4+'\n'+SHADER_FRAGMENT_IDCT_ROWS_INTRA_1_INT ;
	SHADER_FRAGMENT_IDCT_ROWS_INTER = SHADER_FRAGMENT_IDCT_ROWS_COM+ '\n' + CONV_INT + '\n'+ROWS_COM_1+'\n'+DCT_COEF_DECL_INT+'\n'+ROWS_COMM_2+'\n'+ROWS_INT1+'\n'+ROWSCOM22+'\n'+ROWS_INT2+'\n'+ROWS_COM3+'\n'+ROWSCOM_INT4+'\n'+SHADER_FRAGMENT_IDCT_ROWS_INTER_1+'\n'+INTER_INT1;
} else {
	SHADER_FRAGMENT_IDCT_COLUMNS = COLUMNS_0 + '\n' + CONV_FLOAT + '\n' + COLUMNS_1 + '\n' + COLUMNS_FLOAT_1 + '\n' + COLUMNS_2 + '\n' + COL_FLOAT_2 + '\n' + COL_3 + '\n' + COL_FLOAT_21 + '\n' + COL_31 + '\n' +COL_FLOAT_22 + '\n' + COL_32 + '\n'+ COL_FLOAT_3 + '\n' + COL_4 + '\n' + COL_FLOAT_31 + '\n' + COL_41 + '\n' + COL_FLOAT_5 + '\n' + COL_5;
	SHADER_FRAGMENT_IDCT_ROWS_INTRA = SHADER_FRAGMENT_IDCT_ROWS_COM+ '\n' + CONV_FLOAT + '\n'+ROWS_COM_1+'\n'+DCT_COEF_DECL_FLOAT+'\n'+ROWS_COMM_2+'\n'+ROWS_FLOAT1+'\n'+ROWSCOM22+'\n'+ROWS_FLOAT2+'\n'+ROWS_COM3+'\n'+SHADER_FRAGMENT_IDCT_ROWS_INTRA_1_FLOAT;
	SHADER_FRAGMENT_IDCT_ROWS_INTER = SHADER_FRAGMENT_IDCT_ROWS_COM+ '\n' + CONV_FLOAT + '\n'+ROWS_COM_1+'\n'+DCT_COEF_DECL_FLOAT+'\n'+ROWS_COMM_2+'\n'+ROWS_FLOAT1+'\n'+ROWSCOM22+'\n'+ROWS_FLOAT2+'\n'+ROWS_COM3+'\n'+SHADER_FRAGMENT_IDCT_ROWS_INTER_1+'\n'+INTER_FLOAT1;
}
}
})(window);

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
						// 
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
	// 
	this._imagedata.push(imagedata);
	// 

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
		// 
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
		// 
	// });
	// this.audioEl.addEventListener('waiting',function _onplay(){
		// 
	// });
	// this.audioEl.addEventListener('play',function _onplay(){
		// 
	// });
	// this.audioEl.addEventListener('pause',function _onpause(){
		// 
	// });
	// this.audioEl.addEventListener('progress',function _onpause(){
		// 
	// });
	// this.audioEl.addEventListener('loadedmetadata',function _onpause(){
		// 
	// });
	// this.audioEl.addEventListener('playing',function _onplaying(){
		// 
	// });
	// this.audioEl.addEventListener('seeking',function _onseeking(){
		// 
	// });
	// this.audioEl.addEventListener('seeked',function _onseeked(){
		// 
	// });
	// this.audioEl.addEventListener('canplay',function _oncanplay(){
		// 
	// });
	// this.audioEl.addEventListener('error',function _oncanplay(){
		// 
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
			// 
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
				// 
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
	
	// 
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
	// 
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
	// 
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
	// 
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
		// 
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
				// 
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
		// 
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
						// 
						if(stats['id'] != that._requestId){
							//request was cancelled
							return false;
						}
						that.setSharedVar('this','ns',NETWORK_IDLE);
						
						that._loading = false;
						if(repeat){
							// 
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
	// 
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
	// 
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
			// 
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
	/*
	if( !this.decodedFrame.ybr[0].inuse ){
		throw new Error( "not inuse" );
	}
	this.decodedFrame.ybr[0].inuse = false;
	return;*/
	//	
	var gl = this.gl;
	// WebGL doesn't like Uint8ClampedArrays, so we have to create a Uint8Array view for 
	// each plane
	//
	var uint8Y = _frame.ybr[0],
		uint8Cb = _frame.ybr[1],
		uint8Cr = _frame.ybr[2];
	//var fromTexture = 'length' in uint8Y == false;
	//
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
		//
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











			// ----------------------------------------------------------------------------
// VLC Tables and Constants
var MediaError = {};
MediaError['MEDIA_ERR_ABORTED'] = MediaError._MEDIA_ERR_ABORTED = 1;
MediaError['MEDIA_ERR_NETWORK'] = MediaError._MEDIA_ERR_NETWORK = 2;
MediaError['MEDIA_ERR_DECODE'] = MediaError._MEDIA_ERR_DECODE = 3;
MediaError['MEDIA_ERR_SRC_NOT_SUPPORTED'] = MediaError._MEDIA_ERR_SRC_NOT_SUPPORTED = 4;
MediaError['code'] = 0;
MediaError['message'] = '';

var QuantMatrixState = {};
QuantMatrixState._DEFAULT = 0;
QuantMatrixState._INTRA = 1;
QuantMatrixState._INTER = 2;

var

	//exceptions
	INDEX_SIZE_ERR = 1,

	MAX_WAITINGS = 5,
	AV_SYNC_INT = 1000,
	
	//AVSYNC at 25fps
	AV_SYNC_LIMIT = 300,
	
	//network state
	NETWORK_EMPTY = 0,
	NETWORK_IDLE = 1,
	NETWORK_LOADING = 2,
	NETWORK_NO_SOURCE = 3,
	
	//ready state
	HAVE_NOTHING = 0,
	HAVE_METADATA = 1,
	HAVE_CURRENT_DATA = 2,
	HAVE_FUTURE_DATA = 3,
	HAVE_ENOUGH_DATA = 4,
	
	MAX_DECODED_FRAMES = 10,
	DEFAULT_MARGIN_IN_SEC = 0.45,
	DEFAULT_LATE_COUNTER = 5,
	DEFAULT_AUDIO_SHIFT_SEC = 0,
	DEFAULT_FORWARD_MINBUFFER_SEC = 1,
	DEFAULT_FORWARD_BUFFER_SEC = 30,
	DEFAULT_HLS_DELETE = 6,
	DEFAULT_BACKWARDCHUNK_NUMBER = 3,
	DEFAULT_SECONDS_PLAYED_LIMIT = 30,
	DEFAULT_FORWARDCHUNK_NUMBER = 1,
	DEFAULT_CHUNK_SIZE = 300000,
	FREE_MEMORY_LIMITBYTES = 50000000,
	FREE_MEMORY_LIMITSECONDS = 300,
	SOCKET_MAGIC_BYTES = 'jsv',
	DECODE_SKIP_OUTPUT = 1,
	


// Shaders for accelerated WebGL YCbCrToRGBA conversion
	
	SHADER_FRAGMENT_YCBCRTORGBA = [
		'precision mediump float;',
		// 'uniform float contrast;',
		'uniform float _ae;',

		'uniform sampler2D _T;',
		'uniform sampler2D _L;',
		'uniform sampler2D _N;',
		'varying vec2 _S;',
		
		'mat4 _ak = mat4(',
			'1.16438,  0.00000,  1.59603, -0.87079,',
			'1.16438, -0.39176, -0.81297,  0.52959,',
			'1.16438,  2.01723,  0.00000, -1.08139,',
			'0, 0, 0, 1',
		');',
	
		'void main() {',
			//'gl_FragColor = vec4( _S.x, 0, 0, 0 );return;',	
			'float _aA, _au, _av;',
			'float _af = floor( mod( _ae * _S.x, 8. ) );',
			'if( _af == 0.0 )',
			'{',
				'_aA = texture2D(_T, _S).r;',
				'_au = texture2D(_N, _S).r;',
				'_av = texture2D(_L, _S).r;',
			'}',
			'else if( _af == 1. )',
			'{',
				'_aA = texture2D(_T, _S).g;',
				'_au = texture2D(_N, _S).r;',
				'_av = texture2D(_L, _S).r;',
			'}',
			'else if( _af == 2. )',
			'{',
				'_aA = texture2D(_T, _S).b;',
				'_au = texture2D(_N, _S).g;',
				'_av = texture2D(_L, _S).g;',
			'}',
			'else if( _af == 3. )',
			'{',
				'_aA = texture2D(_T, _S).a;',
				'_au = texture2D(_N, _S).g;',
				'_av = texture2D(_L, _S).g;',
			'}',	
			'else if( _af == 4. )',
			'{',
				'_aA = texture2D(_T, _S).r;',
				'_au = texture2D(_N, _S).b;',
				'_av = texture2D(_L, _S).b;',
			'}',	
			'else if( _af == 5. )',
			'{',
				'_aA = texture2D(_T, _S).g;',
				'_au = texture2D(_N, _S).b;',
				'_av = texture2D(_L, _S).b;',
			'}',	
			'else if( _af == 6. )',
			'{',
				'_aA = texture2D(_T, _S).b;',
				'_au = texture2D(_N, _S).a;',
				'_av = texture2D(_L, _S).a;',
			'}',	
			'else',
			'{',
				'_aA = texture2D(_T, _S).a;',
				'_au = texture2D(_N, _S).a;',
				'_av = texture2D(_L, _S).a;',
			'}',	
			
			'gl_FragColor = vec4(_aA, _av, _au, 1.) * _ak;',
			//'gl_FragColor = vec4(_aA, _aA, _aA, 1.);',
			//'gl_FragColor = vec4(_aA, _av, _au, 1.);',
			// 'if (contrast > 0.0) {',
				// 'gl_FragColor.rgb = (gl_FragColor.rgb - 0.5) / (1.0 - contrast) + 0.5;',
			// '} else {',
				// 'gl_FragColor.rgb = (gl_FragColor.rgb - 0.5) * (1.0 + contrast) + 0.5;',
			// '}',	
		'}'
	].join('\n'),
	
	SHADER_VERTEX_IDENTITY = [
		'attribute vec2 vertex;',
		'varying vec2 _S;',
		
		'void main() {',
			'_S = vertex;',
			'gl_Position = vec4((vertex * 2.0 - 1.0) * vec2(1, -1), 0.0, 1.0);',
		'}'
	].join('\n');
	

// ----------------------------------------------------------------------------
jsv['NETWORK_EMPTY'] = NETWORK_EMPTY;
jsv['NETWORK_IDLE'] = NETWORK_IDLE;
jsv['NETWORK_LOADING'] = NETWORK_LOADING;
jsv['NETWORK_NO_SOURCE'] = NETWORK_NO_SOURCE;

jsv['HAVE_NOTHING'] = HAVE_NOTHING;
jsv['HAVE_METADATA'] = HAVE_METADATA;
jsv['HAVE_CURRENT_DATA'] = HAVE_CURRENT_DATA;
jsv['HAVE_FUTURE_DATA'] = HAVE_FUTURE_DATA;
jsv['HAVE_ENOUGH_DATA'] = HAVE_ENOUGH_DATA;

window['jsv_helper'] = function(){
}
window['jsv_helper']['iPhoneVersion'] = function(){
	if(!/(iPhone)/g.test( navigator.userAgent )){
		return NaN;
	}
	var h = window.screen.height;
	switch(h){
		case 480:
		return '4';
		case 568:
		return '5';
		case 667:
		return '6';
		case 736:
		return '6';
		default:
		if(h > 736){
			return '6';
		}else{
			return '4';
		}
	}
}
window['jsv_helper']['iOsVersion'] = function(){
	if(!/(iPhone)/g.test( navigator.userAgent )){
		return NaN;
	}
	 var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
	 return parseInt(v[1], 10);
}
if(window['jsv_is_ww']){
	var video_jsv = new window['video_jsv']();
	window.addEventListener('message', function(event){
		var data = event.data;
		if(data['args'] && !Array.isArray(data['args']) && data['t'] != 'event'){
			//why is this ? for setters ?
			var args = Object.keys(data['args']).map(function(k) { return data['args'][k] });
		}else{
			args = data['args'];
		}
		switch(data['t']){
			case 'event':
			// 
			video_jsv._emit(data['n'], args, true);
			break;
			case 'set':
			//
			video_jsv.__lookupSetter__(data['n']).apply( video_jsv, args );
			break;
			case 'func':
			// 
			video_jsv[data['n']].apply( video_jsv, args );
			break;
			case 'eq':
			//
			video_jsv[data['n']] = args[0];
			break;
			case 'jsv_gl':
			jsv_gl[data['n']] = args[0];
			break;
		}
		
	});
}

			
		})(window);
		
		})();
