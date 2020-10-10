<template lang="pug">
.d-flex.flex-grow-1(:class="ltr?'flex-column':''" style="user-select:none" :style="{cursor}")

    .d-flex.flex-shrink-0.bg-dark(:class="ltr?'pr-3':'flex-column-reverse'")
        .btn.btn-dark.p-0(:style="{flex:`0 0 ${grid.whiteKey}px`,writingMode:ltr?'horizontal-tb':'vertical-lr'}" @click="toggleDisplay()") {{ltr?'編輯':'練琴'}}
        .flex-grow-1.overflow-auto.hide-scrollbar(ref="ticks" :style="ltr?{width:0}:{height:0}")
            .position-relative.text-light(:style="ltr?{width:gridStyle.width}:{height:gridStyle.height}")
                .d-flex(:class="ltr?'':'flex-column-reverse'" @wheel="scaleX($event)" @mousedown="ticking=true;handleMove($event)")
                    .text-right(v-for="tick,ti in ticks" :key="ti" :style="tick.style") {{tick.content}}
                i.fa.position-absolute.text-warning(:class="ltr?'fa-chevron-down':'fa-chevron-right'" 
                    :style="ltr?{...cursorStyle,marginLeft:'-6px'}:{...cursorStyle,marginBottom:'-6px'}")
                    
    .d-flex.flex-grow-1.position-relative(:class="ltr?'':'flex-column-reverse hide-scrollbar'" 
            :style="ltr?{height:0,overflowY:'scroll'}:{width:0,overflowX:'scroll'}" @contextmenu.prevent="")

        .flex-shrink-0.position-relative(@wheel="scaleY($event)" 
                :style="ltr?{width:grid.whiteKey+'px'}:{width:gridStyle.width,height:grid.whiteKey+'px'}")
            .position-absolute.text-dark(v-for="pG,pi in pianoGrids" :key="pi" :style="pG.style" :class="pG.class" @mousedown="pianoStart(grid2midi(pi))") {{pG.content}}
            
        .flex-grow-1.overflow-auto.hide-scrollbar(ref="scroller" 
                :style="ltr?{height:gridStyle.height,width:0}:{width:gridStyle.width,height:0}" 
                @wheel="handleWheel($event)" @mousedown="handleStart($event)")
            .position-relative.overflow-hidden(:style="gridStyle")
                transition-group(name="fade")
                    small.text-center(v-for="note in scrollerNotes" :key="note.i" :style="noteStyle(note)") {{note.l*grid.W>30&&grid.H>14?grid2note(note.y):''}}
                .position-absolute(:style="rangeStyle")
                .position-absolute.border.border-warning(:class="ltr?'h-100':'w-100'" :style="cursorStyle")
                transition-group(name="fade")
                    .position-absolute.h-100(v-if="!ltr" v-for="note in triggering" :key="'trig'+note.i" :style="trigStyle(note)")

    .d-flex.flex-shrink-0.bg-dark(:class="ltr?'pr-3':'flex-column-reverse'")
        .overflow-auto.hide-scrollbar(:style="{flex:`0 0 ${grid.whiteKey}px`,maxHeight:grid.vH+22+'px'}")
            .small.text-center(v-for="val,name in chords" :key="name" @click="chordType=name" 
                :class="chordType==name?'text-light bg-secondary':'text-muted bg-dark'") {{name}}
        .flex-grow-1.overflow-auto(ref="velocities" :style="ltr?{width:0}:{height:0}")
            .position-relative(
                :style="ltr?{width:gridStyle.width,height:grid.vH+4+'px'}:{width:grid.vH+4+'px',height:gridStyle.height}" 
                    @mousedown="velociting=true;setVelocity($event)")
                .position-absolute(v-for="note in scrollerNotes" :key="note.i" :style="velStyle(note)")
</template>

<script>

