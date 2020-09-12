<template lang="pug">
.d-flex.flex-wrap.justify-content-center
    svg.d-none
        linearGradient#gradient(y1="1" y2="0")
        stop(offset="0%" stop-color="#447799")
        stop(offset="100%" stop-color="#112266")
    svg.waveform(ref="sine" viewBox="0 0 100 100" @click="type='sine'")
        path(d="M20 50 Q35 0,50 50 Q65 100,80 50" fill="url(#gradient)" :stroke="primary")
    svg.waveform(ref="square" viewBox="0 0 100 100" @click="type='square'")
        polyline(points="20,70 20,30 50,30 50,70 80,70 80,30" fill="url(#gradient)" :stroke="primary")
    svg.waveform(ref="pulse" viewBox="0 0 100 100" @click="type='pulse'")
        polyline(points="20,60 35,30 50,30 50,70 80,70 80,30" fill="url(#gradient)" :stroke="primary")
    svg.waveform(ref="triangle" viewBox="0 0 100 100" @click="type='triangle'")
        polyline(points="20,50 35,30 65,70 80,50" fill="url(#gradient)" :stroke="primary")
    svg.waveform(ref="sawtooth" viewBox="0 0 100 100" @click="type='sawtooth'")
        polyline(points="20,65 50,30 50,70 80,35" fill="url(#gradient)" :stroke="primary")
    svg.waveform(ref="random" viewBox="0 0 100 100" @click="type='random'")
        rect(x="25" y="25" rx="10" ry="10" width="50" height="50" :fill="primary")
        circle(cx="60" cy="40" r="4" :fill="dark")
        circle(cx="50" cy="50" r="4" :fill="dark")
        circle(cx="40" cy="60" r="4" :fill="dark")
</template>

<script>
export default {
    name: 'osc',
    data:()=>({
        type:'sine', osc: {}, gainNode: {}, events:{}, primary: '#16FFBD', dark: '#112266', events:{},
    }),
    props:{
        audioContext:{type:AudioContext},
        detune:{type:Number,default:0},
        adsr:{type:Object},
        output: {}
    },
    methods:{
        createOsc(type){
            if(type=='random'){
                let sampleRate = this.audioContext.sampleRate
                let bufferSize = 2 * sampleRate;
                let noiseBuffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
                let output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++)
                    output[i] = Math.random()*2-1
                let bufferSource = this.audioContext.createBufferSource();
                bufferSource.buffer = noiseBuffer;
                bufferSource.loop = true;
                return bufferSource
            }else{
                let osc = this.audioContext.createOscillator()
                if(type=='pulse'){
                    let powerDownArray = Array.from(Array(30).keys(),x=>1/(1+x));
                    let real = new Float32Array(powerDownArray);
                    let imag = new Float32Array(real.length);
                    let customWave = this.audioContext.createPeriodicWave(real, imag);
                    osc.setPeriodicWave(customWave);
                }else{
                    osc.type = type
                }
                return osc
            }
        },
        oscStart(freq){
            // refresh queue
            let now = this.audioContext.currentTime
            this.gainNode[freq] = this.createGainNode(now)
            // ensure osc.freq is stopped
            if(freq in this.osc){this.osc[freq].stop(now)}
            // init osc
            this.osc[freq] = this.createOsc(this.type)
            this.osc[freq].frequency.value = freq
            this.osc[freq].detune.value = this.detune
            // connect audio context nodes
            this.osc[freq].connect(this.gainNode[freq])
            this.osc[freq].start(now)
            let outputNode = this.output==undefined?this.audioContext.destination:this.output
            this.gainNode[freq].connect(outputNode)
        },
        oscStop(freq){
            let now = this.audioContext.currentTime
            if(freq in this.osc){
                this.gainNode[freq].gain.linearRampToValueAtTime(0,now+this.adsr.r)
                this.osc[freq].stop(now+this.adsr.r)
            }
        },
        createGainNode(now){
            let adsr = Object.assign({a:0,aq:0.5,d:1,dq:0.5,s:1,r:0,rq:0.5},this.adsr)
            let gainNode = this.audioContext.createGain()
            let gain = gainNode.gain
            gain.linearRampToValueAtTime(0, now)
            gain.linearRampToValueAtTime(1-adsr.aq, now+adsr.a*0.5)
            gain.linearRampToValueAtTime(1, now+adsr.a)
            gain.linearRampToValueAtTime(adsr.d+(1-adsr.d)*adsr.dq, now+adsr.a+adsr.s*0.5)
            gain.linearRampToValueAtTime(adsr.d, now+adsr.a+adsr.s)
            return gainNode
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

<style scoped>
svg{
    width: 100px;
    height: 100%;
}
</style>