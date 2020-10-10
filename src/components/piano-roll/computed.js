export function scrollerNotes(){
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
}
export function ticks(){
    let {W,measure} = this.grid
    return Array.from(Array(measure).keys(),i=>{
        return this.ltr?
            { style: { width: W*4+'px' }, content: i+1 }:
            { style: { height: W*4+'px' }, content: i+1 }
    })
}
export function beatSec(){
    let {beat} = this.grid
    let sec = 60/this.bpm/beat
    let floatPoint = 1e3
    return Math.round(sec*floatPoint)/floatPoint
}
export function endX(){
    let {beat,measure} = this.grid
    if(this.recording) return measure*beat
    let endX = Math.max(...this.notes.map(n=>n.x+n.l))
    endX = Math.ceil(endX/beat)*beat+1
    return endX
}
export function cursorStyle(){
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
}
export function rangeStyle(){
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
}
export function pianoGrids(){
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
}
export function gridStyle(){
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
}