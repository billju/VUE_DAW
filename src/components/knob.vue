<template lang="pug">
div(:style='containerStyle' @mousedown='handleEventStart' @touchstart='handleEventStart')
	div(:style='dialStyle')
		div(:style='pointerStyle')
	svg.w-100.h-100(viewBox='0 0 100 100')
		path(:style='pathStyle' d='M20,76 A 40 40 0 1 1 80 76' stroke='#333333' fill='none')
		path(:style='pathStyle' d='M20,76 A 40 40 0 1 1 80 76' stroke='#16FFBD' :stroke-dashoffset='Math.round(184-pct*184)' fill='none')
	div(:style='labelStyle') {{label}}  
</template>

<script>
export default {
	name: 'knob',
	data:()=>({
		val:0.5, coord:{x:0,y:0}, active: false, events:{},
	}),
	props: {
		max:{type:Number,default:1},
		min:{type:Number,default:0},
		step:{type:Number,default:0.01},
		value:{type:Number,default:0.5},
		label:{type:String,default:''},
		size:{type:Number,default:100},
	},
	methods:{
		getCoord(e){
			return {
				x: e.clientX==undefined?e.targetTouches[0].pageX:e.clientX,
					y: e.clientY==undefined?e.targetTouches[0].pageY:e.clientY
				}
		},
		handleEventStart(e){
			this.active = true
			this.coord = this.getCoord(e)
			this.val = this.value
		},
		handleEventMove(e){
			if(this.active){
				e.preventDefault()
				let {val,coord} = this.$data
				let {max,min,step} = this.$props
				let {x,y} = this.getCoord(e)
				let dx = coord.x-x
				let dy = coord.y-y
				val += (dy-dx)*(max-min)*0.005
				val = (val>max)?max:(val<min)?min:val
				let emitValue = Math.round(val/step)*step
				emitValue =  Math.round(emitValue*100)/100 //deal with float flush
				this.$emit('input',emitValue)
			}
		},
		handleEventEnd(){
			this.active = false
		}
	},
	computed:{
		pct(){
			let {value,max,min} = this.$props
			value = (value>max)?max:(value<min)?min:value
			return (value-min)/(max-min)
		},
		containerStyle(){
			return{
				width: `${this.size}px`,
				height: `${this.size}px`,
				position: 'relative',
				display: 'inline-block',
				marginBottom: '10px',
				cursor: 'pointer',
			}
		},
		dialStyle(){
			return{
				position: 'absolute',
				width: '72%',
				height: '72%',
				top: '14%',
				left: '14%',
				transform: `rotate(${-132+this.pct*264}deg)`,
				background: '#447799',
				boxShadow: '0 0 0 5px rgba(0, 0, 0, 0.2) inset',
				borderRadius: '50%',
			}
		},
		pointerStyle(){
			return {
				position: 'absolute',
				height: '20%',
				width: '6%',
				top: '15%',
				left: '50%',
				background: '#fff',
			}
		},
		labelStyle(){
			return {
				position: 'absolute',
				color: '#fff',
				top: '90%',
				width: '100%',
				textAlign: 'center',
			}
		},
		pathStyle(){
			return {
				strokeWidth: '10px',
				strokeDasharray: '184',
				transition: '0.15s',
			}
		}
	},
	mounted(){
		this.events = {
			mousemove: e=>this.handleEventMove(e),
			touchmove: e=>this.handleEventMove(e),
			mouseup: e=>this.handleEventEnd(e),
			mouseleave: e=>this.handleEventEnd(e),
			touchend: e=>this.handleEventEnd(e),
			touchcancel: e=>this.handleEventEnd(e),
		}
		for(let name in this.events)
			window.addEventListener(name,this.events[name])
	},
	beforeDestroy(){
		for(let name in this.events)
			window.removeEventListener(name,this.events[name])
	}  
}
</script>