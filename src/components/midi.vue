<template lang="pug">
input(type="file" @change="importMIDI($event.target.files[0])")
</template>

<script>
import {Midi} from '@tonejs/midi'
import { Buffer } from 'tone'

export default {
    name: 'MIDI',
    data:()=>({
        events: {}
    }),
    props:{
        
    },
    methods:{
        generateID(){
            return '_' + Math.random().toString(36).substr(2, 9)
        },
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
            const beatSec = 60/bpm/4
            let notes = []
            midi.tracks.forEach(track=>{
                track.name
                // let { number, family, name, percussion } = track.instrument
                for(let note of track.notes){
                    let a = false
                    let i = this.generateID()
                    let x = Math.round(note.time/beatSec)
                    let y = 8*12-note.midi+11 // C0 = 12
                    let l = Math.round(note.duration/beatSec)
                    let f = Math.round(440*Math.pow(2,(note.midi-69)/12))
                    let v = 40//note.velocity*127
                    notes.push({a,i,x,y,l,v,f})
                }
            })
            this.$emit('setNotes',notes)
        },
        encodeMIDI(){
            let midi = new Midi()
            let track = midi.addTrack()
            track.addNote({midi:60,time:0,duration:0.2})
            let buffer = new Buffer(midi.toArray())
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
        getMIDIMessage(){
            let [command,note,velocity] = msg.data
            switch(command){
                case 144: //note on
                    noteOn(note,velocity)
                    break
                case 128: //note off
                    noteOff(note,velocity)
                    break;
            }
        },
        noteOn(note,velocity){
            
        },
        noteOff(note,velocity){

        }
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