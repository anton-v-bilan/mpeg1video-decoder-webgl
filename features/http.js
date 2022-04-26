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
	
	// console.log('strategy '+strategy+' cap_xhr_streaming '+cap_xhr_streaming);
	
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
		// console.log("New log request");
		var request = {};
		var expandedOptions = {};
		for(var opt in optionsMap){
			if(optionsMap[opt] in requestOptions){
				// console.log("setting "+opt+" to "+requestOptions[optionsMap[opt]]);
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
			// console.log(e);
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
            // console.log("added "+result.value.byteLength);
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
				// console.log("onprogres "+xhr.response.byteLength);
			};
		}
		xhr.send();
	}
	
})(window);
