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
	// console.log(this.getByteRanges());
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
		// console.log("bytesInBackwardBuffer "+bytesInBackwardBuffer+" numberOfBuffersToRemove "+numberOfBuffersToRemove);
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
	// console.log('before start '+s+' end '+end);
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
	// console.log('dumping ranges');
	// var range = this.startRange;
	// var i = 0;
	// while(range){
		// console.log('range '+i+' startDuration '+range.startDuration+' endDuration '+range.endDuration);
		// range = range.nextItem;
		// i++;
	// }
// }

// BitReader.prototype.dumpForwardBuffers = function() {
	// var buffer = this.currentBuffer;
	// var count = 0;
	// while(buffer){
		// count++;
		// console.log('Buffer '+buffer.start+' '+buffer.end+' '+buffer.data.byteLength+' '+buffer.url);
		// buffer = buffer.nextItem;
	// }
	// return count;
// }	
// BitReader.prototype.dumpBuffers = function() {
	// var buffer = this.startBuffer;
	// console.log('Dumping buffers');
	// if(this.currentBuffer){
		// console.log('Current buffer '+this.currentBuffer.start+' '+this.currentBuffer.end+' '+this.currentBuffer.data.byteLength);
	// }
	// while(buffer){
		// console.log('Buffer '+buffer.start+' '+buffer.end+' '+buffer.data.byteLength+' '+buffer.url);
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
	
	// console.log('adding buffer '+response.start+' '+response.end+' '+response.data.byteLength);
	
	if(!this.startBuffer){
		// console.log('startBuffer');
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
			// console.log('above buffer');
			this.endBuffer.nextItem = response;
			this.endBuffer = this.endBuffer.nextItem;
			
			if(this.endRange.end+1 == response.start){
				// console.log('above eq');
				this.endRange.end = response.end;
				this.endRange.endDuration = response.endDuration;
			}else{
				// console.log('above new '+this.endRange.end+' '+response.start);
				var newRange = {start:response.start, end: response.end, nextItem:null, startDuration:response.startDuration, endDuration: response.endDuration};
				this.endRange.nextItem = newRange;
				this.endRange = this.endRange.nextItem;
			}
			
		}else if(this.startBuffer.start >= response.end+1){
			// console.log('below buffer');
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
			// console.log('middle buffer');
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
			// console.log('changing buffer '+this.currentBuffer.start+' count '+count+' this.indexInBuffer '+this.indexInBuffer+' bits '+(this.currentBuffer.data.byteLength << 3));
			this.previousBuffer = this.currentBuffer;
			this.currentBuffer = this.currentBuffer.nextItem;
			this.bufferLength = this.currentBuffer.data.byteLength;
			
			this._onBufferAdvance();
			
		}else{
			// console.log('stall getBits');
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
			// console.log('getBits byteOffset room count '+byteOffset+' '+room+' '+count+' '+joinBuffers+' = '+((bytes[byteOffset] >> (room - count)) & (0xff >> (8-count)))+' at '+this.index+' '+this.indexInBuffer);
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
		// console.log('getBits  '+count+' = '+value+' at '+this.index+' '+this.indexInBuffer);
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
			// console.log('changing buffer '+this.currentBuffer.start);						
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
			// console.log('advance '+count+' : '+this.index);
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
			// console.log('rewind '+count+' frame '+_frames+' : '+this.index+' '+(this.indexInBuffer-count));
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
		// console.log('seek to '+countBytesAbsolute);
		for(var i = 0;i < this._hls.length;i++){
			// console.log(this._hls[i].endDuration+' '+countBytesAbsolute);
			if(this._hls[i].end >= countBytesAbsolute){
				if(this._hls[i].loaded){
					var offset = countBytesAbsolute - this._hls[i].start;
					// console.log('offset '+offset+' in '+this._hls[i].start);
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
