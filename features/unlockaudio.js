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