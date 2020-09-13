<template lang="pug">
.table-responsive
    .position-relative(:style='{minWidth}')
        .d-inline-block(v-for='(pk,pi) in pianoKeys' :key='pi' :style='pianoKeyStyle(pk)' 
            @mouseenter='handleEnter(pk)' @mouseleave='handleLeave(pk)')
            div(:style='charStyle(pk)') {{pk.char}}
</template>
<script>
export default {
    data:()=>({
        events: {}, mouse:{active:false,pianoKey:null},
    }),
    props:{
        pianoKeys: {
            type: Array,
            default: () => ([
                {char: 'Z', midi: 36, black:false, press:false},
                {char: 'S', midi: 37, black:true, press:false},
                {char: 'X', midi: 38, black:false, press:false},
                {char: 'D', midi: 39, black:true, press:false},
                {char: 'C', midi: 40, black:false, press:false},
                {char: 'V', midi: 41, black:false, press:false},
                {char: 'G', midi: 42, black:true, press:false},
                {char: 'B', midi: 43, black:false, press:false},
                {char: 'H', midi: 44, black:true, press:false},
                {char: 'N', midi: 45, black:false, press:false},
                {char: 'J', midi: 46, black:true, press:false},
                {char: 'M', midi: 47, black:false, press:false},
                {char: 'Q', midi: 48, black:false, press:false},
                {char: '2', midi: 49, black:true, press:false},
                {char: 'W', midi: 50, black:false, press:false},
                {char: '3', midi: 51, black:true, press:false},
                {char: 'E', midi: 52, black:false, press:false},
                {char: 'R', midi: 53, black:false, press:false},
                {char: '5', midi: 54, black:true, press:false},
                {char: 'T', midi: 55, black:false, press:false},
                {char: '6', midi: 56, black:true, press:false},
                {char: 'Y', midi: 57, black:false, press:false},
                {char: '7', midi: 58, black:true, press:false},
                {char: 'U', midi: 59, black:false, press:false},
                {char: 'I', midi: 60, black:false, press:false},
                {char: '9', midi: 61, black:true, press:false},
                {char: 'O', midi: 62, black:false, press:false},
                {char: '0', midi: 63, black:true, press:false},
                {char: 'P', midi: 64, black:false, press:false},
                {char: '[', midi: 65, black:false, press:false},
                {char: '=', midi: 66, black:true, press:false},
                {char: ']', midi: 67, black:false, press:false},
            ]),
            // default: () => Array.from(Array(12*7).keys(),i=>({
            //     char:i+24+'',
            //     midi:i+24,
            //     black:[1,3,6,8,10].includes(i%12),
            //     press: false,
            // })),
        }
    },
    methods:{
        getFreq(pianoKey){
            return Math.round(440*Math.pow(2, (pianoKey.midi-69)/12))
        },
        getPianoKey(keyChar){
            keyChar = keyChar.toUpperCase()
            let idx = this.pianoKeys.findIndex(x=>x.char.toUpperCase()==keyChar)
            if(idx===-1) return null
            return this.pianoKeys[idx]
        },
        handleEnter(pianoKey){
            this.mouse.pianoKey = pianoKey
            if(this.mouse.active)
                this.triggerAttack(pianoKey)
        },
        handleLeave(pianoKey){
            this.mouse.pianoKey=null
            this.triggerRelease(pianoKey)
        },
        handleMousedown(e){
            this.mouse.active = true
            if(this.mouse.pianoKey)
                this.triggerAttack(this.mouse.pianoKey)
        },
        handleMouseup(e){
            this.mouse.active = false
            if(this.mouse.pianoKey)
                this.triggerRelease(this.mouse.pianoKey)
        },
        triggerAttack(pianoKey){
            if(!pianoKey) return
            let f = this.getFreq(pianoKey)
            if(!pianoKey.press)
                this.$emit('triggerAttack',{f,v:60})
            pianoKey.press = true
        },
        triggerRelease(pianoKey){
            if(!pianoKey) return
            if(!pianoKey.press) return
            let f = this.getFreq(pianoKey)
            if(pianoKey.press)
                this.$emit('triggerRelease',{f,v:60})
            pianoKey.press = false
        },
        pianoKeyStyle(pianoKey){
            let common = {
                cursor: 'pointer',
                userSelect: 'none'
            }
            return pianoKey.black?{
                width: '20px',
                height: '80px',
                position: 'absolute',
                top: 0,
                marginLeft: '-10px',
                marginRight: '-10px',
                zIndex: 99,
                background: '#16FFBD',
                ...common,
            }:{
                width: '30px',
                height: '120px',
                position: 'relative',
                zIndex: 69,
                border: '1px solid #eee',
                background: '#333333',
                ...common
            }
        },
        charStyle(pianoKey){
            return {
                position: 'absolute',
                bottom: '5px',
                width: '100%',
                textAlign: 'center',
                color: pianoKey.press?'white':'grey'
            }
        }
    },
    computed:{
        minWidth(){
            return this.pianoKeys.filter(k=>!k.black).length*30+'px'
        },  
    },
    mounted(){
        this.events = {
            keydown: e=>{if(e.ctrlKey) return;this.triggerAttack(this.getPianoKey(e.key))},
            keyup: e=>{if(e.ctrlKey) return;this.triggerRelease(this.getPianoKey(e.key))},
            mousedown: e=>this.handleMousedown(e),
            mouseup: e=>this.handleMouseup(e),
            mouseleave: e=>this.handleMouseup(e),
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