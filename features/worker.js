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
	//console.log('ww');
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