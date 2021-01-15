<template lang="pug">
.d-flex.flex-grow-1(:class="ltr?'':'flex-column-reverse'" style="user-select:none" :style="{cursor}" @contextmenu.prevent="")

	.d-flex.flex-shrink-0.bg-dark(:class="ltr?'flex-column':''")
		.btn.btn-dark.flex-grow-0.p-0(:style="{writingMode:ltr?'horizontal-tb':'vertical-lr'}" @click="toggleDisplay()") {{ltr?'編輯':'練琴'}}
		.d-flex.flex-grow-1.position-relative.overflow-hidden(@wheel="scaleY($event)" :style="ltr?{width:grid.whiteKey+'px'}:{height:grid.whiteKey+'px'}")
			.position-absolute.text-dark(v-for="pG,pi in pianoGrids" :key="pi" :style="pG.style" :class="pG.class" @mousedown="pianoStart(107-pi)") {{pG.content}}
		.overflow-auto.hide-scrollbar(:style="{flex:`0 0 ${grid.whiteKey}px`,maxHeight:grid.velH+grid.sliderSize+'px'}")
			.small.text-center(v-for="val,name in chords" :key="name" @click="chordType=name" 
				:class="chordType==name?'text-light bg-secondary':'text-muted bg-dark'") {{name}}

	.d-flex.flex-grow-1.position-relative.overflow-hidden(ref="scroller" @wheel="handleWheel($event)" @mousedown="handleStart($event)")
		canvas.flex-grow-1.w-100.h-100.position-absolute(ref="canvas")
		Scrollbar.position-absolute(:style="ltr?{left:0,bottom:0}:{right:0,top:0}" :clientSize="scrollBound.clientSize" :scrollSize="scrollSize" v-model="scrollLeft" :sliderSize="grid.sliderSize" :ltr="ltr")
</template>

<script>
import pianoRoll from './piano-roll.js'
export default pianoRoll
</script>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  	display: none;
}
.hide-scrollbar {
	-ms-overflow-style: none;  /* IE and Edge */
	scrollbar-width: none;  /* Firefox */
}
/* .fade-enter-active{
	opacity: 0.6;
	transition: opacity 0.1s ease-in;
} */
.fade-leave-active {
	transition: opacity 0.3s;
}
.fade-leave-to{
	opacity: 0;
}
</style>