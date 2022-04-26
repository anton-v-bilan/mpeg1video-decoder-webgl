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
			// console.log('event from worker '+data['n']);
			video_jsv._emit(data['n'], args, true);
			break;
			case 'set':
			//console.log('set');
			video_jsv.__lookupSetter__(data['n']).apply( video_jsv, args );
			break;
			case 'func':
			// console.log('func '+data['n']);
			video_jsv[data['n']].apply( video_jsv, args );
			break;
			case 'eq':
			//console.log('eq '+data['n']+' '+args[0]);
			video_jsv[data['n']] = args[0];
			break;
			case 'jsv_gl':
			jsv_gl[data['n']] = args[0];
			break;
		}
		
	});
}
