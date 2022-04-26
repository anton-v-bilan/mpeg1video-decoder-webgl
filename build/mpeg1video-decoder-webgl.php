<?php
	$type = array_key_exists('type', $_GET)?$_GET['type']:'http';
	
	
	$features = [
				
				"../features/worker.js",
				"../features/animationframe.js",
				"../features/eventdispatcher.js",
				"../features/unlockaudio.js",
				"../features/pagevisibility.js",
				"../features/slice.js",
			];
	$parts = [
		"../features/syncmedia.js",
		"../features/bitreader.js",
		"../decoders/shaders/mpeg1video.js",
		"../decoders/jsv.js",
		//"../decoders/jsv.noloops.20220326.js",
		//"../decoders/jsv.old.js",
		//"../decoders/jsv.2022.01.20.js",
		"../player/easybits.player.js",
	];		
	
	switch($type){
		case 'hls':
			$features[] = "../features/tsparser.js";
			$features[] = "../features/http.js";
			$parts[] = "../player/parts/hls.js";
		break;
		case 'ws':
			$features[] = "../audio/audio.jsv.js";
			$parts[] = "../player/parts/ws.js";
		break;
		default:
			$features[] = "../features/http.js";
		break;
	}
	
	$add = array_key_exists('add', $_GET)?$_GET['add']:[];
	$adds = ['debug'];
	foreach($add as $part)
	{
		if(in_array($part, $adds))
		{
			$parts[] = "parts/".$part.".js";
		}
	}
	
	$parts[] = "../player/parts/end.js";

	
	$str = "(function(){
		";
	
	foreach($features as $file)
	{
		$str .= file_get_contents($file);
		$str .= "
		";
	}
	
	$str .= "
		(function(window){ //'use strict';
		";
		foreach($parts as $file)
		{
			$str .= file_get_contents($file);
			$str .= "
			";
		}
	$str .= "
		})(window);
		";

	$str .= "
		})();
";
		$copyright = file_get_contents( "../LICENSE.txt" );
		$str = str_replace( $copyright, '', $str );
		if(php_sapi_name() === 'cli' && $argv[1] == 1){
			preg_match_all('/(console\.(log|debug|info|log|warn|error|assert|dir|dirxml|trace|group|groupEnd|time|timeEnd|profile|profileEnd|count)(\s*?)\((((?!console).)*[^}(])(\){1,});?)/', $str, $matches);
			$str = str_replace( $matches[0], array(), $str );
			file_put_contents( "../lib/mpeg1video-decoder-webgl.js", $copyright.$str );
			$str = minify( $str, 'SIMPLE_OPTIMIZATIONS');
			file_put_contents( "../lib/mpeg1video-decoder-webgl.min.js", $copyright.$str );
		
		} else {
			header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
			header("Cache-Control: post-check=0, pre-check=0", false);
			header("Pragma: no-cache");
			header("Content-Type: application/javascript");
	
			echo $str;
		}
function minify( $str, $optimizations ){
	$url = 'https://closure-compiler.appspot.com/compile';
	$process = curl_init($url);
	curl_setopt($process, CURLOPT_TIMEOUT, 60);
	curl_setopt($process, CURLOPT_POST, 1);
	curl_setopt($process, CURLOPT_HTTPHEADER, array('Content-Type: application/x-www-form-urlencoded'));
	curl_setopt($process, CURLOPT_POSTFIELDS, http_build_query( array(
				'js_code' => $str,
				//'compilation_level' => 'ADVANCED_OPTIMIZATIONS',
				'compilation_level' => $optimizations,
				'output_format' => 'json',
				)).'&output_info=compiled_code&output_info=warnings&output_info=errors');
	curl_setopt($process, CURLOPT_RETURNTRANSFER, TRUE);
	$string = curl_exec($process);
	curl_close($process);


	if( !( $object = json_decode( $string ) ) ){
			echo 'json_decode failed';
	}
	if( property_exists( $object, 'errors' ) ) {
			echo "There were errors\n";
				var_dump( $object->errors );
	}
	return $object->compiledCode;
}		
	
	
