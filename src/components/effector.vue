<template lang="pug">
.btn-group.btn-group-sm.position-relative
    select.btn.btn-outline-primary(v-model="effect" @change="setEffect(effect)") {{effect}}
        option(v-for="e in effectors" :key="e.name" :value="e.name") {{e.name}}
    .d-flex.position-absolute.bg-dark.text-light.px-1(v-if="knobs.length" style="left:100%;z-index:666")
        Knob.mx-1(v-for="k,ki in knobs" :key="ki" :min="k.min" :max="k.max" v-model="k.value" @input="k.set($event)" :label="k.label" :size="30" :bottom="false")
</template>

<script>
import * as Tone from 'tone'
import Knob from './knob'
import effectors from './effector.js'

export default {
    name: 'effector',
    components: {Knob},
    data:()=>({
        events: {},
        knobs: [], effect: 'Gain', engine: Tone.Gain,
        effectors,
    }),
    props:{
        source: {type:Object},
    },
    methods:{
        setEffect(effect){
            let idx = this.effectors.findIndex(e=>e.name==effect)
            if(idx!==-1){
                this.source.disconnect(this.engine)
                let Engine = this.effectors[idx].engine
                this.engine = new Engine().toDestination()
                // create knobx
                let knobs = this.effectors[idx].knobs
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