<template lang="pug">
.w-100
    PianoRoll
    PianoKeyboard
    Knob(v-model="knob")
    .btn-group.btn-group-sm
        .btn.btn-outline-primary(v-for="val,key in tempoDict" :key="key" :class="key==tempoName?'active':''") {{key}}
    input.custom-range(type="range" min="40" max="240" v-model="bpm")
</template>

<script>
import PianoRoll from './components/piano-roll'
import PianoKeyboard from './components/piano-keyboard'
import Knob from './components/knob'
import exportMixin from './mixins/exportMixin'

export default {
    name: '',
    components: {PianoRoll,PianoKeyboard,Knob},
    mixins: [exportMixin],
    data:()=>({
        events: {}, knob: 0.5, bpm: 128,
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