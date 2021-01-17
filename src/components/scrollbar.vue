<template lang="pug">
.position-absolute(:style="scrollStyle" @mousedown="handleStart")
    .slider.position-absolute(:style="sliderStyle")
</template>

<script>
export default {
    name: 'scrollbar',
    data:()=>({
        active: false,
        last: 0,
    }),
    props:{
        ltr: Boolean,
        clientSize: Number,
        scrollSize: Number,
        value: Number,
        sliderSize: {
            type: Number,
            default: 22,
        }
    },
    methods:{
        minmax(input,min,max){return input>max?max:input<min?min:input},
        handleStart(e){
            e.stopPropagation()
            this.active = true
            this.last = this.ltr?e.clientX:e.clientY
            this.handleMove(e)
        },
        handleMove(e){
            if(this.active){
                let V = this.value
                let S = this.scrollSize
                let C = this.clientSize
                let diff = (this.ltr?e.clientX:e.clientY)-this.last
                let dv = diff*(S-C)/C
                let newV = this.minmax(V+dv,0,S-C)
                this.$emit('input', newV)
                if(newV!=V) this.last+= diff
            }
        }
    },
    computed:{
        scrollStyle(){
            return this.ltr?{
                bottom: 0, left: 0, right: 0, height: this.sliderSize+'px',
            }:{
                top: 0, bottom: 0, right: 0, width: this.sliderSize+'px',
            }
        },
        sliderStyle(){
            let V = this.value
            let S = this.scrollSize
            let C = this.clientSize
            let pct = this.minmax(V/(S-C),0,(S-C)/S)
            return this.ltr?{
                width: C/S*100+'%',
                height: this.sliderSize+'px',
                left: pct*100+'%',
            }:{
                height: C/S*100+'%',
                width: this.sliderSize+'px',
                top: pct*100+'%',
            }
        }
    },
    mounted(){
        this.events = {
            mousemove: e=>this.handleMove(e),
            mouseup: e=>this.active=false,
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
.slider{
    background: #0097a7;
}
.slider:hover{
    background: #00bcd4;
}
.slider:active{
    background: #4dd0e1;
}
</style>