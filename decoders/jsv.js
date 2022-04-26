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
		// console.log(that.min + ' : ' + that.max);
	// }, 3000 );
}
jsv.prototype.initGLBuffers = function(){
	console.log( "INIT BUFFERS" );
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
	console.log( 'float range ' + range.rangeMin + ' - ' + range.rangeMax );
	var range = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_INT);
	/*if( !range ){
		range = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_INT);
	}*/
	console.log( 'int range ' + range.rangeMin + ' - ' + range.rangeMax );
	this.integer = range.rangeMax >= 30;
	/*
	const urlParams = new URLSearchParams(window.location.search);
	const myParam = parseInt(urlParams.get('int'));
	this.integer = myParam;
	*/
	console.log( 'compiling with integer ' + this.integer );	
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
			console.log( 'yuva ' + this.yuva );
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
	// console.log('gopNumber '+gopNumber);
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
	// console.log('time '+time);
	gopNumber *= 8;
	var buffer = this._keyMap.buffer;
	var offset = (buffer[gopNumber] << 24)+(buffer[gopNumber+1] << 16)+(buffer[gopNumber+2] << 8)+buffer[gopNumber+3];
	// console.log('offset '+offset);
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
	
	//console.log('decodeGopHeader');
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
	// console.log('this.bufferSize '+this.bufferSize);
	
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
	//console.log( 'decoding mb ' + this.mbn);
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
		console.log( j + ')' + line );
	}
			
}
jsv.prototype.dumpPixels2 = function(width, height){
		console.log( 'dumping pixels width  ' + width + ' height ' + height );
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
			//console.log( "set render buf " + fbo_rendered[0].texture.uid );
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

	//console.log('Intre');
	//console.log( this.macroblockIsIntra );
	gl.activeTexture(gl.TEXTURE4);
	gl.bindTexture(gl.TEXTURE_2D, this.TextureIntre);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, this.mbWidth, this.mbHeight, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.macroblockIsIntra );

	//TODO:remove this ?
	//gl.activeTexture(gl.TEXTURE5);
	//gl.bindTexture(gl.TEXTURE_2D, this.TextureZigZag);
	
	for( var comp = 0; comp < 3; comp++ ) {

		//console.log( 'input DCT coef codedWidth ' + this.codedWidth + ' codedHeight ' + this.codedHeight );
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
		//console.log( 'residue' );
		//console.log( this._dctData[comp] );
		//console.log( 'last_non_zero' );
		//console.log( this.last_non_zero[comp] );
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE_ALPHA, width, height, 0, gl.LUMINANCE_ALPHA, gl.UNSIGNED_BYTE, this._dctData[comp] );
/*
		if( comp == 1 ) {
			for( var h = 0; h <  height; h++ ) { 
				var line = '';
				for( var w = 0; w < width; w++ ) {
					line += ' ' + w + ':' + this.currentCbDCT16[h*width+w];
				}
				console.log( h + ' : ' + line );
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
	
		//console.log( 'movtion vectors' );
		//console.log( this.macroblockMV );
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
		//		console.log( 'mv relpadd' );
		//console.log( this.macroblockMVUint8 );
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
		console.log( 'no IDCT needed' );
		//this.fillArray(this.blockData, (this.blockData[0] + 128) >> 8);
	}
*/
	//console.log( 'blockData' );	
	//console.log(this.blockData);
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
	console.log( 'block ' + block );
	for( var j = 0;j<8;j++){
		var l ='';
		for( var i = 0; i <8; i++){
			l += this.blockData[j*8+i] + ' ';
		}
		console.log( l );
	}
	*/	
	var blockData = this.blockData;
	//console.log( 'copy to dest ' + destIndex + ' ' + scan );
	this.copyBlockToDestination(this.blockData, destArray, destIndex, scan);
	if( this.pictureCodingType == PICTURE_TYPE_P && this.macroblockIntra ) {
		//console.log( "inter intra" );
		this.macroblockRepAdd[this.mbRow*this.mbWidth+this.mbCol] = 255;
	}
	/*if( block == 0 && this.macroblockIntra && this.pictureCodingType == PICTURE_TYPE_P ) {
		console.log( "intra block in P" );
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
		console.log( s );
	}
}
jsv.prototype.clearBlock = function( destArray, destIndex, scan) {
	//console.log( 'clearBlock' );
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
		// console.log('no seek to targetTime '+targetTime+' seekedByte '+seekedByte+' index '+this.buffer.index);
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
		// console.log(this.currentBuffer.data.byteLength+' '+this.currentBuffer.start+' '+this._hls[this._hls.length-1].start);
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
					// console.log('changing buffer '+this.currentBuffer.start);
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
