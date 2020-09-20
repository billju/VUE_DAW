<template lang="pug">
canvas(ref="canvas")
</template>

<script>
export default {
    name: '',
    data:()=>({
        events: {},ctx:{},
    }),
    props:{
        
    },
    methods:{
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
        },
        staticWaveform(peaks, offset=0, color='black'){
            const cy = this.canvas.height/2
            const max = Math.max(...peaks.map(peak=>Math.max(peak[0],-peak[1])))
            this.ctx.beginPath()
            this.ctx.moveTo(offset,cy)
            peaks.map((peak,i)=>{
                ctx.lineTo(offset+i,peak[0]*cy+cy)
                ctx.lineTo(offset+i,peak[1]*cy+cy)
            })
            this.ctx.strokeStyle = color
            this.ctx.lineWidth = 1
            this.ctx.stroke()
            this.ctx.closePath()
        },
        drawSmoothPath(ctx, points, rate=0.2){
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
        },
        spectrum(canvas){
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
        },
        spectrogram(canvas) { // by Jake Albaugh
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
        },
    },
    computed:{
        canvas(){
            return this.$refs['canvas']
        }
    },
    mounted(){
        this.ctx = this.$refs['canvas'].getContext('2d')
        this.events = {
            
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