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
            .btn.btn-outline-success(v-if="PR.metronome" @click="PR.metronome=false" title="已開啟節拍器")
                i.fa.fa-headphones
            .btn.btn-outline-secondary(v-else @click="PR.metronome=true" title="已關閉節拍器")
                i.fa.fa-volume-mute
            .btn(title="鎖定橫向卷軸" :class="PR.freezeScroll?'btn-secondary':'btn-outline-secondary'" @click="PR.freezeScroll=!PR.freezeScroll")
                i.fa.fa-fast-forward
            .btn.btn-outline-secondary(@click="PR.randomVelocity()") random velocity
            Pitch(ref="pitch" @noteOn="PR.pianoStart($event)" @noteOff="PR.pianoEnd($event)")
            //- import, export
            MIDI(ref="midi" @decode="importMIDI($event)" 
                @noteOn="PR.pianoStart($event.midi,$event.velocity)" 
                @noteOff="PR.pianoEnd($event.midi)")
            .btn.btn-outline-secondary(@click="$refs['midi'].encodeMIDI(bpm,PR.notes)") export
            .btn.btn-outline-secondary(v-for="track,ti in tracks" :key="track.name" :class="ti==trackIndex?'active':''" @click="trackIndex=ti") {{track.name}}
            Effector(v-if="tracks.length" :key="trackIndex" :source="tracks[trackIndex].instrument")
    PianoRoll(
        ref="pianoRoll" :bpm="bpm" :tracks="tracks" :trackIndex="trackIndex" @mic-sample="$refs['pitch'].sample()"
        @metronome="metronome.triggerAttackRelease($event,'8n')" @notes="tracks[trackIndex].notes=$event"
    )
    .position-fixed(style="top:0;right:20px")
        PianoKeyboard(@noteOn="PR.pianoStart($event.midi)" @noteOff="PR.pianoEnd($event.midi)")
</template>
<script>
import * as Tone from 'tone'
import ADSR from './components/ADSR'
import PianoRoll from './components/piano-roll'
import PianoKeyboard from './components/piano-keyboard'
import Knob from './components/knob'
import MIDI from './components/midi'
import Effector from './components/effector'
import Pitch from './components/pitch'

export default {
    name: 'App',
    components: {PianoRoll,PianoKeyboard,Knob,ADSR,MIDI,Effector,Pitch},
    data:()=>({
        events: {}, bpm: 132, 
        PR: {histories:[]}, 
        sampler: {}, drum: {}, synth: {},
        trackIndex: 0, tracks: [],
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
        CMAP:{
            red:[255, 163, 164], pink:[249, 196, 250],
            green: [196,250,207], yellow: [250, 250, 196],
            blue: [196, 238, 250], purple: [206, 196, 250]
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
        importMIDI(tracks){
            for(let track of this.tracks) track.notes = []
            let mainPiano = false
            for(let track of tracks){
                console.log(track)
                if(track.family=='piano'){
                    if(mainPiano) this.tracks[1].notes.push(...track.notes)
                    else this.tracks[0].notes.push(...track.notes)
                    mainPiano = true
                }
                if(track.family=='drums') this.tracks[3].notes.push(...track.notes)
            }
        },
        getPianoUrls(){
            // A0v1~A7v16, C1v1~C8v16 Ds1v7~Ds7v16 Fs1v1~Fs7v16
            const octs = {A:[0,7],C:[1,8],Ds:[1,7],Fs:[1,7]}
            let entries = []
            for(let velocity of [5,10,15]){
                for(let note in octs){
                    let [min,max] = octs[note]
                    for(let i=min;i<=max;i++){
                        let key = `${note}${i}v${velocity}`
                        let entry = [key.replace('s','#'),`${key}.mp3`]
                        entries.push(entry)
                    }
                }
            }
            return Object.fromEntries(entries)
        },
        getDrumUrls(){
            return {
                'A2':'A2.mp3',
                'A#2':'As2.mp3',
                'B1':'C2.mp3',
                'B2':'B2.mp3',
                'C2':'C2.mp3',
                'C4':'C4.mp3',
                'C#2':'Cs2.mp3',
                'C#3':'Cs3.mp3',
                'C#4':'Cs4.mp3',
                'D2':'D2.mp3',
                'D4':'D4.mp3',
                'D#2':'Ds2.mp3',
                'D#3':'Ds3.mp3',
                'D#4':'Ds4.mp3',
                'E2':'E2.mp3',
                'E3':'E3.mp3',
                'E4':'E4.mp3',
                'F#2':'Gs2.mp3', 
                'F3':'F3.mp3',
                'G2':'G2.mp3',
                'G3':'G3.mp3',
                'G#2':'Gs2.mp3',
            }
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
    created(){
        let synth = new Tone.PolySynth(Tone.Synth, {
            oscillator:{type:'square8'}
        })
        let piano = new Tone.Sampler({
            urls: this.getPianoUrls(),
            baseUrl: 'piano-samples/',
            release: 1,
        })
        let drum = new Tone.Sampler({
            urls: this.getDrumUrls(),
            baseUrl: 'drum/acoustic/',
            release: 1
        })
        this.tracks = [
            {name:'piano1', rgb:this.CMAP.green, instrument: piano, notes: [], histories:[], historyIdx:0},
            {name:'piano2', rgb:this.CMAP.purple, instrument: piano, notes: [], histories:[], historyIdx:0},
            {name:'synth', rgb:this.CMAP.yellow, instrument: synth, notes: [], histories:[], historyIdx:0},
            {name:'drum', rgb:this.CMAP.blue, instrument: drum, notes: [], histories:[], historyIdx:0},
        ]
        this.metronome = new Tone.Sampler({
            urls: {'F5':'metronome.mp3'},
            baseUrl: 'drum/',
            release: 1,
        }).toDestination()
    },
    mounted(){
        this.PR = this.$refs['pianoRoll']
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