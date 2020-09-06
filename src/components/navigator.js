/* camera */
const FRONTCAM = 'user', BACKCAM = 'environment'
var constraints = {
    video:{
        frameRate:{ideal:10,max:15},
        facingMode: FRONTCAM
    },
    audio:true
}
navigator.mediaDevices.getUserMedia(constraints).then((stream)=>{
    var video = document.getElementById('video')
    video.srcObject = stream
    video.onloadedmetadata = e=>{
        video.play()
    }
    document.getElementById('stop-btn').onclick=e=>{
        stream.getTracks().forEach(track=>{track.stop()})
    }
})

/* MIDI */
if(navigator.requestMIDIAccess){
    navigator.requestMIDIAccess().then((midiAccess)=>{
        var inputs = midiAccess.inputs
        var outputs = midiAccess.outputs
        for(let input of midiAccess.inputs.values()){
            input.onmidimessage = getMIDIMessage
        }
    },()=>{console.log('could not access MIDI devices')})
}
function getMIDIMessage(msg){
    let command = msg.data[0]
    let note = msg.data[1]
    let velocity = msg.data.length>2?msg.data[2]:0
    switch(command){
        case 144: //note on
            noteOn(note,velocity)
            break
        case 128: //note off
            noteOff(note,velocity)
            break;
    }
}
function noteOn(note,velocity){
    console.log(`note ${note} velocity ${velocity}`)
}
function noteOff(note,velocity){
    console.log(`note ${note} velocity ${velocity}`)
}
/* touch pointer */
var pe = [], prevDiff = 0
window.onpointerdown = e=>{
    pe.push(e)
    if(pe.length==2){
        let dx = pe[0].clientX-pe[1].clientX
        let dy = pe[0].clientY-pe[1].clientY
        prevDiff = Math.sqrt(dx*dx+dy*dy)
    }
}
window.onpointermove = e=>{
    if(pe.length==2){
        let dx = pe[0].clientX-pe[1].clientX
        let dy = pe[0].clientY-pe[1].clientY
        let diff = Math.sqrt(dx*dx+dy*dy)
        console.log(diff/prevDiff)
    }
}
const handlePointerup = e=>{
    pe = []
}
window.onpointerup = handlePointerup
window.onpointercancel = handlePointerup
window.onpointerout = handlePointerup
window.onpointerleave = handlePointerup