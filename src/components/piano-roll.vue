<template lang="pug">
div(style="width:fit-content;max-width:100%;user-select:none")
    select(v-model="chordType")
        option(v-for="val,name in chords" :key="name" :value="name") {{name}}
    .d-flex.bg-dark
        .flex-grow-0(style="flex-shrink:0" :style="{flexBasis:pianoGrids[0].style.width}")
        .hide-scrollbar.position-relative.text-light(ref="ticks" style="overflow-x:scroll")
            .d-inline-flex.pr-3(@wheel="scaleX($event)")
                .h-100(v-for="tick,ti in ticks" :key="ti" :style="tick.style") {{tick.content}}
            i.position-absolute.text-warning.fa.fa-chevron-down(style="bottom:0;left:-6px" :style="cursorStyle")
    .d-flex(style='overflow-y:scroll;max-height:600px')
        .h-100(@wheel="scaleY($event)")
            .text-dark(v-for='pG,pi in pianoGrids' :key='pi' :style='pG.style' 
                :class="pG.class" @mousedown="triggerAttack({f:grid2freq(pi),v:10})") {{pG.content}}
        .hide-scrollbar.position-relative.h-100(ref='grid' style='overflow-x:scroll' 
            @mousedown='handleStart($event)' @contextmenu.prevent="")
            div(:style='gridStyle')
            transition-group(name="fade")
                .text-center(v-for='note,ni in notes' :key='ni' :style='noteStyle(note)')
                    small.position-absolute.w-100(style="left:0;top:0" :style="{lineHeight:grid.H-2+'px'}") {{grid2note(note.y)}}
                    .position-absolute.px-1.h-100(style="left:0;top:0;cursor:ew-resize" 
                        @mousedown="resizeStart('left',note)")
                    .position-absolute.px-1.h-100(style="right:0;top:0;cursor:ew-resize" 
                        @mousedown="resizeStart('right',note)")
            div(:style='rangeStyle')
            .position-absolute.h-100.border.border-primary(style="left:0;top:0" :style='cursorStyle')
    .d-flex.bg-dark
        .flex-grow-0(style="flex-shrink:0" :style="{flexBasis:pianoGrids[0].style.width}")
        .hide-scrollbar(ref="velocities" style="overflow-x:scroll")
            .d-inline-flex.pr-3
                template(v-for="vel,vi in velocities")
                    RangeSlider(v-if="vel.show" :style="vel.style" :value="vel.notes[0].v" @input="vel.notes.map(n=>n.v=$event)")
                    div(v-else :style="vel.style")
</template>

<script>
import * as Tone from 'tone'
import RangeSlider from './range-slider'

