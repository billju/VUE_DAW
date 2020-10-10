export function noteStyle(note){
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
}
export function velStyle(note){
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
}
export function trigStyle(note){
    let { H } = this.grid
    return {
        top:0, width:H+'px',
        right: H*note.y+'px',
        background: 'rgba(255, 193, 7, 0.1)'
    }
}