<template lang="pug">
.position-relative(:style='{minWidth}')
    .d-inline-block(v-for='(pk,pi) in pianoKeys' :key='pi' :style='pianoKeyStyle(pk)' @mousedown='handleKeydown(pk)' @mouseup='handleKeyup(pk)' @mouseleave='handleKeyup(pk)' @touchstart='handleKeydown(pk)' @touchend='handleKeyup(pk)' @touchcancel='handleKeyup(pk)')
        div(:style='charStyle(pk)') {{pk.char}}
</template>
<script>
export default {
    data:()=>({
        events: {}
    }),
    props:{
        pianoKeys: {
            type: Array,
            default: () => ([
                {char: 'Z', pitch: -9, black:false, press:false},
                {char: 'S', pitch: -8, black:true, press:false},
                {char: 'X', pitch: -7, black:false, press:false},
                {char: 'D', pitch: -6, black:true, press:false},
                {char: 'C', pitch: -5, black:false, press:false},
                {char: 'V', pitch: -4, black:false, press:false},
                {char: 'G', pitch: -3, black:true, press:false},
                {char: 'B', pitch: -2, black:false, press:false},
                {char: 'H', pitch: -1, black:true, press:false},
                {char: 'N', pitch: 0, black:false, press:false},
                {char: 'J', pitch: 1, black:true, press:false},
                {char: 'M', pitch: 2, black:false, press:false},
                {char: 'Q', pitch: 3, black:false, press:false},
                {char: '2', pitch: 4, black:true, press:false},
                {char: 'W', pitch: 5, black:false, press:false},
                {char: '3', pitch: 6, black:true, press:false},
                {char: 'E', pitch: 7, black:false, press:false},
                {char: 'R', pitch: 8, black:false, press:false},
                {char: '5', pitch: 9, black:true, press:false},
                {char: 'T', pitch: 10, black:false, press:false},
                {char: '6', pitch: 11, black:true, press:false},
                {char: 'Y', pitch: 12, black:false, press:false},
                {char: '7', pitch: 13, black:true, press:false},
                {char: 'U', pitch: 14, black:false, press:false},
                {char: 'I', pitch: 15, black:false, press:false},
                {char: '9', pitch: 16, black:true, press:false},
                {char: 'O', pitch: 17, black:false, press:false},
                {char: '0', pitch: 18, black:true, press:false},
                {char: 'P', pitch: 19, black:false, press:false},
                {char: '[', pitch: 20, black:false, press:false},
                {char: '=', pitch: 21, black:true, press:false},
                {char: ']', pitch: 22, black:false, press:false},
            ]),
        }
    },
    methods:{
        getFreq(pianoKey){
            return Math.pow(2, pianoKey.pitch/12).toFixed(2)*1
        },
        getPianoKey(keyChar){
            keyChar = keyChar.toUpperCase()
            let idx = this.pianoKeys.findIndex(x=>x.char.toUpperCase()==keyChar)
            if(idx===-1) return null
            return this.pianoKeys[idx]
        },
        handleKeydown(pianoKey){
            if(!pianoKey) return
            let freq = this.getFreq(pianoKey)
            pianoKey.press = true
            this.$emit('keydown',{freq})
        },
        handleKeyup(pianoKey){
            if(!pianoKey) return
            if(!pianoKey.press) return
            pianoKey.press = false
            let freq = this.getFreq(pianoKey)
            this.$emit('keyup',{freq})
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
            keydown: e=>this.handleKeydown(this.getPianoKey(e.key)),
            keyup: e=>this.handleKeyup(this.getPianoKey(e.key))
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