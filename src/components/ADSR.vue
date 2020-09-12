<template lang="pug">
svg.envelope(viewBox='0 0 200 130')
    linearGradient#gradient(y1='1' y2='0')
        stop(offset='0%' stop-color='#447799')
        stop(offset='100%' stop-color='#112266')
    path(:d='path' stroke='#16FFBD' fill='url(#gradient)')
</template>

<script>
export default {
    name: 'ADSR',
    data:()=>({
        events: {}
    }),
    props:{
        a:{type:Number,default:200},
        aq:{type:Number,default:1},
        d:{type:Number,default:100},
        dq:{type:Number,default:1},
        s:{type:Number,default:200},
        r:{type:Number,default:30},
        rq:{type:Number,default:1},
    },
    methods:{
        
    },
    computed:{
        path(){
            let {a,aq,d,dq,s,r,rq} = this.$props
            return `M0 0 
                    Q${a*aq} ${100-100*aq}, ${a} 100 
                    Q${a+s*dq} ${d+(100-d)*dq}, ${a+s} ${d} 
                    Q${a+s+r*rq} ${d*rq}, ${a+s+r} ${0}`
        },
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
}
</script>