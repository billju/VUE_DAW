export class Note {
	constructor(config = {}) {
		Object.assign(this, config);
		this.i = '_' + Math.random().toString(36).slice(2);
	}
	i = ''; // 索引id
	a = false; // 編輯中active(背景會改變)
	x = 0; // 座標x
	y = 0; // 座標y
	l = 1; // 長度length
	v = 30; // 力度velocity
	p = false; // 播放中playing
	// 頻率frequency
	get f() {
		let midi = 107 - this.y;
		let freq = 440 * Math.pow(2, (midi - 69) / 12);
		return Math.round(freq);
	}
	// 座標x尾端
	get end() {
		return this.x + this.l;
	}
}