
# Leon is a superfast GPU-accelerated ( using WebGL ) mpeg1-like video decoder

All the high computational tasks like dequantization, inverse DCT, motion compensation and colour conversion are offloaded onto the GPU so that even though this is a JavaScript video decoder it does not put pressure onto your CPU, leaving it free fro use with other tasks.

Any device with a browser that has WebGL support can play Leon video files.

The video object replicates API and events of a standard html5 video element. 

You can try a live demo <https://www.easy-bits.com/mpeg1video-decoder-webgl-gpu>  
