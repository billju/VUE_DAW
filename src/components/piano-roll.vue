<template lang="pug">
div(style="max-width:100%;user-select:none" :style="{cursor}")
    .d-flex.bg-dark
        .flex-grow-0(style="flex-shrink:0" :style="{flexBasis:pianoGrids[0].style.width}")
        .hide-scrollbar.position-relative.text-light(ref="ticks" style="overflow-x:scroll")
            .d-inline-flex.pr-3(@wheel="scaleX($event)"  @mousedown="ticking=true;handleMove($event)")
                .h-100(v-for="tick,ti in ticks" :key="ti" :style="tick.style") {{tick.content}}
            i.position-absolute.text-warning.fa.fa-chevron-down(style="bottom:0;left:-6px" :style="cursorStyle")
    .d-flex(ref="scroll-y" style="overflow-y:scroll;max-height:calc(100vh - 150px)" @contextmenu.prevent="")
        .h-100(@wheel="scaleY($event)")
            .text-dark(v-for="pG,pi in pianoGrids" :key="pi" :style="pG.style" :class="pG.class" @mousedown="pianoStart(pi)") {{pG.content}}
        .hide-scrollbar.position-relative.h-100(ref="scroll-x" style="overflow-x:scroll" @wheel="scrollX($event)" @mousedown="handleStart($event)")
            div(:style="gridStyle")
            transition-group(name="fade")
                small.text-center(v-for="note in notes" :key="note.i" :style="noteStyle(note)") {{note.l*grid.W>30&&grid.H>14?grid2note(note.y):''}}
            div(:style="rangeStyle")
            .position-absolute.h-100.border.border-primary(style="left:0;top:0" :style="cursorStyle")
    .d-flex.bg-dark.pr-3
        .flex-grow-0.hide-scrollbar(style="flex-shrink:0;overflow-x:hidden;cursor:pointer" :style="{flexBasis:pianoGrids[0].style.width,height:grid.vH+22+'px'}")
            .small.text-center(v-for="val,name in chords" :key="name" @click="chordType=name" 
                :class="chordType==name?'text-light bg-secondary':'text-muted bg-dark'") {{name}}
        div(ref="velocities" style="overflow-x:scroll")
            .position-relative(:style="{width:gridStyle.width,height:grid.vH+4+'px'}" @mousedown="velociting=true;setVelocity($event)")
                .position-absolute(v-for="note in notes" :key="note.i" :style="velStyle(note)")
</template>

<script>

