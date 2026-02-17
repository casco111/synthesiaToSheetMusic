class readVideoPixel {
    /**
     * @param {HTMLVideoElement} videoEl - a loaded video element
     */
    constructor(videoEl, options, keyArray, keyScale = []) {
        if (!(videoEl instanceof HTMLVideoElement)) {
            throw new Error("videoEl must be an HTMLVideoElement");
        }
        this.video = videoEl;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.options = options;
        this.keyArray = keyArray;
        this.midiBuilder = new MidiFileBuilder();
        // Starten, sobald das Video spielt
        this.handlePlay = () => this.startFrameProcessing();
        this.video.addEventListener('play', this.handlePlay);
        
        this.prevReads = new Map();
    }


    startFrameProcessing() {

        // Die Callback-Funktion
        const updateFrame = (now, metadata) => {
            // Abbruchbedingung (wenn Video pausiert oder zu Ende ist)
            if (video.paused || video.ended) return;

            // 1. Canvas Größe an Video anpassen (nur falls nötig)
            if (this.canvas.width !== metadata.width || this.canvas.height !== metadata.height) {
                this.canvas.width = metadata.width;
                this.canvas.height = metadata.height;
            }

            // 2. Den aktuellen Video-Frame auf das Canvas zeichnen
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            //1d array von farben => 4 einträge = 1 pixel
            const frameData = this.ctx.getImageData(0, this.options.detectionHeight(), this.canvas.width, 1);


            this.keyArray.forEach(key => {
                const x = Math.floor(key.x);
                const medianPixel = this.getMedianPixel(frameData.data, x);
                const diff = Math.abs(medianPixel.r - this.options.colorDetect.r) + Math.abs(medianPixel.g - this.options.colorDetect.g) + Math.abs(medianPixel.b - this.options.colorDetect.b);
                if (diff < this.options.colorThreshold) {
                    this.prevReads.set(key.note, this.prevReads.has(key.note) ? this.prevReads.get(key.note) + 1 : 1);
                   
                } else {
                    if (this.prevReads.has(key.note) && this.prevReads.get(key.note) >= this.options.detectionTime) {
                        const duration = this.prevReads.get(key.note) * 1.0 / this.options.fps;
                        this.midiBuilder.addNote(key.midi, this.video.currentTime - duration, duration);
                    }
                    this.prevReads.set(key.note, 0);
                }
            });

            // 4. Den NÄCHSTEN Frame anfordern (Rekursion)
            this.video.requestVideoFrameCallback(updateFrame);
        };

        // Den Loop starten
        this.video.requestVideoFrameCallback(updateFrame);
    }

    getMedianPixel(pixelArray, position) {
        const k = this.options.medianKernel;

        // Arrays zum Sammeln der Werte
        const rValues = [];
        const gValues = [];
        const bValues = [];

        // 1. Daten sammeln
        for (let i = position - Math.floor(k / 2); i <= position + Math.floor(k / 2); i++) {
            // Sicherstellen, dass wir nicht außerhalb des Bildes lesen
            if (i < 0 || i >= this.canvas.width) continue;

            const index = i * 4;
            rValues.push(pixelArray[index]);
            gValues.push(pixelArray[index + 1]);
            bValues.push(pixelArray[index + 2]);
        }

        // 2. Median berechnen (Helper Funktion)
        const getMedian = (arr) => {
            if (arr.length === 0) return 0;
            arr.sort((a, b) => a - b); // Aufsteigend sortieren
            return arr[Math.floor(arr.length / 2)]; // Den mittleren nehmen
        };

        const medianPixel = {
            r: getMedian(rValues),
            g: getMedian(gValues),
            b: getMedian(bValues)
        };
        return medianPixel;
    }

    disable() {
        this.video.removeEventListener('play', this.handlePlay);
    }
}