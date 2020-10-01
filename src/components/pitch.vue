<template lang="pug">
.btn.btn-outline-danger(v-if="stream" @click="stopMedia()" title="已開啟麥克風")
	i.fa.fa-microphone
.btn.btn-outline-secondary(v-else @click="getUserMedia()" title="已關閉麥克風")
	i.fa.fa-microphone-slash
</template>

<script>
export default {
    name: '',
    data:()=>({
		midiNames: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
		buf: new Float32Array(1024), stream: null, movingAvg: [], lastMidi: null,
		analyser:{}, mediaStreamSource: {}, animationFrame: null,
        events: {}, audioContext: new AudioContext(),
    }),
    methods:{
		freq2midi(frequency){
			let midiNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
			return Math.round( midiNum ) + 69;
		},
		midi2freq(midiNum){
			return 440 * Math.pow(2,(midiNum-69)/12);
		},
		freq2cents(frequency,midiNum){
			return Math.floor( 1200 * Math.log( frequency / this.midi2freq( midiNum ))/Math.log(2) );
		},
		stopMedia(){
			this.stream.getTracks().forEach(track=>track.stop());
			this.stream = null;
			cancelAnimationFrame(this.animationFrame);
		},
       	getUserMedia(){
			try {
				navigator.mediaDevices.getUserMedia({
					audio: {
						mandatory: {
							googEchoCancellation: false,
							googAutoGainControl: false,
							googNoiseSuppression: false,
							googHighpassFilter: false
						},
						optional: []
					},
				}).then(this.gotStream);
			} catch (e) {
				alert('getUserMedia threw exception :' + e);
			}
		},
		gotStream(stream){
			this.stream = stream;
			this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 2048;
			this.mediaStreamSource.connect( this.analyser );
			this.updatePitch()
		},
		sample(){
			const getAvg = (arr)=>arr.reduce((acc,cur)=>acc+cur,0)/arr.length
			let midi = Math.round(getAvg(this.movingAvg.filter(a=>a)))
			if(midi<12||midi>96) midi = null
			let noteOff = !midi
			let noteOn = midi!=this.lastMidi
			if(this.lastMidi&&(noteOff||noteOn))
				this.$emit('noteOff', this.lastMidi)
			if(midi&&noteOn)
				this.$emit('noteOn', midi)
			this.lastMidi = midi
		},
		updatePitch(){
			this.analyser.getFloatTimeDomainData( this.buf )
			let freq = this.autoCorrelate( this.buf, this.audioContext.sampleRate );
			let midi = null
			if (freq == -1) { // vague
				
			} else {
				midi =  this.freq2midi( freq );
				// let name = this.midiNames[midi%12]+Math.floor(midi/12);
				// let detune = this.freq2cents( freq, midi );	
			}
			this.movingAvg.push(midi)
			this.movingAvg = this.movingAvg.slice(-1)
			this.animationFrame = requestAnimationFrame( this.updatePitch )
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
			if (rms<0.1) // not enough signal
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