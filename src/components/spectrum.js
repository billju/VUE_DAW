Vue.component('',{
    template:`

    `,
    data:()=>({
        events: {}
    }),
    props:{
        
    },
    methods:{
       
    },
    computed:{
        
    },
    mounted(){
        this.events = {
            
        }
        for(let name in this.events)
            window.addEventListener(name,this.events[name])
    },
    beforeDestroy(){
        for(let name in this.events)
            window.removeEventListener(name,this.events[name])
    },
})
function dynamicWaveform(canvas,audio){
    this.analyser = aCtx.createAnalyser()
    gain.connect(this.analyser)
    const ctx = canvas.getContext('2d')
    window.addEventListener('resize',e=>{
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
    })
    canvas.style.userSelect = 'none'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    const analyser = this.analyser
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    const getPeaks = (width, data)=>{
        let step = Math.floor(data.length/width)
        let peaks = []
        for(let i=0;i<width;i++){
            let batch = data.slice(i*step,(i+1)*step)
            let max = Math.max(...batch)
            let min = Math.min(...batch)
            peaks.push([max, min])
        }
        return peaks
    }
    const peaks = [], peakWidth = 10, peakFPS = 20
    let peakScrollRate = 10
    let mouseEvent = {active:false,x:0,paused:false}
    const handleStart = e=>{
        mouseEvent.active = true
        mouseEvent.x = e.clientX
        if(!audio.paused){
            audio.pause()
            mouseEvent.paused = true
        }
    }
    const handleMove = e=>{
        if(mouseEvent.active){
            let dx = e.clientX-mouseEvent.x
            mouseEvent.x = e.clientX
            audio.currentTime = audio.currentTime-dx/peakScrollRate/peakFPS
        }
    }
    const handleEnd = e=>{
        mouseEvent.active=false
        if(mouseEvent.paused){
            audio.play()
            mouseEvent.paused=false
        }
    }
    const handleWheel = e=>{
        peakScrollRate-= Math.sign(e.deltaY)
        peakScrollRate = peakScrollRate>20?20:peakScrollRate<1?1:peakScrollRate
    }
    canvas.addEventListener('mousedown', e=>handleStart(e))
    window.addEventListener('mousemove', e=>handleMove(e))
    window.addEventListener('mouseup', e=>handleEnd)
    window.addEventListener('mouseleave', e=>handleEnd)
    canvas.addEventListener('wheel', e=>handleWheel(e))
    loop()
    function loop(){
        window.requestAnimationFrame(loop)
        analyser.getByteTimeDomainData(data)
        let timeIndex = Math.floor(audio.currentTime*peakFPS)*peakWidth
        if(!mouseEvent.active){
            getPeaks(Math.ceil(peakWidth*audio.playbackRate), data).map((peak,i)=>{
                if(peaks[timeIndex+i]==undefined) peaks[timeIndex+i] = peak
            })
        }
        ctx.clearRect(0,0,canvas.width,canvas.height)
        ctx.beginPath()
        let moved = false
        for(let x=0;x<=canvas.width;x++){
            let i = timeIndex+Math.floor((x-canvas.width+1)*peakWidth/peakScrollRate)
            if(peaks[i]){
                let y0 = canvas.height*peaks[i][0]/256
                let y1 = canvas.height*peaks[i][1]/256
                if(moved){
                    ctx.lineTo(x,y0)
                }else{
                    ctx.moveTo(x,y0)
                    moved = true
                }
                ctx.lineTo(x,y1)
            }else{
                moved = false
            }
        }
        ctx.stroke()
        ctx.closePath()
        
        // timestamps
        let timestamps = [], interval = Math.max(Math.ceil(5/peakScrollRate),1)
        for(let x=-20;x<=canvas.width+20;x++){
            let i = timeIndex+Math.floor((x-canvas.width+1)*peakWidth/peakScrollRate)
            let seconds = i/peakWidth/peakFPS
            if(seconds%interval==0&&i>=0){
                timestamps.push({seconds,x})
            }
        }
        ctx.beginPath()
        ctx.font = "12px 微軟正黑體"
        ctx.fillStyle = 'white'
        for(let ts of timestamps){
            let format = ts.seconds<3600?'mm:ss':'hh:mm:ss'
            let text = getFormatTime(ts.seconds,format)
            let textWidth = ctx.measureText(text).width
            ctx.fillText(text,ts.x-textWidth/2,canvas.height-5)
            ctx.moveTo(ts.x,0)
            ctx.lineTo(ts.x,5)
            ctx.moveTo(ts.x,canvas.height-5)
            ctx.lineTo(ts.x,canvas.height)
        }
        ctx.stroke()
        ctx.closePath()
        // subtitles
        this.subtitles.map((subtitle,i,arr)=>{
            let startX = (subtitle.time-media.currentTime)*peakFPS*peakScrollRate+canvas.width
            let endX = i==arr.length-1?
                (media.duration-media.currentTime)*peakFPS*peakScrollRate+canvas.width:
                (arr[i+1].time-media.currentTime)*peakFPS*peakScrollRate+canvas.width
            return {startX,endX,text:subtitle.text}
        }).map((sub,i)=>{
            if(sub.text){
                ctx.fillStyle = this.colors[i%this.colors.length]
                ctx.fillRect(sub.startX,0,sub.endX-sub.startX,14)
                ctx.strokeStyle = 'white'
                ctx.strokeRect(sub.startX,0,sub.endX-sub.startX,14)
                ctx.fillStyle = 'white'
                ctx.fillText(sub.text,sub.startX+4,10)
            }
        })
    }
}
class waveformEditor{
    constructor(){
        
    }
    getPeaks(width, data){
        let step = Math.floor(data.length/width)
        let peaks = []
        for(let i=0;i<width;i++){
            let batch = data.slice(i*step,(i+1)*step)
            let max = Math.max(...batch)
            let min = Math.min(...batch)
            peaks.push([max, min])
        }
        return peaks
    }
    staticWaveform(canvas, peaks, offset=0, color='black'){
        const ctx = canvas.getContext('2d')
        const cy = canvas.height/2
        const max = Math.max(...peaks.map(peak=>Math.max(peak[0],-peak[1])))
        ctx.beginPath()
        ctx.moveTo(offset,cy)
        peaks.map((peak,i)=>{
            ctx.lineTo(offset+i,peak[0]*cy+cy)
            ctx.lineTo(offset+i,peak[1]*cy+cy)
        })
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.closePath()
    }
    waveformEditor(canvas, channelData){
        const ctx = canvas.getContext('2d')
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
        const cy = canvas.height/2
        const peaks = this.getPeaks(canvas.width, channelData)
        this.staticWaveform(canvas, peaks)
        const bound = {active:false,left:0,right:0,start:0}
        function drawBound(x,type, color='grey'){
            ctx.beginPath()
            ctx.moveTo(x,0)
            ctx.lineTo(x,canvas.height)
            ctx.fillStyle = color
            ctx.strokeStyle = color
            ctx.stroke()
            ctx.fill()
            ctx.closePath()
            ctx.fillRect(type=='left'?x-10:x,cy-15,10,30)
        }
        canvas.addEventListener('contextmenu',e=>{
            e.preventDefault()
        })
        canvas.addEventListener('mousedown',e=>{
            var LEFT=1,MID=2,RIGHT=3
            if(e.which==RIGHT){
                bound.active = true
                bound.start = bound.left = bound.right = Math.floor(e.clientX-canvas.offsetLeft)
                ctx.clearRect(0,0,canvas.width,canvas.height)
                this.staticWaveform(canvas, peaks)
            }
        })
        canvas.addEventListener('mousemove',e=>{
            if(bound.active){
                const left = Math.floor(e.clientX-canvas.offsetLeft)
                ctx.clearRect(0,0,canvas.width,canvas.height)
                this.staticWaveform(canvas, peaks)
                if(left>bound.start){
                    bound.left = bound.start
                    bound.right = left
                }else{
                    bound.left = left
                    bound.right = bound.start
                }
                drawBound(bound.left,'left')
                drawBound(bound.right,'right')
                this.staticWaveform(canvas, peaks.slice(bound.left, bound.right), bound.left, 'dodgerblue')
            }
        })
        canvas.addEventListener('mouseup',e=>{
            bound.active = false
        })
        canvas.addEventListener('mouseleave',e=>{
            bound.active = false
        })
    }
}
function spectrum(canvas){
    this.analyser = aCtx.createAnalyser()
    gain.connect(this.analyser)
    this.analyser.connect(aCtx.destination)
    window.addEventListener('resize',e=>{
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
    })
    const ctx = canvas.getContext('2d')
    this.analyser.fftSize = 256
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    let bufferLength = this.analyser.frequencyBinCount
    loop()
    function loop(){
        this.analyser.getByteFrequencyData(data)
        let gradient = ctx.createLinearGradient(0,0,0,canvas.height)
        gradient.addColorStop(1,'white')
        gradient.addColorStop(0,'dodgerblue')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        let points = []
        let barWidth = canvas.width/(bufferLength-2)
        for(var i=0;i<bufferLength;i++){
            let barHeight = data[i]/256*canvas.height
            // ctx.fillRect(i*barWidth,canvas.height-barHeight,barWidth,barHeight)
            points.push([i*barWidth,canvas.height-barHeight])
        }
        ctx.beginPath()
        ctx.moveTo(0,0)
        drawSmoothPath(ctx,points,0.2)
        ctx.lineTo(points[points.length-1][0],0)
        ctx.fillStyle = 'white'
        ctx.fill()
        ctx.closePath()
        window.requestAnimationFrame(loop);
    }
}
function spectrogram(canvas) { // by Jake Albaugh
    this.analyser = aCtx.createAnalyser()
    gain.connect(this.analyser)
    const ctx = canvas.getContext('2d')
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    const h = canvas.height / data.length;
    const x = canvas.width - 1;
    ctx.fillStyle = 'hsl(280, 100%, 10%)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    loop();
    function loop() {
        let imgData = ctx.getImageData(1, 0, canvas.width - 1, canvas.height);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imgData, 0, 0);
        this.analyser.getByteFrequencyData(data);
        for (let i = 0; i < data.length; i++) {
            let rat = data[i] / 255;
            let hue = Math.round((rat * 120) + 280 % 360);
            let sat = '100%';
            let lit = 10 + (70 * rat) + '%';
            ctx.beginPath();
            ctx.strokeStyle = `hsl(${hue}, ${sat}, ${lit})`;
            ctx.moveTo(x, canvas.height - (i * h));
            ctx.lineTo(x, canvas.height - (i * h + h));
            ctx.stroke();
        }
        window.requestAnimationFrame(loop);
    }
}
function drawSmoothPath(ctx, points, rate=0.2){
    const add = (p1,p2)=>( [p1[0]+p2[0], p1[1]+p2[1]] )
    const subtract = (p1,p2)=>( [p1[0]-p2[0], p1[1]-p2[1]] )
    const curveTo = (p1,p2,p3)=>{ctx.bezierCurveTo(p1[0],p1[1],p2[0],p2[1],p3[0],p3[1])}
    let cp = [] //control point
    for(let i=0;i<points.length-2;i++){
        let p = subtract(points[i+2],points[i])
        cp.push([Math.round(p[0]*rate), Math.round(p[1]*rate)])
    }
    points.map((p,i,ps)=>{
        switch(i){
            case 0:
                ctx.lineTo(p[0],p[1]); break;
            case 1:
                curveTo(ps[0], subtract(p,cp[i-1]), p); break;
            case ps.length-1:
                curveTo(add(ps[i-1],cp[i-2]), p, p); break;
            default:
                curveTo(add(ps[i-1],cp[i-2]), subtract(p,cp[i-1]), p); break;
        }
    })
}
function oscilloscope(canvas){
    this.analyser = aCtx.createAnalyser()
    gain.connect(this.analyser)
    window.addEventListener('resize',e=>{
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
    })
    const ctx = canvas.getContext('2d')
    this.analyser.fftSize = 2048
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    loop()
    function loop(){
        window.requestAnimationFrame(loop);
        this.analyser.getByteTimeDomainData(data)
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2
        ctx.strokeStyle = 'white'
        ctx.beginPath()
        for(var i=0;i<this.analyser.frequencyBinCount;i++){
            var x = i / this.analyser.frequencyBinCount * canvas.width
            var y = data[i] / 256 * canvas.height
            if(i==0){
                ctx.moveTo(x,y)
            }else{
                ctx.lineTo(x,y)
            }
        }
        ctx.lineTo(canvas.width,canvas.height/2)
        ctx.stroke()
        ctx.closePath()
    }
}