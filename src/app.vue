<template lang="pug">
.d-flex.flex-column.h-100
    //- ADSR(style="width:300px;height:200px")
    .d-flex.flex-shrink-0.overflow-auto
        .btn-group.btn-group-sm.align-items-center.text-nowrap
            Knob(v-model="bpm" :min="40" :max="240" :size="40")
            //- BPM
            .btn.btn-dark(contenteditable @blur="bpm=parseInt($event.target.textContent)||120" @keydown.enter="$event.target.blur()") {{bpm}}
            .btn.btn-outline-primary(v-for="val,key in tempoDict" :key="key" :class="key==tempoName?'active':''" @click="bpm=val") {{key}}
            //- Piano Roll
            .btn(:class="PR.historyIdx>1?'btn-outline-info':'d-none'" @click="PR.traceHistory(-1)")
                i.fa.fa-undo
            .btn(:class="PR.historyIdx<PR.histories.length-1?'btn-outline-info':'d-none'" @click="PR.traceHistory(1)")
                i.fa.fa-redo
            .btn.btn-outline-danger(v-if="!PR.recording" @click="PR.record()")
                i.fa.fa-circle
            .btn.btn-outline-danger(v-if="PR.playing||PR.recording" @click="PR.stop()")
                i.fa.fa-stop
            .btn.btn-outline-success(v-else @click="PR.play()")
                i.fa.fa-play
            .btn(title="鎖定橫向卷軸" :class="PR.freezeScroll?'btn-secondary':'btn-outline-secondary'" @click="PR.freezeScroll=!PR.freezeScroll")
                i.fa.fa-fast-forward
            .btn.btn-outline-secondary(@click="PR.randomVelocity()") random velocity
            Pitch(ref="pitch" @noteOn="PR.pianoStart($event)" @noteOff="PR.pianoEnd($event)")
            //- import, export
            MIDI(ref="midi" @setNotes="setNotes($event)" 
                @noteOn="PR.pianoStart($event.midi,$event.velocity)" 
                @noteOff="PR.pianoEnd($event.midi)")
            .btn.btn-outline-secondary(@click="$refs['midi'].encodeMIDI(bpm,PR.notes)") export
            Effector(ref="effector" :sampler="sampler")
    PianoRoll(ref="pianoRoll" :bpm="bpm" :sampler="sampler" @tick="$refs['pitch'].sample()")
    .position-fixed(style="bottom:0;right:0")
        PianoKeyboard(@noteOn="PR.pianoStart($event.midi)" @noteOff="PR.pianoEnd($event.midi)")
</template>
<script>
import * as Tone from 'tone'
import ADSR from './components/ADSR'
import PianoRoll from './components/piano-roll'
import PianoKeyboard from './components/piano-keyboard'
import Knob from './components/knob'
import exportMixin from './mixins/exportMixin'
import MIDI from './components/midi'
import Effector from './components/effector'
import Pitch from './components/pitch'

export default {
    name: 'App',
    components: {PianoRoll,PianoKeyboard,Knob,ADSR,MIDI,Effector,Pitch},
    mixins: [exportMixin],
    data:()=>({
        events: {}, bpm: 132, sampler: {}, PR: {histories:[]},
        tempoDict: {
            Largo: 40,
            Adagio: 66,
            Andante: 76,
            Moderato: 108,
            Allegro: 120,
            JoJo: 131,
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
            this.PR.grid.measure = Math.ceil(maxX/4)+1
            this.PR.notes=notes
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
        },
    },
    mounted(){
        this.PR = this.$refs['pianoRoll']
        // let synth = new Tone.PolySynth(Tone.Synth,{
        //     oscillator:{type:'square8'}
        // })
        // for(let velocity of [5])
        //     this.sampler[velocity] = synth
        // this.$refs['effector'].setEffect('default')

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
                release: 1,
                onload: ()=>{
                    this.$refs['effector'].setEffect('效果器')
                },
            })
        }
        for(let velocity of [2,5,8,10])
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
*{
    font-family: 微軟正黑體;
}
html,body{
    margin: 0;
    width: 100%;
    height: 100%;
}
</style>