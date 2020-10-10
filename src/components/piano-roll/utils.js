export function minmax(input,min,max){return input>max?max:input<min?min:input}
export function generateID(){
    return '_' + Math.random().toString(36).substr(2, 9)
}
export function grid2note(y){
    let {octave} = this.grid
    let notes = ['B','A#','A','G#','G','F#','F','E','D#','D','C#','C']
    let note = notes[y%12]+Math.floor((octave*12-y-1)/12)
    return note
}
export function midi2grid(midi){return this.grid.octave*12-midi+11}
export function grid2midi(y){return this.grid.octave*12-y+11}
export function grid2freq(y){
    let midi = this.grid2midi(y)
    let freq = 440*Math.pow(2,(midi-69)/12)
    return Math.round(freq)
}
export function getGrid(cx,cy){
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
}