class NoteReader {
    /**
     * @param {HTMLVideoElement} videoEl - a loaded video element
     */
    constructor(videoEl, keyArray, scanHeight, keyScale = []) {
      if (!(videoEl instanceof HTMLVideoElement)) {
        throw new Error("videoEl must be an HTMLVideoElement");
      }
      this.video = videoEl;
  
      // create a hidden canvas to draw frames
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d");
  
      this.keyArray = keyArray;
      this.scanHeight = scanHeight;

      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      this.prevReads = [];
      this.midiBuilder = new MidiFileBuilder();
      this.keyScale = keyScale;
      console.log("hi" + this.canvas.width)
  
      // only set size once metadata is available
      this.video.addEventListener("loadedmetadata", () => {
      
      });
    }
  
    update() {
      if (!this.video.videoWidth || !this.video.videoHeight) {
        return; // not ready yet
      }
  
      // draw current frame
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
  
        this.keyArray.forEach((x) => {
          // Extract note name without octave number (e.g., "C4" -> "C")
          const noteName = x.note.replace(/\d+$/, '');
          
          if(!this.keyScale.includes(noteName)){
            return;
          }
          const pixel = this.readPixel(x.x, this.scanHeight);
          const detectionColorHex = document.getElementById('colorDetect').value;
          const detectionColor = this.hexToRgb(detectionColorHex);
          let difference = Math.abs(pixel.r - detectionColor.r) + Math.abs(pixel.g - detectionColor.g) + Math.abs(pixel.b - detectionColor.b);
          difference = difference / 3;
          if(difference < document.getElementById('colorThreshold').value){
            if(!this.prevReads.includes(x.note)){
              this.prevReads.push(x.note);
              console.log(`pixel at (${x.note}):`, pixel.r);
              this.midiBuilder.addNote(x.midi, this.video.currentTime, 0.5);
            }
          } else {
            // remove note from prevReads
            if(this.prevReads.includes(x.note)){
              console.log(`removing (${x.note}):`);
            }
            this.prevReads = this.prevReads.filter(n => n !== x.note);
          }
        });
    }
  
    /**
     * Converts hex color to RGB object
     * @param {string} hex - hex color string (e.g., "#ff0000")
     * @returns {{r:number, g:number, b:number}}
     */
    hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    }

    /**
     * Reads the color of a pixel at (x, y) in video coordinates
     * @param {number} x - x coordinate
     * @param {number} y - y coordinate
     * @returns {{r:number, g:number, b:number, a:number}}
     */
    readPixel(x, y) {
      const data = this.ctx.getImageData(x, y, 1, 1).data;
      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    }

    exportMidi() {
      this.midiBuilder.exportMidi();
    }
  }
  