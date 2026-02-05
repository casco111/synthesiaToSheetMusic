class MidiFileBuilder {
    constructor({ bpm = 120, ppq = 480 } = {}) {
      this.bpm = bpm;
      this.ppq = ppq;
      this.events = []; // {time, type:'on'|'off', midi, velocity}
    }
  
    /**
     * Add a note
     * @param {number} midi - MIDI note number (0-127)
     * @param {number} startTime - time in seconds
     * @param {number} duration - duration in seconds
     * @param {number} [velocity=100]
     */
    addNote(midi, startTime, duration, velocity = 100) {
      this.events.push({ time: startTime, type: 'on', midi, velocity });
      this.events.push({ time: startTime + duration, type: 'off', midi, velocity: 64 });
    }
  
    // --- Internal helpers ---
    _writeVLQ(value) {
      let buffer = value & 0x7F;
      const bytes = [];
      while ((value >>= 7)) {
        buffer <<= 8;
        buffer |= ((value & 0x7F) | 0x80);
      }
      while (true) {
        bytes.push(buffer & 0xFF);
        if (buffer & 0x80) buffer >>= 8; else break;
      }
      return bytes;
    }
  
    _pushStr(arr, s) { for (let i = 0; i < s.length; i++) arr.push(s.charCodeAt(i)); }
    _push32(arr, n) { arr.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255); }
    _push16(arr, n) { arr.push((n >>> 8) & 255, n & 255); }
  
    /**
     * Build the MIDI file as Uint8Array
     */
    buildFile() {
      const evs = this.events.slice().sort((a, b) => a.time - b.time || (a.type === 'on' ? -1 : 1));
      const mpqn = Math.round(60000000 / Math.max(1, this.bpm));
      const bytes = [];
  
      this._pushStr(bytes, 'MThd');
      this._push32(bytes, 6);
      this._push16(bytes, 0); // format 0
      this._push16(bytes, 1); // ntrks
      this._push16(bytes, this.ppq);
  
      const track = [];
      track.push(...this._writeVLQ(0), 0xFF, 0x51, 0x03, (mpqn >>> 16) & 255, (mpqn >>> 8) & 255, mpqn & 255);
      track.push(...this._writeVLQ(0), 0xC0, 0x00); // program change: piano
  
      const ticksPerSec = this.ppq * (this.bpm / 60);
      let lastTick = 0;
  
      for (const e of evs) {
        const tick = Math.round(e.time * ticksPerSec);
        const delta = Math.max(0, tick - lastTick);
        track.push(...this._writeVLQ(delta));
        if (e.type === 'on') track.push(0x90, e.midi & 0x7F, e.velocity & 0x7F);
        else track.push(0x80, e.midi & 0x7F, e.velocity & 0x7F);
        lastTick = tick;
      }
  
      track.push(0x00, 0xFF, 0x2F, 0x00); // end of track
  
      this._pushStr(bytes, 'MTrk');
      this._push32(bytes, track.length);
      bytes.push(...track);
  
      return new Uint8Array(bytes);
    }
  
    /**
     * Get a Blob for download
     */
    toBlob() {
      return new Blob([this.buildFile()], { type: 'audio/midi' });
    }
  
    /**
     * Trigger a download in browser
     * @param {string} filename
     */
    download(filename = 'output.mid') {
      const blob = this.toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  }

  // Example usage:
  // const midi = new MidiFileBuilder({bpm:120});
  // midi.addNote(60, 0, 1);
  // midi.addNote(64, 1, 1);
  // midi.addNote(67, 2, 1);
  // midi.download('c-major-chord.mid');
  
