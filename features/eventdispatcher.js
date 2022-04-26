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

	
	window['ez_dis'] = function(ojbect){
		ojbect.events = {};

		ojbect['on'] = ojbect.addEventListener = function(name, handler) {
			//console.log('adding '+name);
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