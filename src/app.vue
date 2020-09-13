<template lang="pug">
.w-100
    .d-flex
        
        //- Osc
        //- ADSR(style="width:300px;height:200px")
    
    PianoRoll(ref="pianoRoll" :bpm="bpm" :sampler="sampler")
        Knob(v-model="bpm" :min="40" :max="240" :size="40" slot="prepend")
        .btn.btn-dark(contenteditable @blur="bpm=parseInt($event.target.textContent)||120" @keydown.enter="$event.target.blur()") {{bpm}}
        .btn.btn-outline-primary(v-for="val,key in tempoDict" :key="key" 
            :class="key==tempoName?'active':''" @click="bpm=val") {{key}}
        MIDI(ref="midi" @setNotes="setNotes($event)")
        .btn.btn-outline-secondary(@click="$refs['midi'].encodeMIDI(bpm,$refs['pianoRoll'].notes)") export
        Effector(slot="append")
    PianoKeyboard(@triggerAttack="triggerAttack($event)" @triggerRelease="triggerRelease($event)")
</template>

<script>
import * as Tone from 'tone'
import Osc from './components/osc'
import ADSR from './components/ADSR'
import PianoRoll from './components/piano-roll'
import PianoKeyboard from './components/piano-keyboard'
import Knob from './components/knob'
import exportMixin from './mixins/exportMixin'
import MIDI from './components/midi'
import Effector from './components/effector'

export default {
    name: 'App',
    components: {PianoRoll,PianoKeyboard,Knob,Osc,ADSR,MIDI,Effector},
    mixins: [exportMixin],
    data:()=>({
        events: {}, bpm: 132, sampler: {},
        tempoDict: {
            Largo: 40,
            Adagio: 66,
            Andante: 76,
            Moderato: 108,
            Allegro: 120,
            Presto: 168,
            Prestissimo: 200,
        },
        processor: ['Arpeggio','Legato','Staccato','Ornaments','Vibrato','Pizzicato','Glissando']
    }),
    props:{
        
    },
    methods:{
        stepVelocity(velocity){
            for(var v in this.sampler)
                if(velocity<v*8)
                    return v
            return v
        },
        triggerAttack(note){
            let v = this.stepVelocity(note.v)
            this.sampler[v].triggerAttack(note.f)
        },
        triggerRelease(note){
            let v = this.stepVelocity(note.v)
            this.sampler[v].triggerRelease(note.f)
        },
        setNotes(notes){
            let maxX = Math.max(...notes.map(n=>n.x))
            this.$refs['pianoRoll'].grid.measure = Math.ceil(maxX/4)+1
            this.$refs['pianoRoll'].notes=notes
        },
    },
    computed:{
        tempoName(){
            let keys = Object.keys(this.tempoDict)
            for(let i=0;i<keys.length;i++){
                if(this.tempoDict[keys[i]]>this.bpm)
                    return keys[i-1]
            }
            return keys[keys.length-1]
        }
    },
    mounted(){
        // let gain = new Tone.Gain(0.3).toDestination()
        // let synth = new Tone.PolySynth(Tone.Synth,{
        //     oscillator:{type:'square8'}
        // }).connect(gain)
        // for(let velocity of [2,5,8])
        //     this.sampler[velocity] = synth

        // A0v1~A7v16, C1v1~C8v16 Ds1v7~Ds7v16 Fs1v1~Fs7v16
        const octs = {A:[0,7],C:[1,8],Ds:[1,7],Fs:[1,7]}
        const createSampler = (velocity)=>{
            let entries = Object.keys(octs).flatMap(note=>{
                let [min,max] = octs[note]
                return Array.from(Array(max-min+1).keys(),i=>{
                    let key = `${note}${min+i}v${velocity}`
                    return [key.replace('s','#'),`${key}.mp3`]
                })
            })
            return new Tone.Sampler({
                urls: Object.fromEntries(entries),
                baseUrl: 'http://localhost:5500/sounds/piano-samples/',
                onload: ()=>{},
            }).toDestination()
        }
        for(let velocity of [2,5,8])
            this.sampler[velocity] = createSampler(velocity)

        // 事件
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

<style>
html,body{
    margin: 0;
    font-family: 微軟正黑體;
}
</style>