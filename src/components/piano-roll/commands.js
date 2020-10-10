export function triggerAttack(note){
    this.sampler.triggerAttack(note.f,undefined,note.v/127)
    this.triggering.push(note)
}
export function triggerRelease(note){
    this.sampler.triggerRelease(note.f)
    this.triggering =  this.triggering.filter(n=>n!=note)
}
export function triggerAttackRelease(note){
    let duration = note.l*this.beatSec
    this.sampler.triggerAttackRelease(note.f,duration,undefined,note.v/127)
}
export function triggerSelection(shouldRelease=true){
    if(!this.activeNotes.length) return
    let firstNote = this.activeNotes[0]
    if(!this.activeNotes.every(n=>n.x==firstNote.x)) return
    for(let note of this.activeNotes){
        if(shouldRelease)
            this.triggerAttackRelease(note)
        else
            this.triggerAttack(note)
    }
}

export function copyNotes(){
    this.clipboard = JSON.parse(JSON.stringify(this.activeNotes))
}
export function pasteNotes(){
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
}
export function deleteNotes(){
    this.addHistory()
    this.notes = this.notes.filter(n=>!this.activeNotes.includes(n))
    this.activeNotes = []
}
export function addHistory(msg=''){
    this.histories[this.historyIdx] = {
        msg, notes: JSON.parse(JSON.stringify(this.notes))
    }
    this.historyIdx++
    this.histories = this.histories.slice(0,this.historyIdx)
}
export function traceHistory(offset){
    if(offset<0&&!this.histories[this.historyIdx]){
        this.addHistory()
        this.historyIdx--
    }
    this.historyIdx = this.minmax(this.historyIdx+offset,0,this.histories.length-1)
    let {notes} = this.histories[this.historyIdx]
    this.notes = notes
    this.activeNotes = notes.filter(n=>n.a)
}
export function clearSelection(){
    this.activeNotes.map(n=>{n.a=false})
    this.activeNotes = []
}
export function record(){
    for(let note of this.activeNotes)
        note.a = false
    if(this.metronome) this.playX = this.lastX-16
    this.activeNotes = []
    this.recording = true
    this.play()
}
export function scrollLoop(){
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
}
export function play(){
    if(this.playing) return
    this.playing = true
    this.playLoop()
    this.scrollInterval = setInterval(()=>{this.scrollLoop()},1000/this.frame.FPS)
}
export function stop(){
    this.playing = false
    this.recording = false
    this.frameIndex = 0
    this.playX = this.lastX
    clearTimeout(this.playTimeout)
    clearInterval(this.scrollInterval)            
    for(let note of this.triggering)
        this.triggerRelease(note)
}
export function randomVelocity(){
    this.notes.filter(n=>!this.triggering.includes(n))
        .map(n=>n.v=Math.round(Math.random()*100+27))
}
export async function toggleDisplay(){
    this.ltr=!this.ltr
    this.grid.H=20;
    await this.$nextTick();
    let scrollHeight = parseInt(this.gridStyle.height)-this.$refs['scroller'].clientHeight
    this.$refs['scroller'].scrollTop = scrollHeight
}