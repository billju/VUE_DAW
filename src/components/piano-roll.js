import Scrollbar from './scrollbar.vue';
import { Note } from '../models.js'
export default {
	name: 'piano-roll',
	components: { Scrollbar },
	data: () => ({
		// width height  八度 小節
		grid: { W: 20, H: 20, octave: 8, beat: 8, tickH: 26, velH: 75, velSize: 4, blackKey: 40, whiteKey: 75, sliderSize: 16 },
		ltr: false, // 畫面顯示方向
		scrollTop: 0,
		scrollLeft: 0,
		lastNote: new Note(),
		chordType: 'mono',
		chords: {
			mono: [0],
			major: [0, 4, 7],
			minor: [0, 3, 7],
			major7: [0, 4, 7, 11],
			minor7: [0, 3, 7, 10],
		},
		activeNotes: [], // 編輯中的音符
		clipboard: [], // 複製中的音符
		dragging: null, // 拖曳中的音符
		ticking: false, // 調整時間軸
		recording: false, // 錄音中
		velociting: false, // 調整力度
		resizing: false, // 調整音符長短(Boolean或{ dir: 'left', note })
		resizeBuffer: 6, // 調整音符長短的pixel緩衝範圍
		playing: false, // 播放中
		range: { sx: 0, sy: 0, ex: 0, ey: 0 }, // 選取範圍
		ranging: false, // 選取範圍中
		cursor: 'auto', // css鼠標
		mouse: { button: -1, x: 0, y: 0, clientX: 0, clientY: 0 },
		deleting: false, // 正在按右鍵刪除
		ctrlKey: false,
		shiftKey: false,
		triggering: [], // 觸發中的音符
		playX: -1, // 播放點(整數X)
		lastX: -1, // 上個播放點
		floatX: 0, // 浮點數X
		playTimeout: null, // 播放計時器
		freezeScroll: false, // 鎖定卷軸
		historyIdx: 0, // 歷史紀錄指標
		histories: [], // 歷史紀錄
		events: {},
	}),
	props: {
		bpm: { type: Number, default: 128 }, // beats per minute
		tracks: { type: Array, default: () => [] }, // 音軌
		trackIndex: { type: Number, default: 0 }, // 音軌索引
		metronome: { type: Boolean, default: false }, // 節拍器
		activeColor: { type: String, default: 'rgba(255, 163, 164)' }, // 編輯中底色
	},
	methods: {
		// utils
		minmax(input, min, max) {
			return input > max ? max : input < min ? min : input;
		},
		grid2label(y) {
			let { octave } = this.grid;
			let notes = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];
			let note = notes[y % 12] + Math.floor((octave * 12 - y - 1) / 12);
			return note;
		},
		getGrid(cx, cy) {
			let { top, left, right, bottom } = this.$refs['scroller'].getBoundingClientRect();
			let { W, H, octave } = this.grid;
			let rx = this.ltr ? cx - left + this.scrollLeft : this.scrollLeft - cy + bottom;
			let ry = this.ltr ? cy - top + this.scrollTop : right - cx - this.scrollTop;
			cx -= left
			cy -= top
			let x = Math.floor(rx / W);
			let y = Math.floor(ry / H);
			let note = this.notes.filter((n) => n.x <= x && x < n.end && n.y == y)[0];
			return { x, y, rx, ry, cx, cy, note };
		},
		checkMovable(dx, dy) {
			let { octave, beat } = this.grid;
			let xs = this.activeNotes.map((n) => n.x + dx).every((x) => 0 <= x);
			let ys = this.activeNotes.map((n) => n.y + dy).every((y) => 0 <= y && y < octave * 12);
			return xs && ys;
		},
		// mouse-events
		scaleY(e) {
			e.preventDefault();
			let { x, y, rx, ry, cx, cy, note } = this.getGrid(e.clientX, e.clientY);
			let { H, tickH, velH } = this.grid
			let { width, height } = this.$refs.canvas
			let delta = Math.sign(e.deltaY) * 2;
			this.grid.H = this.minmax(H - delta, 10, 30);
			let offset = this.ltr ? cy : cx - width
			this.scrollTop = (this.scrollTop + offset) * this.grid.H / H - offset
		},
		handleWheel(e) {
			let { W, H, beat, tickH } = this.grid;
			let { x, y, rx, ry, cx, cy, note } = this.getGrid(e.clientX, e.clientY);
			let { width, height } = this.$refs.canvas
			if ((this.ltr && cy < tickH) || (!this.ltr && cx < tickH)) {
				e.preventDefault();
				let delta = Math.sign(e.deltaY) * 2;
				this.grid.W = this.minmax(W - delta, 5, 25);
				let offset = this.ltr ? cx : height - cy
				this.scrollLeft = (this.scrollLeft + offset) * this.grid.W / W - offset
			} else if (this.ltr) {
				if (this.shiftKey)
					if (this.freezeScroll && this.playing) return;
					else this.scrollLeft += Math.sign(e.deltaY) * W * beat;
				else this.scrollTop += Math.sign(e.deltaY) * H * 4;
			} else {
				if (this.shiftKey) this.scrollTop += Math.sign(e.deltaY) * H * 4;
				else if (this.freezeScroll && this.playing) return;
				else this.scrollLeft -= Math.sign(e.deltaY) * W * beat;
			}
		},
		setVelocity(e) {
			let { x, y, rx, ry, cx, cy, note } = this.getGrid(e.clientX, e.clientY);
			let { velH, velSize } = this.grid;
			let { width, height } = this.$refs.canvas
			let size = velH - velSize
			let h = this.ltr ? cy + size - height : cx + size - width;
			let velocity = 127 - this.minmax(parseInt((h / size) * 127), 0, 127);
			let notes = this.activeNotes.length ? this.activeNotes : this.notes;
			notes
				.filter((n) => n.x <= x && x < n.end)
				.map((n) => (n.v = velocity));
		},
		handleStart(e) {
			let { x, y, rx, ry, cx, cy, note } = this.getGrid(e.clientX, e.clientY);
			let { width, height } = this.$refs.canvas
			let { W, tickH, velH } = this.grid;
			this.mouse = { button: e.button, x, y, clientX: e.clientX, clientY: e.clientY };
			if (e.button == 0) {
				if (this.ltr && cy < tickH) this.ticking = true
				else if (!this.ltr && cx < tickH) this.ticking = true
				else if (this.ltr && cy > height - velH) this.velociting = true
				else if (!this.ltr && cx > width - velH) this.velociting = true
				else if (this.ctrlKey) {
					// 選取範圍
					this.clearSelection();
					this.ranging = true;
					this.range.sx = x;
					this.range.sy = y;
				} else if (note) {
					this.addHistory();
					// 伸縮音符
					let dx = rx - note.x * W;
					if (dx < this.resizeBuffer) this.resizing = { dir: 'left', note };
					else if (dx > note.l * W - this.resizeBuffer) this.resizing = { dir: 'right', note };
					// 選取音符
					if (!this.activeNotes.includes(note)) {
						this.clearSelection();
						note.a = true;
						this.activeNotes = [note];
					}
					// 移動音符
					if (!this.resizing) {
						this.dragging = note;
						this.triggerSelection(false);
					}
				} else {
					// 新增音符
					this.clearSelection();
					this.addHistory();
					for (let oy of this.chords[this.chordType]) {
						let newNote = new Note({
							a: true,
							x,
							y: y - oy,
							l: this.lastNote.l,
							v: this.lastNote.v,
						});
						this.dragging = newNote;
						this.notes.push(newNote);
						this.activeNotes.push(newNote);
					}
					this.triggerSelection(false);
				}
			} else if (e.button == 2) {
				// 刪除音符
				this.clearSelection();
				this.deleting = true;
				if (note) {
					this.addHistory();
					let idx = this.notes.findIndex((n) => n == note);
					this.notes.splice(idx, 1);
				}
			}
		},
		handleMove(e) {
			if (this.velociting) return this.setVelocity(e);
			let { x, y, rx, ry, cx, cy, note } = this.getGrid(e.clientX, e.clientY);
			if (this.ticking) {
				// 調整刻度
				this.playX = this.lastX = this.floatX = x;
				// this.cursor = 'col-resize'
			} else if (this.ranging) {
				// 選取範圍
				this.range.ex = x;
				this.range.ey = y;
			} else if (this.resizing) {
				// 伸縮音符
				let { dir, note } = this.resizing;
				let dx = x - note.x;
				let dl = x - note.x - note.l + 1;
				if (dir == 'left' && this.activeNotes.every((n) => n.x + dx < n.end)) {
					for (let n of this.activeNotes) {
						n.l -= dx;
						n.x += dx;
					}
				} else if (dir == 'right' && this.activeNotes.every((n) => n.l + dl > 0)) {
					for (let n of this.activeNotes) n.l += dl;
				}
			} else if (this.dragging) {
				// 移動音符
				let dx = x - this.mouse.x;
				let dy = y - this.mouse.y;
				if (this.checkMovable(dx, dy)) {
					for (let note of this.activeNotes) {
						note.x += dx;
						note.y += dy;
						if (dy != 0) this.triggerRelease(note);
					}
				}
			} else if (note) {
				// detect if in resize zone, and set cursor style
				let { W } = this.grid;
				let dx = rx - note.x * W;
				if (this.deleting) {
					this.addHistory();
					let idx = this.notes.findIndex((n) => n == note);
					this.notes.splice(idx, 1);
				} else if (this.velociting) {
					this.cursor = this.ltr ? 'ns-resize' : 'ew-resize';
				} else if (dx < this.resizeBuffer || dx > note.l * W - this.resizeBuffer || this.resizing)
					this.cursor = this.ltr ? 'ew-resize' : 'ns-resize';
				else this.cursor = 'auto';
			} else if (this.mouse.button == 1) {
				// 滑鼠中鍵移動位置
				let dx = e.clientX - this.mouse.clientX;
				let dy = e.clientY - this.mouse.clientY;
				this.scrollLeft -= this.ltr ? dx : -dy;
				this.scrollTop -= this.ltr ? dy : dx;
				this.cursor = 'grabbing';
			} else this.cursor = 'auto';
			this.mouse.x = x;
			this.mouse.y = y;
			this.mouse.clientX = e.clientX;
			this.mouse.clientY = e.clientY;
		},
		handleEnd(e) {
			if (this.recording) {
				for (let note in this.activeNotes) this.pianoEnd(107 - note.y);
			} else if (this.ranging) {
				// 將範圍內的音符選取起來
				let { sx, sy, ex, ey } = this.range;
				if (ex < sx) sx = [ex, (ex = sx)][0];
				if (ey < sy) sy = [ey, (ey = sy)][0];
				this.activeNotes = this.notes.filter((n) => n.x <= ex && sx < n.end && sy <= n.y && n.y <= ey);
				this.activeNotes.map((n) => (n.a = true));
			} else if (this.resizing) {
				this.lastNote = new Note(this.resizing.note);
			} else if (this.activeNotes.length) {
				// 停止預覽播放
				this.lastNote = new Note(this.activeNotes[0]);
				this.dragging = false;
				this.activeNotes.map((n) => this.triggerRelease(n));
			} else {
				for (let note in this.triggering) this.pianoEnd(107 - note.y);
			}
			this.ticking = this.deleting = this.velociting = this.ranging = this.resizing = false;
			this.mouse.button = -1;
		},
		// commands
		playLoop() {
			let { W, beat } = this.grid;
			if (this.freezeScroll) this.scrollLeft = this.floatX * this.grid.W;
			// 算出時間插值
			let interpolate = Math.min(this.beatSec * 30); //FPS
			clearTimeout(this.playTimeout);
			// 到了最尾端自動停止
			if (this.playX > this.endX) return this.stop();
			// 用setTimeout異步回call
			else
				this.playTimeout = setTimeout(() => {
					this.floatX += 1 / interpolate;
					this.playLoop();
				}, (1000 * this.beatSec) / interpolate);
			// 時間插值跨越整數
			if (Math.floor(this.floatX) - this.playX >= 1) this.playX++;
			//非跨越整數，略過下列執行
			else return;
			// time consuming process
			if (this.recording) {
				for (let note of this.activeNotes) note.l = this.playX - note.x;
				this.$emit('mic-sample');
			} else {
				for (let track of this.tracks) {
					for (let note of track.notes) {
						if (note.x == this.playX) {
							let duration = note.l * this.beatSec;
							track.instrument.triggerAttackRelease(note.f, duration, undefined, note.v / 127);
							note.p = true;
							this.triggering.push(note);
						}
					}
					for (let note of this.triggering) {
						if (note.p && note.x + note.l < this.playX) {
							note.p = false;
							this.triggering = this.triggering.filter((n) => n != note);
						}
					}
				}
			}
			// emit metronome
			if (this.metronome && this.playX % beat == 0) this.$emit('metronome', this.playX % (beat * 4) == 0 ? 'F5' : 'F4');
		},
		record() {
			for (let note of this.activeNotes) note.a = false;
			if (this.metronome) this.playX = this.lastX - 16;
			this.activeNotes = [];
			this.recording = true;
			this.play();
		},
		play() {
			if (this.playing) return;
			this.playing = true;
			if (this.freezeScroll) this.playX = this.floatX = this.scrollBound.minX;
			this.playLoop();
		},
		stop() {
			this.playing = this.recording = false;
			this.floatX = this.playX = this.lastX;
			clearTimeout(this.playTimeout);
			for (let note of this.triggering) this.triggerRelease(note);
		},
		randomVelocity() {
			this.notes.map((n) => (n.v = Math.round(Math.random() * 100 + 27)));
		},
		async toggleDisplay() {
			// 切換視角
			this.ltr = !this.ltr;
			this.grid.H = 20;
			await this.$nextTick();
		},
		triggerAttack(note) {
			this.instrument.triggerAttack(note.f, undefined, note.v / 127);
			this.triggering.push(note);
		},
		triggerRelease(note) {
			this.instrument.triggerRelease(note.f);
			this.triggering = this.triggering.filter((n) => n != note);
		},
		triggerSelection(shouldRelease = true) {
			if (!this.activeNotes.length) return;
			let firstNote = this.activeNotes[0];
			if (!this.activeNotes.every((n) => n.x == firstNote.x)) return;
			for (let note of this.activeNotes) {
				if (shouldRelease) this.instrument.triggerAttackRelease(note.f, '8n', undefined, note.v / 127);
				else this.triggerAttack(note);
			}
		},
		clearSelection() {
			this.activeNotes.map((n) => (n.a = false));
			this.activeNotes = [];
		},
		pianoStart(midi, v = 60) {
			let newNote = new Note({
				a: true,
				x: this.playX - 1,
				y: 107 - midi,
				l: 1,
				v: v,
				p: false, //playing
			});
			this.activeNotes.push(newNote);
			if (this.recording) this.notes.push(newNote);
			this.triggerAttack(newNote);
		},
		pianoEnd(midi) {
			if (this.recording) {
				let idx = this.activeNotes.findIndex((n) => n.y == 107 - midi);
				if (idx == -1) return;
				let note = this.activeNotes[idx];
				note.a = false;
				this.triggerRelease(note);
				this.activeNotes.splice(idx, 1);
			} else {
				let idx = this.triggering.findIndex((n) => n.y == 107 - midi);
				if (idx == -1) return;
				let note = this.triggering[idx];
				this.triggerRelease(note);
			}
		},
		copyNotes() {
			this.clipboard = this.activeNotes.map((n) => new Note(n));
		},
		pasteNotes() {
			this.addHistory();
			let minX = Math.min(...this.clipboard.map((n) => n.x));
			this.activeNotes.map((n) => (n.a = false));
			let cloned = this.clipboard.map((n) => new Note({ ...n, x: n.x + this.mouse.x - minX }));
			this.notes.push(...cloned);
			this.activeNotes = cloned;
		},
		deleteNotes() {
			this.addHistory();
			let filterNotes = this.notes.filter((n) => !this.activeNotes.includes(n));
			this.$emit('notes', filterNotes);
			this.activeNotes = [];
		},
		addHistory(msg = '') {
			this.histories[this.historyIdx] = {
				msg,
				notes: this.notes.map((note) => new Note(note)),
			};
			this.historyIdx++;
			this.histories = this.histories.slice(0, this.historyIdx);
		},
		traceHistory(offset) {
			if (offset < 0 && !this.histories[this.historyIdx]) {
				this.addHistory();
				this.historyIdx--;
			}
			this.historyIdx = this.minmax(this.historyIdx + offset, 0, this.histories.length - 1);
			let { notes } = this.histories[this.historyIdx];
			this.$emit('notes', notes);
			this.activeNotes = notes.filter((n) => n.a);
		},
		// key-events
		handleKeydown(e) {
			switch (e.key.toUpperCase()) {
				case 'SHIFT':
					this.shiftKey = true;
					break;
				case 'CONTROL':
					this.ctrlKey = true;
					break;
				case ' ':
					e.preventDefault();
					if (this.playing) this.stop();
					else this.play();
					break;
				case 'A':
					if (e.ctrlKey) {
						this.activeNotes = this.notes;
						this.activeNotes.map((n) => (n.a = true));
					}
					break;
				case 'X':
					if (e.ctrlKey) {
						this.copyNotes();
						this.deleteNotes();
					}
					break;
				case 'C':
					if (e.ctrlKey) this.copyNotes();
					break;
				case 'V':
					if (e.ctrlKey) this.pasteNotes();
					break;
				case 'F2':
					this.freezeScroll = !this.freezeScroll;
					break;
				case 'DELETE':
					this.deleteNotes();
					break;
				case 'BACKSPACE':
					this.deleteNotes();
					break;
				case 'ARROWLEFT':
					if (this.activeNotes.length && this.checkMovable(1, 0)) {
						if (e.shiftKey) this.activeNotes.map((n) => n.l--);
						else this.activeNotes.map((n) => n.x--);
					} else if (!this.playing) {
						if (this.ltr) this.scrollLeft -= this.grid.W
						else this.scrollTop -= this.grid.H
					}
					break;
				case 'ARROWRIGHT':
					if (this.activeNotes.length && this.checkMovable(1, 0)) {
						if (e.shiftKey) this.activeNotes.map((n) => n.l++);
						else this.activeNotes.map((n) => n.x++);
					} else if (!this.playing) {
						if (this.ltr) this.scrollLeft += this.grid.W
						else this.scrollTop += this.grid.H
					}
					break;
				case 'ARROWDOWN':
					if (this.activeNotes.length) {
						if (e.shiftKey) {
							let minY = Math.min(...this.activeNotes.map((n) => n.y));
							let i = this.activeNotes.findIndex((n) => n.y == minY);
							this.activeNotes[i].y += 12;
							this.triggerSelection();
						} else this.activeNotes.map((n) => n.y++);
					} else if (!this.playing) {
						if (this.ltr) this.scrollTop += this.grid.H
						else this.scrollLeft -= this.grid.W
					}
					break;
				case 'ARROWUP':
					if (this.activeNotes.length) {
						if (e.shiftKey) {
							let maxY = Math.max(...this.activeNotes.map((n) => n.y));
							let i = this.activeNotes.findIndex((n) => n.y == maxY);
							this.activeNotes[i].y -= 12;
							this.triggerSelection();
						} else this.activeNotes.map((n) => n.y--);
					} else if (!this.playing) {
						if (this.ltr) this.scrollTop -= this.grid.H
						else this.scrollLeft += this.grid.W
					}
					break;
				case 'Z':
					if (e.ctrlKey) {
						if (e.shiftKey) this.traceHistory(1);
						else this.traceHistory(-1);
					}
					break;
				default:
					break;
			}
		},
		handleKeyup(e) {
			switch (e.key.toUpperCase()) {
				case 'SHIFT':
					this.shiftKey = false;
					break;
				case 'CONTROL':
					this.ctrlKey = false;
					break;
				default:
					break;
			}
		},
		draw() {
			const canvas = this.$refs.canvas;
			const ctx = canvas.getContext('2d');
			let { width, height } = canvas;
			let { W, H, beat, tickH, velH, velSize } = this.grid;
			// 繪製底部網格
			ctx.fillStyle = '#29373F'
			ctx.fillRect(0, 0, width, height);
			const res = (m, n) => ((m % n) + n) % n;
			let iy = Math.floor(this.scrollTop / H);
			let jy = (this.ltr ? height : width) / H;
			let oy = res(this.scrollTop, H);
			for (let i = -1; i <= jy + 1; i++) {
				let isBlack = this.ltr ?
					[2, 4, 6, 9, 11].includes(res(iy + i + 1, 12)) :
					[2, 4, 7, 9, 11].includes(res(iy + i + 1, 12))
				ctx.fillStyle = isBlack ? '#394B56' : '#42545F';
				if (this.ltr) ctx.fillRect(0, i * H - oy, width, H - 2);
				else ctx.fillRect(i * H - oy, 0, H - 2, height);
			}
			let ix = Math.floor(this.scrollLeft / W);
			let jx = (this.ltr ? width : height) / W;
			let ox = res(this.scrollLeft, W);
			for (let i = -1; i <= jx + 1; i++) {
				ctx.fillStyle = res(ix + i, 4) ? '#42545F' : '#29373F';
				if (this.ltr) ctx.fillRect(i * W - ox, 0, 1, height);
				else ctx.fillRect(0, height - i * W + ox, width, 1);
			}
			// 繪製音符
			for (let track of this.scrollerTracks) {
				for (let note of track.notes) {
					ctx.fillStyle = note.a ? this.activeColor : `rgb(${track.rgb.join(',')})`;
					ctx.globalAlpha = (note.v / 127) * 0.5 + 0.5;
					if (this.ltr) ctx.fillRect(note.x * W - this.scrollLeft, note.y * H - this.scrollTop, note.l * W, H);
					else
						ctx.fillRect(
							width - note.y * H - this.scrollTop - H,
							height - note.x * W + this.scrollLeft - note.l * W,
							H,
							note.l * W
						);
				}
			}
			ctx.globalAlpha = 1;
			// 繪製時間線
			ctx.fillStyle = 'orange'
			if (this.ltr) ctx.fillRect(W * this.floatX - this.scrollLeft, 0, 2, height)
			else ctx.fillRect(0, height - W * this.floatX + this.scrollLeft, width, 2)
			// 繪製刻度
			ctx.fillStyle = '#343a40'
			if (this.ltr) ctx.fillRect(0, 0, width, tickH)
			else ctx.fillRect(0, 0, tickH, height)
			ctx.fillStyle = 'white'
			ctx.font = '16pt monospace'
			ctx.textAlign = 'left'
			let { minX, maxX } = this.scrollBound;
			minX = Math.floor(minX / beat)
			maxX = Math.ceil(maxX / beat)
			for (let i = minX; i <= maxX; i++) {
				if (this.ltr) ctx.fillText(i, i * W * beat - this.scrollLeft, 20)
				else ctx.fillText(i, 0, height - i * W * beat + this.scrollLeft)
			}
			// 範圍框
			if (this.ranging) {
				let { sx, sy, ex, ey } = this.range;
				if (ex < sx) sx = [ex, (ex = sx)][0];
				if (ey < sy) sy = [ey, (ey = sy)][0];
				let rw = (ex - sx) * W
				let rh = (ey - sy) * H
				ctx.strokeStyle = 'dodgerblue'
				if (this.ltr) ctx.strokeRect(sx * W - this.scrollLeft, sy * H - this.scrollTop, rw, rh)
				else ctx.strokeRect(width - sy * H - this.scrollTop - rh, height - sx * W + this.scrollLeft - rw, rh, rw,)
			}
			// 力度框
			ctx.fillStyle = '#343a40'
			if (this.ltr) ctx.fillRect(0, height - velH, width, velH)
			else ctx.fillRect(width - velH, 0, velH, height)
			for (let note of this.notes) {
				ctx.fillStyle = note.a ? this.activeColor : `dodgerblue`;
				ctx.globalAlpha = (note.v / 127) * 0.5 + 0.5;
				let vh = (note.v / 127) * (velH - velSize) + velSize
				if (this.ltr) ctx.fillRect(note.x * W - this.scrollLeft, height - vh, note.l * W, velSize);
				else ctx.fillRect(width - vh, height - note.x * W + this.scrollLeft - note.l * W, velSize, note.l * W);
			}
			ctx.globalAlpha = 1;
			requestAnimationFrame(this.draw);
		},
	},
	computed: {
		notes() {
			let { notes } = this.tracks[this.trackIndex] || {};
			return notes || [];
		},
		instrument() {
			let { instrument } = this.tracks[this.trackIndex] || {};
			return instrument || {};
		},
		scrollBound() {
			let { clientWidth, clientHeight } = this.$refs['scroller'] || {};
			let clientSize = this.ltr ? clientWidth : clientHeight;
			let { W } = this.grid;
			let minX = Math.floor(this.scrollLeft / W);
			let maxX = Math.ceil((this.scrollLeft + clientSize) / W);
			return { minX, maxX, clientSize };
		},
		scrollerTracks() {
			let { minX, maxX } = this.scrollBound;
			return this.tracks.map((track) => ({
				...track,
				notes: track.notes.filter((n) => minX <= n.end && n.x <= maxX),
			}));
		},
		beatSec() {
			let { beat } = this.grid;
			let sec = 60 / this.bpm / beat;
			let floatPoint = 1e3;
			return Math.round(sec * floatPoint) / floatPoint;
		},
		endX() {
			let { beat } = this.grid;
			let endX = Math.max(...this.tracks.flatMap((track) => track.notes.map((n) => n.end)));
			endX = Math.ceil(endX / beat) * beat + 1;
			return endX;
		},
		scrollSize() {
			let { clientSize } = this.scrollBound;
			let { W } = this.grid;
			return clientSize + Math.max(this.scrollLeft, Math.ceil(this.endX * W));
		},
		pianoGrids() {
			let { H, tickH, velH, whiteKey, blackKey, octave } = this.grid;
			let blacks = [1, 3, 5, 8, 10];
			let top = 0;
			let len = octave * 12;
			return Array.from(Array(len).keys(), (i) => {
				let isBlack = blacks.includes(i % 12);
				let height = isBlack ? H : i % 12 < 7 ? (H * 7) / 4 : (H * 5) / 3;
				if (i > 0 && !isBlack) top += height;
				let isTriggered = this.triggering.some((n) => n.y == i);
				return this.ltr
					? {
						class: isTriggered ? 'bg-warning' : isBlack ? 'bg-dark' : 'bg-light',
						style: {
							width: (isBlack ? blackKey : whiteKey) + 'px',
							top: (isBlack ? top + H : top) - this.scrollTop - tickH + 'px',
							left: 0,
							zIndex: isBlack ? 666 : 66,
							boxShadow: isBlack ? '2px 0 white' : '0 -2px black',
							height: height + 'px',
							lineHeight: height + 'px',
							textAlign: isBlack ? 'left' : 'right',
							padding: '0px 4px',
						},
						content: isBlack ? '' : this.grid2label(i),
					}
					: {
						class: isTriggered ? 'bg-warning' : isBlack ? 'bg-dark' : 'bg-light',
						style: {
							height: (isBlack ? blackKey + 10 : whiteKey) + 'px',
							right: (isBlack ? H * i : top) + this.scrollTop - velH + 'px',
							top: 0,
							zIndex: isBlack ? 666 : 66,
							boxShadow: isBlack ? '' : '2px 0 black',
							width: height + 'px',
						},
						content: '',
					};
			});
		},
	},
	mounted() {
		this.addHistory('開啟專案');
		const canvas = this.$refs.canvas;
		const resizeObserver = new ResizeObserver((entries) => {
			let { width, height } = entries[0].contentRect;
			Object.assign(canvas, { width, height });
		});
		resizeObserver.observe(canvas);
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		this.draw();
		this.ltr = true; // 觸發scrollerTracks
		this.events = {
			mousemove: (e) => this.handleMove(e),
			mouseup: (e) => this.handleEnd(e),
			mouseleave: (e) => this.handleEnd(e),
			keydown: (e) => this.handleKeydown(e),
			keyup: (e) => this.handleKeyup(e),
		}
		for (let name in this.events) window.addEventListener(name, this.events[name]);
	},
	beforeDestroy() {
		for (let name in this.events) window.removeEventListener(name, this.events[name]);
	},
};
