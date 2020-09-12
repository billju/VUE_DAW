<template lang="pug">
    
</template>

<script>
export default {
    name: '',
    data:()=>({
		noteNames: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
		buf: new Float32Array(1024),
		analyser:{}, mediaStreamSource: {}, animationFrame: null,
        events: {}
    }),
    props:{
		audioContext: {type:Object},
    },
    methods:{
		pitch2note(frequency){
			let noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
			return Math.round( noteNum ) + 69;
		},
		note2pitch(noteNum){
			return 440 * Math.pow(2,(noteNum-69)/12);
		},
		pitch2cents(frequency,noteNum){
			return Math.floor( 1200 * Math.log( frequency / note2pitch( noteNum ))/Math.log(2) );
		},
       	getUserMedia(){
			try {
				let {getUserMedia,webkitGetUserMedia,mozGetUserMedia} = navigator
				navigator.getUserMedia = getUserMedia||webkitGetUserMedia||mozGetUserMedia
				navigator.getUserMedia({
					audio: {
						mandatory: {
							googEchoCancellation: false,
							googAutoGainControl: false,
							googNoiseSuppression: false,
							googHighpassFilter: false
						},
						optional: []
					},
				}, this.gotStream);
			} catch (e) {
				alert('getUserMedia threw exception :' + e);
			}
		},
		gotStream(stream){
			this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 2048;
			this.mediaStreamSource.connect( this.analyser );
			this.updatePitch()
		},
		updatePitch(){
			this.analyser.getFloatTimeDomainData( this.buf )
			let pitch = this.autoCorrelate( this.buf, this.audioContext.sampleRate );
			if (pitch == -1) { // vague
				
			} else {
				let note =  this.noteFromPitch( pitch );
				let name = this.noteNames[note%12];
				let detune = this.pitch2cents( pitch, note );
			}
			this.animationFrame = requestAnimationFrame( updatePitch )
		},
		autoCorrelate(buf, sampleRate){
			var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.
			var GOOD_ENOUGH_CORRELATION = 0.9; // this is the "bar" for how close a correlation needs to be
			let SIZE = buf.length;
			let MAX_SAMPLES = Math.floor(SIZE/2);
			let best_offset = -1;
			let best_correlation = 0;
			let rms = 0;
			let foundGoodCorrelation = false;
			let correlations = new Array(MAX_SAMPLES);

			for (let i=0;i<SIZE;i++) {
				let val = buf[i];
				rms += val*val;
			}
			rms = Math.sqrt(rms/SIZE);
			if (rms<0.01) // not enough signal
				return -1;

			let lastCorrelation=1;
			for (let offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
				let correlation = 0;

				for (let i=0; i<MAX_SAMPLES; i++) {
					correlation += Math.abs((buf[i])-(buf[i+offset]));
				}
				correlation = 1 - (correlation/MAX_SAMPLES);
				correlations[offset] = correlation; // store it, for the tweaking we need to do below.
				if ((correlation>GOOD_ENOUGH_CORRELATION) && (correlation > lastCorrelation)) {
					foundGoodCorrelation = true;
					if (correlation > best_correlation) {
						best_correlation = correlation;
						best_offset = offset;
					}
				} else if (foundGoodCorrelation) {
					// short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
					// Now we need to tweak the offset - by interpolating between the values to the left and right of the
					// best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
					// we need to do a curve fit on correlations[] around best_offset in order to better determine precise
					// (anti-aliased) offset.

					// we know best_offset >=1, 
					// since foundGoodCorrelation cannot go to true until the second pass (offset=1), and 
					// we can't drop into this clause until the following pass (else if).
					let shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
					return sampleRate/(best_offset+(8*shift));
				}
				lastCorrelation = correlation;
			}
			if (best_correlation > 0.01) {
				// console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
				return sampleRate/best_offset;
			}
			return -1;
		},
    },
    computed:{
        
    },
    mounted(){
        this.events = {
            
        }
        for(let name in this.events)
            window.addEventListener(name,this.events[name])
    },
    beforeDestroy(){
        for(let name in this.events)
            window.removeEventListener(name,this.events[name])
    },
}
</script>