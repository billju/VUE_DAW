export function handleStart(e){
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
}
export function handleMove(e){
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
            this.notes = this.notes.filter(n=>n!=notes[0])
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
}
export function handleEnd(e){
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
}
export function setVelocity(e){
    let {x} = this.getGrid(e.clientX,e.clientY)
    let {vH} = this.grid
    let {top,left} = this.$refs['velocities'].getBoundingClientRect()
    let px = this.ltr?e.clientY-top:e.clientX-left
    let velocity = 127-this.minmax(parseInt(px/vH*127),0,127)
    if(this.activeNotes.length)
        this.activeNotes.filter(n=>n.x<=x&&x<n.x+n.l)
            .filter(n=>!this.triggering.includes(n))
            .map(n=>n.v=velocity)
    else
        this.notes.filter(n=>n.x<=x&&x<n.x+n.l)
            .filter(n=>!this.triggering.includes(n))
            .map(n=>n.v=velocity)
}
export function scaleX(e,arg){
    e.preventDefault()
    let delta = Math.sign(e.deltaY)*2
    this.grid.W = this.minmax(this.grid.W-delta,10,50)
}
export function scaleY(e,arg){
    e.preventDefault()
    let delta = Math.sign(e.deltaY)*2
    this.grid.H = this.minmax(this.grid.H-delta,10,30)
}
export function handleWheel(e){
    if(this.shiftKey){
        this.$refs['scroller'].scrollLeft+= Math.sign(e.deltaY)*100
    }else if(!this.ltr&&!(this.freezeScroll&&this.playing)){
        e.preventDefault();
        this.$refs['scroller'].scrollTop+= Math.sign(e.deltaY)*150
    }
}