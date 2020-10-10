export function handleKeydown(e){
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
}
export function handleKeyup(e){
    switch(e.key.toUpperCase()){
        case 'SHIFT':
            this.shiftKey = false; break
        case 'CONTROL':
            this.ctrlKey = false; break
        default: break;
    }
}
export function resizeStart(dir,note){
    if(!this.activeNotes.includes(note))
        this.activeNotes = [note]
    this.resizing = {dir,note}
}