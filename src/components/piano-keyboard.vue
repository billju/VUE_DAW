<template lang="pug">
.btn-group
    .d-flex
        .btn.p-0.position-relative(v-for='(pk,pi) in pianoKeys' :key='pi' :style='pianoKeyStyle(pk)' 
            @mouseenter='handleEnter(pk)' @mouseleave='handleLeave(pk)')
            .w-100.position-absolute.text-center.p-1(:style="{bottom:0,color: pk.press?'white':'grey'}") {{pk.char}}
    .h-100.btn-group-vertical.btn-group-sm
        .btn.btn-dark
            i.fa.fa-circle-notch
        .btn.btn-dark(@click="setOctave(1)" title="PageUp")
            i.fa.fa-caret-up
        .btn.btn-dark {{octave}}
        .btn.btn-dark(@click="setOctave(-1)" title="PageDown")
            i.fa.fa-caret-down
</template>
<script>
export default {
    data:()=>({
        events: {}, mouse:{active:false,pianoKey:null}, octave: 4,
    }),
    props:{
        pianoKeys: {
            type: Array,
            default: () => ([
                {char: 'Z', midi: 48, black:false, press:false},
                {char: 'S', midi: 49, black:true, press:false},
                {char: 'X', midi: 50, black:false, press:false},
                {char: 'D', midi: 51, black:true, press:false},
                {char: 'C', midi: 52, black:false, press:false},
                {char: 'V', midi: 53, black:false, press:false},
                {char: 'G', midi: 54, black:true, press:false},
                {char: 'B', midi: 55, black:false, press:false},
                {char: 'H', midi: 56, black:true, press:false},
                {char: 'N', midi: 57, black:false, press:false},
                {char: 'J', midi: 58, black:true, press:false},
                {char: 'M', midi: 59, black:false, press:false},
                {char: 'Q', midi: 60, black:false, press:false},
                {char: '2', midi: 61, black:true, press:false},
                {char: 'W', midi: 62, black:false, press:false},
                {char: '3', midi: 63, black:true, press:false},
                {char: 'E', midi: 64, black:false, press:false},
                {char: 'R', midi: 65, black:false, press:false},
                {char: '5', midi: 66, black:true, press:false},
                {char: 'T', midi: 67, black:false, press:false},
                {char: '6', midi: 68, black:true, press:false},
                {char: 'Y', midi: 69, black:false, press:false},
                {char: '7', midi: 70, black:true, press:false},
                {char: 'U', midi: 71, black:false, press:false},
                {char: 'I', midi: 72, black:false, press:false},
                {char: '9', midi: 73, black:true, press:false},
                {char: 'O', midi: 74, black:false, press:false},
                {char: '0', midi: 75, black:true, press:false},
                {char: 'P', midi: 76, black:false, press:false},
                {char: '[', midi: 77, black:false, press:false},
                {char: '=', midi: 78, black:true, press:false},
                {char: ']', midi: 79, black:false, press:false},
            ]),
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
                this.noteOn(pianoKey)
        },
        handleLeave(pianoKey){
            this.mouse.pianoKey=null
            this.noteOff(pianoKey)
        },
        handleMousedown(e){
            this.mouse.active = true
            if(this.mouse.pianoKey)
                this.noteOn(this.mouse.pianoKey)
        },
        handleMouseup(e){
            this.mouse.active = false
            if(this.mouse.pianoKey)
                this.noteOff(this.mouse.pianoKey)
        },
        setOctave(offset=1){
            for(let pk of this.pianoKeys){
                if(pk.press) this.noteOff(pk)
                pk.midi+=12*offset
            }
            this.octave+= offset
        },
        handleKeydown(e){
            if(e.ctrlKey) return
            else if(e.key=='PageUp'){e.preventDefault();this.setOctave(1)}
            else if(e.key=='PageDown'){e.preventDefault();this.setOctave(-1)}
            this.noteOn(this.getPianoKey(e.key))
        },
        handleKeyup(e){
            this.noteOff(this.getPianoKey(e.key))
        },
        noteOn(pianoKey){
            if(!pianoKey) return
            let {midi} = pianoKey
            if(!pianoKey.press)
                this.$emit('noteOn',{v:72,midi})
            pianoKey.press = true
        },
        noteOff(pianoKey){
            if(!pianoKey||!pianoKey.press) return
            let {midi} = pianoKey
            if(pianoKey.press)
                this.$emit('noteOff',{v:72,midi})
            pianoKey.press = false
        },
        pianoKeyStyle(pianoKey){
            return pianoKey.black?{
                width: '20px',
                height: '80px',
                top: 0,
                marginLeft: '-10px',
                marginRight: '-10px',
                zIndex: 99,
                background: '#16FFBD',
            }:{
                width: '30px',
                height: '120px',
                zIndex: 69,
                border: '1px solid #eee',
                background: '#333333',
            }
        },
    },
    mounted(){
        this.events = {
            keydown: e=>this.handleKeydown(e),
            keyup: e=>this.handleKeyup(e),
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