export default {
    name: 'piano-roll',
    data:()=>({
        // width height  八度 小節
        grid: {W:20,H:20,octave:8,measure:32,beat:4,vH:48,blackKey:30,whiteKey:60},
        ltr: true, metronome: false, scrollTop:0, scrollLeft: 0,
        lastNote: {a:false,x:0,y:0,l:1,f:440,v:30},
        // active grid-x grid-y length frequency velocity delay
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
        triggering: [], // 以觸發的音訊
        playX: -1, lastX: -1,
        playTimeout: null, scrollInterval: null, freezeScroll: false,
        frame:{from:0,to:0,num:0,den:1,FPS:30},
        historyIdx:0, histories: [],
        events: {},
    }),
    props:{
        bpm: {type:Number,default:128},
        tracks: {type:Array,default:()=>([])},
        trackIndex: {type:Number,default:128},
    },
    methods:{
        // utils
        minmax(input,min,max){return input>max?max:input<min?min:input},
        generateID(){
            return '_' + Math.random().toString(36).substr(2, 9)
        },
        grid2note(y){
            let {octave} = this.grid
            let notes = ['B','A#','A','G#','G','F#','F','E','D#','D','C#','C']
            let note = notes[y%12]+Math.floor((octave*12-y-1)/12)
            return note
        },
        midi2grid(midi){return this.grid.octave*12-midi+11},
        grid2midi(y){return this.grid.octave*12-y+11},
        grid2freq(y){
            let midi = this.grid2midi(y)
            let freq = 440*Math.pow(2,(midi-69)/12)
            return Math.round(freq)
        },
        getGrid(cx,cy){
            let {scrollLeft,scrollTop} = this.$refs['scroller']
            let {top,left,right} = this.$refs['scroller'].getBoundingClientRect()
            let {W,H,octave,measure} = this.grid
            if(this.ltr){
                let rx = cx-left+scrollLeft
                let ry = cy-top
                let x = Math.floor(rx/W)
                let y = Math.floor(ry/H)
                return {x,y,rx,ry}
            }else{
                let rx = parseInt(this.gridStyle.height)-cy-scrollTop+top
                let ry = right-cx
                let x = Math.floor(rx/W)
                let y = Math.floor(ry/H)
                return {x,y,rx,ry}
            }
        },
        checkMovable(dx,dy){
            let {octave,measure} = this.grid
            let xs = this.activeNotes.map(n=>n.x+dx).every(x=>0<=x&&x<measure*4)
            let ys = this.activeNotes.map(n=>n.y+dy).every(y=>0<=y&&y<octave*12)
            return xs&&ys
        },
        // mouse-events
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
        handleWheel(e){
            if(this.shiftKey){
                this.$refs['scroller'].scrollLeft+= Math.sign(e.deltaY)*100
            }else if(!this.ltr&&!(this.freezeScroll&&this.playing)){
                e.preventDefault();
                this.$refs['scroller'].scrollTop+= Math.sign(e.deltaY)*150
            }
        },
        resizeStart(dir,note){
            if(!this.activeNotes.includes(note))
                this.activeNotes = [note]
            this.resizing = {dir,note}
        },
        setVelocity(e){
            let {x} = this.getGrid(e.clientX,e.clientY)
            let {vH} = this.grid
            let {top,left} = this.$refs['velocities'].getBoundingClientRect()
            let px = this.ltr?e.clientY-top:e.clientX-left
            let velocity = 127-this.minmax(parseInt(px/vH*127),0,127)
            let notes = this.activeNotes.length?this.activeNotes:this.notes
            notes.filter(n=>n.x<=x&&x<n.x+n.l)
                .filter(n=>!this.triggering.includes(n))
                .map(n=>n.v=velocity)
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
                    this.notes.splice(this.notes.findIndex(n=>n==notes[0]), 1)
                }
            }
        },
        handleMove(e){
            if(this.velociting) return this.setVelocity(e)
            let {x,y,rx,ry} = this.getGrid(e.clientX,e.clientY)
            if(x<0) return 
            let notes = this.notes.filter(n=>n.y==y).filter(n=>n.x<=x&&x<n.x+n.l)
            if(this.ticking){
                this.playX = this.lastX = x
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
                    this.notes.splice(this.notes.findIndex(n=>n==notes[0]), 1)
                }else if(this.velociting){
                    this.cursor = this.ltr?'ns-resize':'ew-resize'
                }else if(dx<this.resizeBuffer||dx>notes[0].l*W-this.resizeBuffer||this.resizing)
                    this.cursor = this.ltr?'ew-resize':'ns-resize'
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
                    this.pianoEnd(this.grid2midi(note.y))
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
                    this.pianoEnd(this.grid2midi(note.y))
            }
            this.deleting = false
            this.velociting = false
            this.mouse.active = false
            this.ticking = false
        },
        // commands
        scrollLoop(){
            let {from,to,num,den,FPS} = this.frame
            if(this.freezeScroll){
                let progress = num/den
                let x = progress*to+(1-progress)*from
                if(this.ltr){
                    this.$refs['scroller'].scrollLeft = x
                }else{
                    let scrollHeight = parseInt(this.gridStyle.height)-this.$refs['scroller'].clientHeight
                    this.$refs['scroller'].scrollTop = scrollHeight-x
                }
                if(num<den) this.frame.num++
            }
        },
        playLoop(){
            let {measure,W} = this.grid
            // animation first
            this.frame = {
                from: this.playX*W,
                to: (this.playX+1)*W,
                num: 0,
                den: this.frame.FPS*this.beatSec,
                FPS: this.frame.FPS
            }
            // async second
            clearTimeout(this.playTimeout)
            if(this.playX>this.endX)
                return this.stop()
            else
                this.playTimeout = setTimeout(()=>{
                    this.playX++
                    this.playLoop()
                },this.beatSec*1000)
            // time consuming process
            if(this.recording){
                for(let note of this.activeNotes)
                    note.l = this.playX - note.x
                this.$emit('mic-sample')
            }else{
                for(let note of this.notes){
                    if(note.x==this.playX){
                        let isDrum = false
                        // let drums = {36:'C2',38:'D2',44:'G#2',43:'G2',45:'A2',47:'B2'}
                        // let midi = this.grid2midi(note.y)
                        // for(let key in drums){if(midi==key){this.drum.triggerAttackRelease(drums[key],'8n',undefined,note.v/127);isDrum=true;break;}}
                        if(!isDrum){
                            this.triggerAttackRelease(note)
                            this.triggering.push(note)
                        }
                    }
                }
                for(let note of this.triggering){
                    if(note.x+note.l==this.playX-1)
                        this.triggering = this.triggering.filter(n=>n!=note)
                }
            }
            if(this.metronome&&this.playX%4==0) this.$emit('metronome',this.playX%16==0?'F5':'F4')
        },
        record(){
            for(let note of this.activeNotes)
                note.a = false
            if(this.metronome) this.playX = this.lastX-16
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
            this.frameIndex = 0
            this.playX = this.lastX
            clearTimeout(this.playTimeout)
            clearInterval(this.scrollInterval)            
            for(let note of this.triggering)
                this.triggerRelease(note)
        },
        randomVelocity(){
            this.notes.filter(n=>!this.triggering.includes(n))
                .map(n=>n.v=Math.round(Math.random()*100+27))
        },
        async toggleDisplay(){
            this.ltr=!this.ltr
            this.grid.H=20;
            await this.$nextTick();
            let scrollHeight = parseInt(this.gridStyle.height)-this.$refs['scroller'].clientHeight
            this.$refs['scroller'].scrollTop = scrollHeight
        },
        triggerAttack(note){
            this.instrument.triggerAttack(note.f,undefined,note.v/127)
            this.triggering.push(note)
        },
        triggerRelease(note){
            this.instrument.triggerRelease(note.f)
            this.triggering =  this.triggering.filter(n=>n!=note)
        },
        triggerAttackRelease(note){
            let duration = note.l*this.beatSec
            this.instrument.triggerAttackRelease(note.f,duration,undefined,note.v/127)
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
        pianoStart(midi,v=60){
            let y = this.midi2grid(midi)
            let newNote = {
                i:this.generateID(),
                a:true,
                x:this.playX-1,
                y:y,
                l:1,
                f:this.grid2freq(y),
                v:v,
            }
            this.activeNotes.push(newNote)
            if(this.recording)
                this.notes.push(newNote)
            this.triggerAttack(newNote)
        },
        pianoEnd(midi){
            let y = this.midi2grid(midi)
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
            let indexArr = []
            this.$emit('notes', this.notes.filter(n=>!this.activeNotes.includes(n)))
            this.activeNotes = []
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
            this.$emit('notes', notes)
            this.activeNotes = notes.filter(n=>n.a)
        },
    // key-events
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
        // styles
        noteStyle(note){
            let {W,H} = this.grid
            let alpha = (note.v/127)*0.5+0.5
            let activeColor = `rgba(255, 163, 164, ${alpha})`
            let [r,g,b] = [196,250,207]
            let bgc = note.a?activeColor:`rgba(${r}, ${g}, ${b}, ${alpha})`
            return this.ltr?{
                position: 'absolute',
                background: bgc,
                top: note.y*H+'px',
                left: note.x*W+'px',
                height: H-2+'px',
                lineHeight: H-2+'px',
                width: note.l*W-2+'px',
            }:{
                position: 'absolute',
                background: bgc,
                right: note.y*H+'px',
                bottom: note.x*W+'px',
                width: H-2+'px',
                lineHeight: H-2+'px',
                height: note.l*W-2+'px',
                writingMode: 'vertical-lr',
            }
        },
        velStyle(note){
            let {W,H,vH} = this.grid
            return this.ltr?{
                bottom:note.v/127*vH+'px',
                left: note.x*W+'px',
                width: note.l*W+'px',
                height:'4px',
                background: note.a?'#FFA3A4':'#C4FACF',
            }:{
                right:note.v/127*vH+'px',
                bottom: note.x*W+'px',
                height: note.l*W+'px',
                width:'4px',
                background: note.a?'#FFA3A4':'#C4FACF',
            }
        },
        trigStyle(note){
            let { H } = this.grid
            return {
                top:0, width:H+'px',
                right: H*note.y+'px',
                background: 'rgba(255, 193, 7, 0.1)'
            }
        },
    },
    computed:{
        notes(){
            return this.tracks[this.trackIndex]?this.tracks[this.trackIndex].notes:[]
        },
        instrument(){
            return this.tracks[this.trackIndex].instrument
        },
        scrollerNotes(){
            let {clientWidth,clientHeight} = this.$refs['scroller']??{}
            let { W } = this.grid
            if(this.ltr){
                let minX = Math.floor(this.scrollLeft/W)
                let maxX = Math.ceil((this.scrollLeft+clientWidth)/W)
                return this.notes.filter(n=>minX<=n.x+n.l&&n.x<=maxX)
            }else{
                let scrollBottom = parseInt(this.gridStyle.height)-this.scrollTop
                let minX = Math.floor((scrollBottom-clientHeight)/W)
                let maxX = Math.ceil(scrollBottom/W)
                return this.notes.filter(n=>minX<=n.x+n.l&&n.x<=maxX)
            }
        },
        ticks(){
            let {W,measure} = this.grid
            return Array.from(Array(measure).keys(),i=>{
                return this.ltr?
                    { style: { width: W*4+'px' }, content: i+1 }:
                    { style: { height: W*4+'px' }, content: i+1 }
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
            let x = this.playX*W
            let duration = this.playing?this.beatSec:0
            return this.ltr?{
                top: 0, left: 0, 
                transform: `translateX(${x}px)`,
                transition: `transform ${duration}s linear`,
            }:{
                bottom: 0, left: 0,
                transform: `translateY(${-x}px)`,
                transition: `transform ${duration}s linear`,
            }
        },
        rangeStyle(){
            let {sx,sy,ex,ey} = this.range
            if(ex<sx) sx = [ex,ex=sx][0]
            if(ey<sy) sy = [ey,ey=sy][0]
            let {W,H} = this.grid
            return this.ranging?this.ltr?{
                position: 'absolute',
                top: sy*H+'px',
                left: sx*W+'px',
                height: (ey-sy)*H+'px',
                width: (ex-sx)*W+'px',
                border: '5px dashed dodgerblue'
            }:{
                position: 'absolute',
                right: sy*H+'px',
                bottom: sx*W+'px',
                width: (ey-sy)*H+'px',
                height: (ex-sx)*W+'px',
                border: '5px dashed dodgerblue'
            }:{
                display: 'none'
            }
        },
        pianoGrids(){
            let {H,whiteKey,blackKey,octave} = this.grid
            let blacks = [1,3,5,8,10]
            let top = 0
            let len = octave*12
            return Array.from(Array(len).keys(),i=>{
                let isBlack = blacks.includes(i%12)
                let height = isBlack?H:i%12<7?H*7/4:H*5/3
                if(i>0&&!isBlack) top+= height
                let freq = this.grid2freq(i)
                let isTriggered = this.triggering.some(n=>n.f==freq)
                return this.ltr?{
                    class: isTriggered?'bg-warning':isBlack?'bg-dark':'bg-light',
                    style:{
                        width: (isBlack?blackKey:whiteKey)+'px',
                        top: (isBlack?top+H:top)+'px',
                        left: 0,
                        zIndex: isBlack?666:66,
                        boxShadow: isBlack?'2px 0 white':'0 -2px black',
                        height: height+'px',
                        lineHeight: height+'px',
                        textAlign: isBlack?'left':'right',
                        padding: '0px 4px',
                    },
                    content: isBlack?'':this.grid2note(i)
                }:{
                    class: isTriggered?'bg-warning':isBlack?'bg-dark':'bg-light',
                    style:{
                        height: (isBlack?blackKey+10:whiteKey)+'px',
                        right: (isBlack?H*i:top)+'px',
                        top: 0,
                        zIndex: isBlack?666:66,
                        boxShadow: isBlack?'':'2px 0 black',
                        width: height+'px',
                    },
                    content: ''
                }
            })
        },
        gridStyle(){
            let {H,W,octave,measure,beat} = this.grid
            let ltr = this.ltr
            let pattern = (c1,px1,c2,px2,i)=>`${c1} ${px1*i}px, ${c1} ${px1*(i+1)-px2}px, ${c2} ${px1*(i+1)-px2}px, ${c2} ${px1*(i+1)}px`
            let thin = i=>pattern('transparent',W,'#42545F',1,i)
            let thick = i=>pattern('transparent',W,'#29373F',3,i)
            let black = i=>pattern('#394B56',H,'#29373F',2,i)
            let white = i=>pattern('#42545F',H,'#29373F',2,i)
            return {
                width: (ltr?W*4*measure:H*12*octave)+'px',
                height: (ltr?H*12*octave:W*4*measure)+'px',
                background: 
                    `repeating-linear-gradient(to ${ltr?'right':'top'}, ${thin(0)}, ${thin(1)}, ${thin(2)}, ${thick(3)}), `+
                    `repeating-linear-gradient(to ${ltr?'bottom':'left'}, `+ 
                    `${white(0)}, ${black(1)}, ${white(2)}, ${black(3)}, ${white(4)}, ${black(5)}, ${white(6)}, ${white(7)}, ${black(8)}, ${white(9)}, ${black(10)}, ${white(11)})`
            }
        },
    },
    mounted(){
        this.addHistory()
        // 互相綁定捲動事件
        let scrollBundles = ['scroller','ticks','velocities']
        for(let ref of scrollBundles){
            this.$refs[ref].addEventListener('scroll',()=>{
                let {scrollLeft, scrollTop} = this.$refs[ref]
                this.scrollLeft = scrollLeft
                this.scrollTop = scrollTop
                for(let r of scrollBundles.filter(r=>r!=ref)){
                    if(this.ltr)
                        this.$refs[r].scrollLeft = scrollLeft
                    else
                        this.$refs[r].scrollTop = scrollTop
                }
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
/* .fade-enter-active{
    opacity: 0.6;
    transition: opacity 0.1s ease-in;
} */
.fade-leave-active {
    transition: opacity 0.3s;
}
.fade-leave-to{
    opacity: 0;
}
</style>