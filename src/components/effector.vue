<template lang="pug">
.btn-group.btn-group-sm.position-relative
    select.btn.btn-outline-primary(v-model="effect" @change="setEffect(effect)") {{effect}}
        option(v-for="e in effects" :key="e.name" :value="e.name") {{e.name}}
    .d-flex.position-absolute.bg-dark.text-light.px-1(v-if="knobs.length" style="left:100%;z-index:666")
        Knob.mx-1(v-for="k,ki in knobs" :key="ki" :min="k.min" :max="k.max" v-model="k.value" @input="k.set($event)" :label="k.label" :size="30" :bottom="false")
</template>

<script>
import * as Tone from 'tone'
import Knob from './knob'
const NormalRange = {min:0,max:1,value:0.5}
const Time = {min:0,max:1,value:0.1}
const Positive = {min:0,max:10,value:1}
const Cents = {min:-100,max:100,value:0}
const Frequency = {min:80,max:3600,value:440}
const Decibels = {min:0,max:80,value:50}
const Degrees = {min:0,max:360,value:0}
const ToneOscillatorType = ['fatsine','fatsquare','fatsawtooth','fattriangle','fatcustom','fmsine','fmsquare','fmsawtooth','fmtriangle','fmcustom','amsine','amsquare','amsawtooth','amtriangle','amcustom','pulse','pwm']
const BiquadFilterType = ['lowpass', 'highpass', 'bandpass','lowshelf', 'highshelf', 'notch', 'allpass', 'peaking']
const Bool = ['on','off']

export default {
    name: 'effector',
    components: {Knob},
    data:()=>({
        events: {},
        knobs: [], effect: 'Gain', engine: Tone.Gain,
        effects: [
            {
                name: 'Gain',
                engine: Tone.Gain,
                knobs: {
                    gain: NormalRange,
                },
                menus: {},
            },
            {
                name: 'AutoPanner',
                engine: Tone.AutoPanner,
                knobs: {
                    depth : NormalRange,
                    frequency : Frequency,
                    wet : NormalRange,
                },
                menus: {
                    type: ToneOscillatorType,
                },
            },
            {
                name: 'AutoWah',
                engine: Tone.AutoWah,
                knobs: {
                    Q : Positive,
                    baseFrequency : Frequency,
                    gain : NormalRange,
                    octaves : Positive,
                    sensitivity : Decibels,
                    wet : NormalRange,
                },
                menus: {

                },
            },
            {
                name: 'BitCrusher',
                engine: Tone.BitCrusher,
                knobs: {
                    bits : Positive,
                    wet : NormalRange,
                },
                menus: {

                },
            },
            {
                name: 'BiqualFilter',
                engine: Tone.BiquadFilter,
                knobs: {
                    Q : Positive,
                    detune : Cents,
                    frequency : Frequency,
                    gain : NormalRange,
                },
                menus: {
                    type: BiquadFilterType,
                },
            },
            {
                name: 'Compressor',
                engine: Tone.Compressor,
                knobs: {
                    attack : Time,
                    knee : Decibels,
                    ratio : Positive,
                    release : Time,
                    threshold : Decibels,
                },
                menus: {

                },
            },
            {
                name: 'Convolver',
                engine: Tone.Convolver,
                knobs: {

                },
                menus: {
                    normalize : Bool,
                    url: ['string|AudioBuffer|ToneAudioBuffer']
                },
            },
            {
                name: 'Chorus',
                engine: Tone.Chorus,
                knobs: {
                    delayTime : Time,
                    depth : NormalRange,
                    feedback : NormalRange,
                    frequency : Frequency,
                    spread : Degrees,
                    wet : NormalRange,
                },
                menus: {
                    type : ToneOscillatorType,
                },
            },
            {
                name: 'Distortion',
                engine: Tone.Distortion,
                knobs: {                    
                    distortion : Positive,
                    // oversample : OverSampleType,
                    wet : NormalRange,
                },
                menus: {

                },
            },
            {
                name: 'EQ3',
                engine: Tone.EQ3,
                knobs: {
                    high : {min:0,max:0.5,value:0.25},
                    highFrequency : {min:2000,max:2e4,value:6000},
                    low : {min:0,max:0.5,value:0.25},
                    lowFrequency : {min:20,max:440,value:220},
                    mid : {min:0,max:0.5,value:0.25},
                },
                menus: {

                },
            },
            {
                name: 'Delay',
                engine: Tone.FeedbackDelay,
                knobs: {
                    delayTime : Time,
                    feedback : NormalRange,
                    maxDelay : Time,
                    wet : NormalRange,
                },
                menus: {

                },
            },
            {
                name: 'Phaser',
                engine: Tone.Phaser,
                knobs: {
                    Q : Positive,
                    baseFrequency : Frequency,
                    frequency : Frequency,
                    octaves : Positive,
                    stages : Positive,
                    wet : NormalRange,
                },
                menus: {

                },
            },
            {
                name: 'Reverb',
                engine: Tone.Reverb,
                knobs: {
                    decay : Time,
                    preDelay : Time,
                    wet : NormalRange,
                },
                menus: {

                },
            },
            {
                name: 'Tremolo',
                engine: Tone.Tremolo,
                knobs: {
                    depth : NormalRange,
                    frequency : Frequency,
                    spread : Degrees,
                    wet : NormalRange,
                },
                menus: {
                    type : ToneOscillatorType,
                },
            },
        ]
    }),
    props:{
        // effect: {type:String,default:'Reverb'},
        source: {type:Object},
    },
    methods:{
        setEffect(effect){
            let idx = this.effects.findIndex(e=>e.name==effect)
            if(idx!==-1){
                this.source.disconnect(this.engine)
                let Engine = this.effects[idx].engine
                this.engine = new Engine().toDestination()
                // create knobx
                let knobs = this.effects[idx].knobs
                this.knobs = []
                for(let key in knobs)
                    this.knobs.push({
                        label: key,
                        min: knobs[key].min,
                        max: knobs[key].max,
                        value: knobs[key].value,
                        step: 0.1,
                        set: (value)=>{
                            let prop={}
                            prop[key]=value
                            this.engine.set(prop)
                        }
                    })
                this.source.connect(this.engine)
            }
        }
    },
    mounted(){
        this.setEffect('Gain')
    },
}
</script>