export default {
    name: 'piano-roll',
    data:()=>({
        grid: {W:20,H:15,octave:8,measure:32,beat:4,vH:48},
        // width height  八度 小節
        notes: [
            // {a:false,x:0,y:0,l:1,f,v,d},
            // active grid-x grid-y length frequency velocity delay
        ],
        lastNote: {a:false,x:0,y:0,l:1,f:440,v:30},
        vPianoNotes: [],
        chordType: 'mono',
        chords: {
            mono: [0],
            major: [0,4,7],
            minor: [0,3,7],
            major7: [0,4,7,11],
            minor7: [0,3,7,10],
        },
        activeNotes: [], clipboard: [],
        ticking: false, // 調整時間軸
        recording: false, // 錄音中
        velociting: false, // 調整力度
        resizing: false, // 調整音符長短
        resizeBuffer: 6,
        playing: false, // 正在播放
        range: {sx:0,sy:0,ex:0,ey:0}, // 正在選取範圍
        ranging: false, 
        cursor: 'auto', // css鼠標
        mouse: {active:false,x:0,y:0},
        deleting: false, // 正在按右鍵刪除
        ctrlKey: false, shiftKey: false,
        events: {},
        triggering: [], // 以觸發的音訊
        playX: -1, 
        playTimeout: null, scrollInterval: null, freezeScroll: false,
        frame:{from:0,to:0,num:0,den:1,FPS:30},
        historyIdx:0, histories: [],
    }),
    props:{
        bpm: {type:Number,default:128},
        sampler: {type:Object,default:()=>({})}
    },
    methods:{
        randomVelocity(){
            this.notes.filter(n=>!this.triggering.includes(n))
                .map(n=>n.v=Math.round(Math.random()*127))
        },
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
        scrollX(e){
            if(this.shiftKey)
                this.$refs['scroll-x'].scrollLeft+= Math.sign(e.deltaY)*100
        },
        getGrid(cx,cy){
            let {scrollLeft} = this.$refs['scroll-x']
            let {top,left} = this.$refs['scroll-x'].getBoundingClientRect()
            let {W,H,octave,measure} = this.grid
            let rx = cx-left+scrollLeft
            let ry = cy-top
            let x = Math.floor(rx/W)
            let y = Math.floor(ry/H)
            return {x,y,rx,ry}
        },
        scrollLoop(){
            let {from,to,num,den,FPS} = this.frame
            if(this.freezeScroll){
                let progress = num/den
                let x = progress*to+(1-progress)*from
                this.$refs['scroll-x'].scrollLeft = x
                if(num<den) this.frame.num++
            }
        },
        playLoop(){
            let {measure,W} = this.grid
            if(this.recording){
                for(let note of this.activeNotes)
                    note.l = this.playX - note.x
            }else{
                for(let note of this.notes){
                    if(note.x==this.playX){
                        this.triggerAttackRelease(note)
                        this.triggering.push(note)
                    }else if(note.x+note.l==this.playX-1)
                        this.triggering =  this.triggering.filter(n=>n!=note)
                }
            }
            this.playX++
            this.frame = {
                from: (this.playX-1)*W,
                to: this.playX*W,
                num: 0,
                den: Math.floor(this.frame.FPS*this.beatSec),
                FPS: this.frame.FPS
            }
            clearTimeout(this.playTimeout)
            if(this.playX>this.endX)
                this.stop()
            else
                this.playTimeout = setTimeout(()=>{this.playLoop()},this.beatSec*1000)
        },
        record(){
            for(let note of this.activeNotes)
                note.a = false
            this.activeNotes = []
            this.recording = true
            this.play()
        },
        play(){
            if(this.playing) return
            this.playing = true
            this.playLoop()
            this.scrollInterval = setInterval(()=>{this.scrollLoop()},1000/this.frame.FPS)
        },
        stop(){
            this.playing = false
            this.recording = false
            clearTimeout(this.playTimeout)
            clearInterval(this.scrollInterval)
            this.playX = -1
            this.frameIndex = 0
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
        triggerAttackRelease(note){
            let v = this.stepVelocity(note.v)
            let duration = note.l*this.beatSec
            this.sampler[v].triggerAttackRelease(note.f,duration)
        },
        triggerSelection(shouldRelease=true){
            if(!this.activeNotes.length) return
            let firstNote = this.activeNotes[0]
            if(!this.activeNotes.every(n=>n.x==firstNote.x)) return
            for(let note of this.activeNotes){
                if(shouldRelease)
                    this.triggerAttackRelease(note)
                else
                    this.triggerAttack(note)
            }
        },
        clearSelection(){
            this.activeNotes.map(n=>{n.a=false})
            this.activeNotes = []
        },
        generateID(){
            return '_' + Math.random().toString(36).substr(2, 9)
        },
        pianoStart(y){
            // this.activeNotes.map(n=>{n.a=false})
            // this.activeNotes = []
            let newNote = {
                i:this.generateID(),
                a:true,
                x:this.playX-1,
                y:y,
                l:1,
                f:this.grid2freq(y),
                v:this.lastNote.v,
            }
            this.activeNotes.push(newNote)
            if(this.recording)
                this.notes.push(newNote)
            this.triggerAttack(newNote)
        },
        pianoEnd(y){
            if(this.recording){
                let idx = this.activeNotes.findIndex(n=>n.y==y)
                if(idx==-1) return
                let note = this.activeNotes[idx]
                note.a = false
                this.triggerRelease(note)
                this.activeNotes.splice(idx,1)
            }else{
                let idx = this.triggering.findIndex(n=>n.y==y)
                if(idx==-1) return
                let note = this.triggering[idx]
                this.triggerRelease(note)
            }
        },
        handleStart(e){
            let grid = this.getGrid(e.clientX,e.clientY)
            if(!grid) return 
            let {x,y,rx,ry} = grid
            let notes = this.notes.filter(n=>n.y==y).filter(n=>n.x<=x&&x<n.x+n.l)
            this.mouse = {active:true,x,y}
            if(e.button==0){
                if(this.ctrlKey){
                    this.clearSelection()
                    this.ranging = true
                    this.range.sx = x
                    this.range.sy = y
                }else if(notes.length){
                    this.addHistory()
                    // detect if in resize area
                    let {W} = this.grid
                    let note = notes[0]
                    let dx = rx-note.x*W
                    if(dx<this.resizeBuffer)
                        this.resizing = {dir:'left',note}
                    else if(dx>note.l*W-this.resizeBuffer)
                        this.resizing = {dir:'right',note}
                    if(!this.activeNotes.includes(note)){
                        this.clearSelection()
                        note.a = true
                        this.activeNotes = [note]
                    }
                    // move the note
                    if(!this.resizing){
                        this.moving = note
                        this.triggerSelection(false)
                    }
                }else{
                    this.activeNotes.map(n=>{n.a=false})
                    this.activeNotes = []
                    this.addHistory()
                    for(let oy of this.chords[this.chordType]){
                        let newNote = {
                            i:this.generateID(),
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
                    this.triggerSelection(false)
                }
            }else if(e.button==2){
                this.clearSelection()
                this.deleting = true
                if(notes.length){
                    this.addHistory()
                    this.notes = this.notes.filter(n=>n!=notes[0])
                }
            }
        },
        checkMovable(dx,dy){
            let {octave,measure} = this.grid
            let xs = this.activeNotes.map(n=>n.x+dx).every(x=>0<=x&&x<measure*4)
            let ys = this.activeNotes.map(n=>n.y+dy).every(y=>0<=y&&y<octave*12)
            return xs&&ys
        },
        setVelocity(e){
            let {x} = this.getGrid(e.clientX,e.clientY)
            let {vH} = this.grid
            let {top} = this.$refs['velocities'].getBoundingClientRect()
            let velocity = 127-this.minmax(parseInt((e.clientY-top)/vH*127),0,127)
            if(this.activeNotes.length)
                this.activeNotes.filter(n=>n.x<=x&&x<n.x+n.l)
                    .filter(n=>!this.triggering.includes(n))
                    .map(n=>n.v=velocity)
            else
                this.notes.filter(n=>n.x<=x&&x<n.x+n.l)
                    .filter(n=>!this.triggering.includes(n))
                    .map(n=>n.v=velocity)
        },
        handleMove(e){
            if(this.velociting) return this.setVelocity(e)
            let {x,y,rx,ry} = this.getGrid(e.clientX,e.clientY)
            if(x<0) return 
            let notes = this.notes.filter(n=>n.y==y).filter(n=>n.x<=x&&x<n.x+n.l)
            if(this.ticking){
                this.playX = x
                // this.cursor = 'col-resize'
            }else if(this.ranging){
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
                let dx = x-this.mouse.x
                let dy = y-this.mouse.y
                if(this.checkMovable(dx,dy)){
                    for(let note of this.activeNotes){
                        note.x += dx
                        note.y += dy
                        if(dy!=0){
                            this.triggerRelease(note)
                            note.f = this.grid2freq(note.y)
                        }
                    }
                }
            }else if(notes.length){
                // detect if in resize zone, and set cursor style
                let notes = this.notes.filter(n=>n.x<=x&&x<n.x+n.l).filter(n=>n.y==y)
                let {W} = this.grid
                let dx = rx-notes[0].x*W
                if(this.deleting){
                    this.addHistory()
                    this.notes = this.notes.filter(n=>n!=notes[0])
                }else if(this.velociting){
                    this.cursor = 'ns-resize'
                }else if(dx<this.resizeBuffer||dx>notes[0].l*W-this.resizeBuffer||this.resizing)
                    this.cursor = 'ew-resize'
                else
                    this.cursor = 'auto'
            }else{
                this.cursor = 'auto'
            }
            this.mouse.x = x
            this.mouse.y = y
        },
        handleEnd(e){
            if(this.recording){
                for(let note in this.activeNotes)
                    this.pianoEnd(note.y)
            }else if(this.ranging){
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
                    this.triggerRelease(n)
                    n.f = this.grid2freq(n.y)
                })
                let measure = Math.ceil(this.endX/4)+1
                if(measure>this.grid.measure) this.grid.measure = measure
                // this.notes.sort((a,b)=>a.x-b.x)
            }else{
                for(let note in this.triggering)
                    this.pianoEnd(note.y)
            }
            this.deleting = false
            this.velociting = false
            this.mouse.active = false
            this.ticking = false
        },
        copyNotes(){
            this.clipboard = JSON.parse(JSON.stringify(this.activeNotes))
        },
        pasteNotes(){
            this.addHistory()
            let minX = Math.min(...this.clipboard.map(n=>n.x))
            let startX = this.mouse.x
            let cloned = JSON.parse(JSON.stringify(this.clipboard))
            this.activeNotes.map(n=>{n.a=false})
            cloned.map(n=>{
                n.i = this.generateID()
                n.x+=startX-minX
            })
            this.notes.push(...cloned)
            this.activeNotes = cloned
        },
        deleteNotes(){
            this.addHistory()
            this.notes = this.notes.filter(n=>!this.activeNotes.includes(n))
            this.activeNotes = []
        },
        handleKeydown(e){
            switch(e.key.toUpperCase()){
                case 'SHIFT':
                    this.shiftKey = true; break
                case 'CONTROL':
                    this.ctrlKey = true; break
                case ' ':
                    e.preventDefault()
                    if(this.playing) this.stop()
                    else this.play()
                    break
                case 'A':
                    if(e.ctrlKey){
                        this.activeNotes = this.notes
                        this.activeNotes.map(n=>{n.a=true})
                    }
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
                case 'Z':
                    if(e.ctrlKey){
                        if(e.shiftKey) this.traceHistory(1)
                        else this.traceHistory(-1)
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
                lineHeight: H-2+'px',
                width: note.l*W-2+'px',
                background: note.a?'#FFA3A4':'#C4FACF',
                opacity: (note.v/127)*0.5+0.5,
            }
        },
        velStyle(note){
            let {W,H,vH} = this.grid
            return {
                bottom:note.v/127*vH+'px',
                left: note.x*W+'px',
                width: note.l*W+'px',
                height:'4px',
                background: note.a?'#FFA3A4':'#C4FACF',
            }
        },
        addHistory(msg=''){
            this.histories[this.historyIdx] = {
                msg, notes: JSON.parse(JSON.stringify(this.notes))
            }
            this.historyIdx++
            this.histories = this.histories.slice(0,this.historyIdx)
        },
        traceHistory(offset){
            if(offset<0&&!this.histories[this.historyIdx]){
                this.addHistory()
                this.historyIdx--
            }
            this.historyIdx = this.minmax(this.historyIdx+offset,0,this.histories.length-1)
            let {notes} = this.histories[this.historyIdx]
            this.notes = notes
            this.activeNotes = notes.filter(n=>n.a)
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
        beatSec(){
            let {beat} = this.grid
            let sec = 60/this.bpm/beat
            let floatPoint = 1e3
            return Math.round(sec*floatPoint)/floatPoint
        },
        endX(){
            let {beat,measure} = this.grid
            if(this.recording) return measure*beat
            let endX = Math.max(...this.notes.map(n=>n.x+n.l))
            endX = Math.ceil(endX/beat)*beat+1
            return endX
        },
        cursorStyle(){
            let {W} = this.grid
            let x = this.playX*W-(this.playing?W:0)
            let duration = this.playing?this.beatSec:0
            return {
                transform: `translateX(${x}px)`,
                transition: `transform ${duration}s linear`,
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
            let {H,W,octave,measure,beat} = this.grid
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
        },
    },
    mounted(){
        this.addHistory()
        // 互相綁定捲動事件
        let scrollBundles = ['scroll-x','ticks','velocities']
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