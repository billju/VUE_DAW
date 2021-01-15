<template lang="pug">
.btn-group.btn-group-sm
    .btn.btn-outline-secondary(@click="$refs['file'].click()") import
    input.d-none(ref="file" type="file" @change="importMIDI($event.target.files[0])")
</template>

<script>
import {Midi} from '@tonejs/midi'
import { Buffer } from 'tone'
import {Note} from '../models.js'
export default {
    name: 'MIDI',
    data:()=>({
        events: {},
    }),
    props:{
        
    },
    methods:{
        importMIDI(file){
            let reader = new FileReader()
            reader.readAsArrayBuffer(file)
            reader.onload = ()=>{
                this.decodeMIDI(reader.result)
            }
        },
        async decodeMIDI(buffer){
            const midi = await new Midi(buffer)
            const bpm = midi.header.tempos[0].bpm
            const beatSec = 60/bpm/8
            let tracks = []
            for(let track of midi.tracks){
                // console.log(track)
                let { number, family, name, percussion } = track.instrument
                let newTrack = {notes: [], family}
                for(let note of track.notes){
                    newTrack.notes.push(new Note({
                        x:Math.round(note.time/beatSec),
                        y:8*12-note.midi+11, // C0 = 12
                        l:Math.ceil(note.duration/beatSec),
                        v:note.velocity*127,
                    }))
                }
                tracks.push(newTrack)
            }
            this.$emit('decode', tracks)
        },
        encodeMIDI(bpm,notes){
            let midi = new Midi()
            midi.header.setTempo(bpm)
            const beatSec = 60/bpm/4
            let track = midi.addTrack()
            for(let note of notes)
                track.addNote({
                    midi: 8*12-note.y+11,
                    time: note.x*beatSec,
                    duration: note.l*beatSec,
                    velocity: note.v/127
                })
            //
            const blob = new Blob([midi.toArray()],{type:'audio/midi'})
            const link = document.createElement('a')
            link.style.display = 'none'
            document.body.appendChild(link)
            link.href = URL.createObjectURL(blob)
            link.download = 'export.midi'
            link.click()
            document.body.removeChild(link)
        },
        async requestMIDIAccess(){
            if(navigator.requestMIDIAccess){
                let midiAccess =  await navigator.requestMIDIAccess()
                let inputs = midiAccess.inputs
                let outputs = midiAccess.outputs
                for(let input of inputs.values()){
                    input.onmidimessage = this.getMIDIMessage
                }
            }
        },
        getMIDIMessage(msg){
            let [command,midi,velocity] = msg.data 
            switch(command){
                case 144: //note on
                    this.$emit('noteOn',{midi,velocity})
                    break
                case 128: //note off
                    this.$emit('noteOff',{midi,velocity})
                    break;
            }
        },
    },
    computed:{
        
    },
    mounted(){
        this.requestMIDIAccess()
    },
    beforeDestroy(){
        
    },
}
</script>