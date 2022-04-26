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