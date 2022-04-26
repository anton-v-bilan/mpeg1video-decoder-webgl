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