export default {
    name: 'piano-roll',
    components: {RangeSlider},
    data:()=>({
        grid: {W:20,H:15,octave:7,measure:32}, velo:50,
        // width height  八度 小節
        notes: [
            // {a:false,x:0,y:0,l:1,f,v,d},
            // active grid-x grid-y length frequency velocity delay
        ],
        lastNote: {a:false,x:0,y:0,l:1,f:440,v:80},
        chordType: 'major',
        chords: {
            mono: [0],
            majorScale: [2,4,5,7,9,11,12],
            minorScale: [2,3,5,7,8,10,12],
            major: [0,4,7],
            minor: [0,3,7],
            major7: [0,4,7,11],
            minor7: [0,3,7,10],
        },
        activeNotes: [], clipboard: [], bpm:128,
        resizing: false, 
        moving: false, lastMove:{x:0,y:0},
        ranging: false, range: {sx:0,sy:0,ex:0,ey:0},
        deleting: false, ctrlKey: false, shiftKey: false,
        events: {},
        sampler: {},
        triggering: [], playX: -1, timeout: null,
    }),
    props:{
        
    },
    methods:{
        minmax(input,min,max){return input>max?max:input<min?min:input},
        scaleX(e,arg){
            e.preventDefault()
            let delta = Math.sign(e.deltaY)*2
            this.grid.W = this.minmax(this.grid.W-delta,10,50)
        },
        scaleY(e,arg){
            e.preventDefault()
            let delta = Math.sign(e.deltaY)*2
            this.grid.H = this.minmax(this.grid.H-delta,10,30)
        },
        getGrid(cx,cy){
            let {scrollLeft} = this.$refs['grid']
            let {top,left} = this.$refs['grid'].getBoundingClientRect()
            let {W,H,octave,measure} = this.grid
            let x = Math.floor((cx-left+scrollLeft)/W)
            let y = Math.floor((cy-top)/H)
            return {x,y}
        },
        play(){
            this.playX++
            let {measure} = this.grid
            for(let note of this.notes){
                if(note.x==this.playX)
                    this.triggerAttack(note)
                if(note.x+note.l==this.playX-1)
                    this.triggerRelease(note)
            }
            clearTimeout(this.timeout)
            if(this.playX>this.endX){ 
                this.stop()
            }else{
                this.timeout = setTimeout(()=>{this.play()},this.beatMs)
            }
        },
        stop(){
            clearTimeout(this.timeout)
            this.playX = -1
            for(let note of this.triggering)
                this.triggerRelease(note)
        },
        resizeStart(dir,note){
            if(!this.activeNotes.includes(note))
                this.activeNotes = [note]
            this.resizing = {dir,note}
        },
        grid2note(y){
            let {octave} = this.grid
            let notes = ['B','A#','A','G#','G','F#','F','E','D#','D','C#','C']
            let note = notes[y%12]+Math.floor((octave*12-y-1)/12)
            return note
        },
        grid2freq(y){
            let { octave } = this.grid
            let MIDINum = octave*12-y+11
            let freq = 440*Math.pow(2,(MIDINum-69)/12)
            return Math.round(freq)
        },
        stepVelocity(velocity){
            for(var v in this.sampler){
                if(velocity<v*8)
                    return v
            }
            return v
        },
        triggerAttack(note){
            let v = this.stepVelocity(note.v)
            this.sampler[v].triggerAttack(note.f)
            this.triggering.push(note)
        },
        triggerRelease(note){
            let v = this.stepVelocity(note.v)
            this.sampler[v].triggerRelease(note.f)
            this.triggering =  this.triggering.filter(n=>n!=note)
        },
        triggerSelection(){
            for(let note of this.activeNotes.slice(0,4)){
                note.f = this.grid2freq(note.y)
                this.triggerAttack(note)
            }
        },
        clearSelection(){
            this.activeNotes.map(n=>{n.a=false})
            this.activeNotes = []
        },
        handleStart(e){
            let grid = this.getGrid(e.clientX,e.clientY)
            if(!grid) return 
            let {x,y} = grid
            let notes = this.notes.filter(n=>n.x<=x&&x<n.x+n.l).filter(n=>n.y==y)
            this.lastMove = {x,y}
            if(e.button==0){
                if(this.ctrlKey){
                    this.clearSelection()
                    this.ranging = true
                    this.range.sx = x
                    this.range.sy = y
                }else if(this.resizing){
                    
                }else if(notes.length){
                    this.moving = notes[0]
                    if(!this.activeNotes.includes(notes[0])){
                        this.clearSelection()
                        notes[0].a = true
                        this.activeNotes = [notes[0]]
                    }
                    this.triggerSelection()
                }else{
                    this.activeNotes.map(n=>{n.a=false})
                    this.activeNotes = []
                    for(let oy of this.chords[this.chordType]){
                        let newNote = {
                            a:true, x,
                            y: y - oy,
                            l:this.lastNote.l,
                            f:this.grid2freq(y-oy),
                            v:this.lastNote.v,
                        }
                        this.moving = newNote
                        this.notes.push(newNote)
                        this.activeNotes.push(newNote)
                    }
                    this.triggerSelection()
                }
            }else if(e.button==2){
                this.clearSelection()
                this.deleting = true
                if(notes.length)
                    this.notes = this.notes.filter(n=>n!=notes[0])
            }
        },
        checkMovable(dx,dy){
            let {octave,measure} = this.grid
            let xs = this.activeNotes.map(n=>n.x+dx).every(x=>0<=x&&x<measure*4)
            let ys = this.activeNotes.map(n=>n.y+dy).every(y=>0<=y&&y<octave*12)
            return xs&&ys
        },
        handleMove(e){
            let {x,y} = this.getGrid(e.clientX,e.clientY)
            if(this.ranging){
                this.range.ex = x
                this.range.ey = y
            }else if(this.resizing){
                let {dir,note} = this.resizing
                let dx = x - note.x
                let dl = x-note.x-note.l+1
                if(dir=='left'&&this.activeNotes.every(n=>n.x+dx<n.x+n.l)){
                    for(let n of this.activeNotes){
                        n.l-= dx
                        n.x+= dx
                    }
                }else if(dir=='right'&&this.activeNotes.every(n=>n.l+dl>0)){
                    for(let n of this.activeNotes){
                        n.l+= dl
                    }
                }
            }else if (this.moving){
                let dx = x-this.lastMove.x
                let dy = y-this.lastMove.y
                if(this.checkMovable(dx,dy)){
                    for(let note of this.activeNotes){
                        note.x += dx
                        note.y += dy
                        if(dy!=0)
                            note.f = this.grid2freq(note.y)
                    }
                }
            }else if(this.deleting){
                let notes = this.notes.filter(n=>n.x<=x&&x<n.x+n.l).filter(n=>n.y==y)
                if(notes.length)
                    this.notes = this.notes.filter(n=>n!=notes[0])
            }
            this.lastMove = {x,y}
        },
        handleEnd(e){
            if(this.ranging){
                let {sx,sy,ex,ey} = this.range
                if(ex<sx) sx = [ex,ex=sx][0]
                if(ey<sy) sy = [ey,ey=sy][0]
                this.activeNotes = this.notes.filter(n=>{
                    return n.x<=ex&&sx<n.x+n.l&&sy<=n.y&&n.y<=ey
                })
                this.activeNotes.map(n=>{n.a=true})
                this.ranging = false
            }else if(this.resizing){
                this.lastNote = {...this.resizing.note}
                this.resizing = false
            }else if(this.activeNotes.length){
                this.lastNote = {...this.activeNotes[0]}
                this.moving = false
                this.activeNotes.map(n=>{
                    n.f = this.grid2freq(n.y)
                })
                // this.notes.sort((a,b)=>a.x-b.x)
            }
            this.deleting = false
            for(let note of this.triggering)
                this.triggerRelease(note)
        },
        copyNotes(){
            this.clipboard = JSON.parse(JSON.stringify(this.activeNotes))
        },
        pasteNotes(){
            let minX = Math.min(...this.clipboard.map(n=>n.x))
            let startX = this.lastMove.x
            let cloned = JSON.parse(JSON.stringify(this.clipboard))
            this.activeNotes.map(n=>{n.a=false})
            cloned.map(n=>{n.x+=startX-minX})
            this.notes.push(...cloned)
            this.activeNotes = cloned
        },
        deleteNotes(){
            this.notes = this.notes.filter(n=>!this.activeNotes.includes(n))
            this.activeNotes = []
        },
        handleKeydown(e){
            console.log(e.key)
            switch(e.key.toUpperCase()){
                case 'SHIFT':
                    this.shiftKey = true; break
                case 'CONTROL':
                    this.ctrlKey = true; break
                case ' ':
                    e.preventDefault()
                    if(this.playX>-1) this.stop()
                    else this.play()
                    break
                case 'X':
                    if(e.ctrlKey){
                        this.copyNotes()
                        this.deleteNotes()
                    }
                    break
                case 'C':
                    if(e.ctrlKey)
                        this.copyNotes()
                    break
                case 'V':
                    if(e.ctrlKey)
                        this.pasteNotes()
                    break
                case 'DELETE':
                    this.deleteNotes();break
                case 'BACKSPACE':
                    this.deleteNotes();break
                case 'ARROWLEFT':
                    if(e.shiftKey){
                        if(this.activeNotes.every(n=>n.l>1))
                            this.activeNotes.map(n=>{n.l--})
                    }else if(e.ctrlKey){
                        // if(this.checkMovable(-1,0))
                        //     this.activeNotes.map(n=>{n.x--})
                    }else if(this.checkMovable(-1,0)){
                        this.activeNotes.map(n=>{n.x--})
                    }
                    break
                case 'ARROWRIGHT':
                    if(this.checkMovable(1,0)){
                        if(e.shiftKey)
                            this.activeNotes.map(n=>{n.l++})
                        else
                            this.activeNotes.map(n=>{n.x++})
                    }else if(e.ctrlKey){

                    }
                    break
                case 'ARROWDOWN':
                    if(e.shiftKey&&this.activeNotes.length){
                        let minY = Math.min(...this.activeNotes.map(n=>n.y))
                        let i = this.activeNotes.findIndex(n=>n.y==minY)
                        this.activeNotes[i].y+= 12
                        this.triggerSelection()
                    }else if(e.ctrlKey){

                    }else{
                        this.activeNotes.map(n=>{n.y++;n.f=this.grid2freq(n.y)})
                    }
                    break
                case 'ARROWUP':
                    if(e.shiftKey&&this.activeNotes.length){
                        let maxY = Math.max(...this.activeNotes.map(n=>n.y))
                        let i = this.activeNotes.findIndex(n=>n.y==maxY)
                        this.activeNotes[i].y-= 12
                        this.triggerSelection()
                    }else if(e.ctrlKey){

                    }else{
                        this.activeNotes.map(n=>{n.y--;n.f=this.grid2freq(n.y)})
                    }
                    break
                default: break
            }
        },
        handleKeyup(e){
            switch(e.key.toUpperCase()){
                case 'SHIFT':
                    this.shiftKey = false; break
                case 'CONTROL':
                    this.ctrlKey = false; break
                default: break;
            }
        },
        noteStyle(note){
            let {W,H} = this.grid
            return {
                position: 'absolute',
                top: note.y*H+'px',
                left: note.x*W+'px',
                height: H-2+'px',
                width: note.l*W-2+'px',
                background: note.a?'#FFA3A4':'#C4FACF'
            }
        },
    },
    computed:{
        ticks(){
            let {W,measure} = this.grid
            return Array.from(Array(measure).keys(),i=>{
                return {
                    style: {
                        width: W*4+'px',
                    },
                    content: i+1,
                }
            })
        },
        velocities(){
            let {W,measure} = this.grid
            let xs = [...new Set(this.notes.map(n=>n.x))]
            return Array.from(Array(measure*4).keys(),i=>{
                let show = xs.includes(i)
                let notes = this.notes.filter(n=>n.x==i)
                return {
                    show,
                    notes,
                    style: {
                        width: W-4+'px',
                        marginRight: '4px',
                        height: '100px',
                    },
                }
            })
        },
        beatMs(){
            return Math.round(60*1000/this.bpm)/4
        },
        endX(){
            let endX = Math.max(...this.notes.map(n=>n.x+n.l))
            return endX
        },
        cursorStyle(){
            let x = (this.playX+0.5)*this.grid.W
            let duration = this.playX<0?0:this.beatMs
            return {
                transform: `translateX(${x}px)`,
                transition: `transform ${duration}ms linear`,
            }
        },
        rangeStyle(){
            let {sx,sy,ex,ey} = this.range
            if(ex<sx) sx = [ex,ex=sx][0]
            if(ey<sy) sy = [ey,ey=sy][0]
            let {W,H} = this.grid
            return this.ranging?{
                position: 'absolute',
                top: sy*H+'px',
                left: sx*W+'px',
                height: (ey-sy)*H+'px',
                width: (ex-sx)*W+'px',
                border: '5px dashed dodgerblue'
            }:{
                display: 'none'
            }
        },
        pianoGrids(){
            let {H,octave} = this.grid
            let blacks = [1,3,5,8,10]
            let accH = 0
            let len = octave*12
            return Array.from(Array(len).keys(),i=>{
                let isBlack = blacks.includes(i%12)
                let height = isBlack?H:i%12<7?H*7/4:H*5/3
                let top = isBlack?-H/2-accH:-accH 
                if(isBlack)
                    accH+= height
                let freq = this.grid2freq(i)
                let isTriggered = this.triggering.some(n=>n.f==freq)
                return {
                    class: isTriggered?'bg-warning':isBlack?'bg-dark':'bg-light',
                    style:{
                        position: 'relative',
                        width: (isBlack?30:60)+'px',
                        top: top+'px',
                        zIndex: isBlack?666:66,
                        boxShadow: isBlack?'2px 0 white':'0 -2px black',
                        height: height+'px',
                        lineHeight: height+'px',
                        textAlign: isBlack?'left':'right',
                        padding: '0px 4px',
                        marginBottom:　(i==len-1)?-accH+'px':0,
                    },
                    content: isBlack?'':this.grid2note(i)
                }
            })
        },
        gridStyle(){
            let {H,W,B,S,BC,DC,SC,octave,measure} = this.grid
            let pattern = (c1,px1,c2,px2,i)=>`${c1} ${px1*i}px, ${c1} ${px1*(i+1)-px2}px, ${c2} ${px1*(i+1)-px2}px, ${c2} ${px1*(i+1)}px`
            let thin = i=>pattern('transparent',W,'#42545F',1,i)
            let thick = i=>pattern('transparent',W,'#29373F',3,i)
            let black = i=>pattern('#394B56',H,'#29373F',2,i)
            let white = i=>pattern('#42545F',H,'#29373F',2,i)
            return {
                width: W*4*measure+'px',
                height: H*12*octave+'px',
                background: 
                    `repeating-linear-gradient(to right, ${thin(0)}, ${thin(1)}, ${thin(2)}, ${thick(3)}), `+
                    `repeating-linear-gradient(to bottom, `+ 
                    `${white(0)}, ${black(1)}, ${white(2)}, ${black(3)}, ${white(4)}, ${black(5)}, ${white(6)}, ${white(7)}, ${black(8)}, ${white(9)}, ${black(10)}, ${white(11)})`
            }
        }
    },
    mounted(){
        // this.synth = new Tone.PolySynth(Tone.Synth,{
        //     oscillator:{type:'square8'}
        // }).toDestination()
        
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
        this.sampler = {}
        for(let velocity of [5,10,15])
            this.sampler[velocity] = createSampler(velocity)
        // 互相綁定捲動事件
        let scrollBundles = ['grid','ticks','velocities']
        for(let ref of scrollBundles){
            this.$refs[ref].addEventListener('scroll',()=>{
                let {scrollLeft} = this.$refs[ref]
                scrollBundles.filter(r=>r!=ref).map(r=>{
                    this.$refs[r].scrollLeft = scrollLeft
                })
            })  
        }
        this.events = {
            mousemove: e=>this.handleMove(e),
            mouseup: e=>this.handleEnd(e),
            mouseleave: e=>this.handleEnd(e),
            keydown: e=>this.handleKeydown(e),
            keyup: e=>this.handleKeyup(e),
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

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
.fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s, transform 0.3s;
}
.fade-leave-to{
    opacity: 0;
    transform-origin: center;
    transform: scale(1.2);
}
</style>