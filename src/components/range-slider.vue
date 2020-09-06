<template lang="pug">
.bg-secondary.position-relative(ref="container" 
    @mousedown="handleStart($event)" style="cursor:pointer")
    .w-100.position-absolute(:style="rangeStyle")
</template>

<script>
export default {
    name: 'range-slider',
    data:()=>({
        events: {}, active: false,
    }),
    props:{
        value: {type:Number,default:50},
        theme: {type:String,default:'#C4FACF'},
    },
    methods:{
        minmax(input,min,max){return input>max?max:input<min?min:input},
        handleStart(e){
            this.active = true
        },
        handleMove(e){
            if(this.active){
                let {top,left,height,width} = this.$refs['container'].getBoundingClientRect()
                let pct = 100-(e.clientY-top)/height*100
                pct = this.minmax(pct,0,100)
                this.$emit('input',pct)
            }
        },
        handleEnd(e){
            this.active = false
        }
    },
    computed:{
        rangeStyle(){
            let pct = this.minmax(this.value,0,100)
            return {
                background: this.theme,
                height: `${pct}%`,
                bottom: 0,
            }
        },
    },
    mounted(){
        this.events = {
            mousemove: e=>this.handleMove(e),
            mouseup: e=>this.handleEnd(e),
            mouseleave: e=>this.handleEnd(e),
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