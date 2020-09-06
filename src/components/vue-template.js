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