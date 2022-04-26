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