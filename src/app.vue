<template lang="pug">
.w-100
    PianoRoll(ref="pianoRoll" :bpm="bpm" :sampler="sampler")
    .d-flex
        PianoKeyboard(@triggerAttack="triggerAttack($event)" @triggerRelease="triggerRelease($event)")
        MIDI(@setNotes="$refs['pianoRoll'].notes=$event")
        //- Osc
        //- ADSR(style="width:300px;height:200px")
        div
            Knob(v-model="bpm" :min="40" :max="240")
            .btn-group.btn-group-sm
                .btn.btn-outline-primary(v-for="val,key in tempoDict" :key="key" 
                    :class="key==tempoName?'active':''" @click="bpm=val") {{key}}
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

export default {
    name: 'App',
    components: {PianoRoll,PianoKeyboard,Knob,Osc,ADSR,MIDI},
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
        for(let velocity of [5,10,15])
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