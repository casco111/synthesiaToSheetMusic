// some-other-file.js


const fileInput = document.getElementById("fileInput");
const setLayoutButton = document.getElementById("setLayout");
const video = document.getElementById('videoEl');
const overlay = document.getElementById('overlay');
const scaleInput = document.getElementById('scaleInput')
const startBUtton = document.getElementById('start')
const detectionHeightInput = document.getElementById('detectionHeight')
const detectionHeightBar = document.getElementById('detectionHeightBar')
const colorDetectInput = document.getElementById('colorDetect')
const colorBackgroundInput = document.getElementById('colorBackground')
const colorThresholdInput = document.getElementById('colorThreshold')
const eyedropperButton = document.getElementById('eyedropper')
const download = document.getElementById('download')
let videoFile;
let noteReader = null;
let vidReader = null;

// Control elements that should be disabled until video loads
const videoControls = [
    setLayoutButton,
    scaleInput,
    colorDetectInput,
    colorBackgroundInput,
    colorThresholdInput,
    detectionHeightInput,
    startBUtton,
    eyedropperButton
];

let options = {
    colorDetect: {r: 0, g: 0, b: 0},
    colorThreshold: 65,
    medianKernel: 7,
    detectionHeight: () => getDetectionHeight(),
    detectionTime: 5,
    fps:24,
    songName: "transcription"
};

function disableVideoControls() {
    videoControls.forEach(control => {
        control.disabled = true;
        control.classList.add('disabled');
    });
}

function enableVideoControls() {
    videoControls.forEach(control => {
        control.disabled = false;
        control.classList.remove('disabled');
    });
}


fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) {
        setLayoutButton.classList.add("hidden");
        disableVideoControls();
        return;
    }

    console.log("User selected:", file.name);
    disableVideoControls(); // Disable controls while loading
    
    setLayoutButton.classList.remove("hidden");
    videoFile = file;
    video.src = URL.createObjectURL(videoFile);
    video.load();
    
    await new Promise(resolve => {
        video.addEventListener('loadedmetadata', resolve, { once: true });
    });
    await new Promise(resolve => {
        video.addEventListener('canplay', resolve, { once: true });
    });
    
    enableVideoControls(); // Enable controls after video loads
    updateDetectionHeight(); // Set initial position
    
});

setLayoutButton.addEventListener("click", () => {

});

startBUtton.addEventListener("click", () => {
    applyOverlay();
});



function rgbToHex(r, g, b) {
    const toHex = (v) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}



scaleInput.addEventListener('input', () => {
    overlay.style.width = scaleInput.value + "%";
});

detectionHeightInput.addEventListener('input', () => {
    updateDetectionHeight();
});

// Update detection bar position on window resize
window.addEventListener('resize', () => {
    updateDetectionHeight();
});




let dragState = null;
overlay.addEventListener('pointerdown', e => {
    // if clicking handle will be handled separately
    overlay.setPointerCapture(e.pointerId);
    const rect = overlay.getBoundingClientRect();
    dragState = {
        type: 'move',
        startX: e.clientX,
        startY: e.clientY,
        initLeft: overlay.offsetLeft,
        initTop: overlay.offsetTop
    };
    console.log(globalToVideoCoords(e.clientX, e.clientY))
});
window.addEventListener('pointermove', e => {


    if (!dragState) return;
    if (dragState.type !== 'move') return;

    let nx = dragState.initLeft + (e.clientX - dragState.startX);
    let ny = dragState.initTop + (e.clientY - dragState.startY);
    overlay.style.left = nx + "px";
    overlay.style.top = ny + "px";

});
window.addEventListener('pointerup', e => {
    if (dragState) { overlay.releasePointerCapture && overlay.releasePointerCapture(e.pointerId); dragState = null; }
});


resetOverlay();
disableVideoControls(); // Start with controls disabled


function resetOverlay() {
    overlay.style.width = "75%";
    overlay.style.left = "10%";
    overlay.style.top = "60%";
}

function getDetectionHeight() {
    const sliderValue = parseInt(detectionHeightInput.value); // 0-100
    const videoHeight = video.videoHeight;
    
    // Map slider value (0-100) to video height pixels (0 to videoHeight)
    const videoPixelY = Math.floor((sliderValue / 100) * videoHeight);
    return videoPixelY;
}
function updateDetectionHeight() {
    if (!video.videoHeight) return; // Wait for video to load
    
    const videoPixelY = getDetectionHeight();
    
    // Convert video pixel position to CSS position
    const videoRect = video.getBoundingClientRect();
    const stageRect = document.querySelector('.stage').getBoundingClientRect();
    const scaleY = videoRect.height / video.videoHeight;
    const cssY = videoPixelY * scaleY;
    
    // Position the detection bar relative to the stage container
    detectionHeightBar.style.position = 'absolute';
    detectionHeightBar.style.left = (videoRect.left - stageRect.left) + 'px';
    detectionHeightBar.style.top = (videoRect.top - stageRect.top + cssY) + 'px';
    detectionHeightBar.style.width = videoRect.width + 'px';
    
    console.log(`Detection height: ${videoPixelY} -> CSS Y: ${cssY}px`);
}

function startNoteReader(relKeys) {
    //const keyScale = ["C", "D", "E", "F", "F#", "G", "A", "A#"];
    const keyScale = ['C', "C#", "D#",'F',  "F#", "G#", "A#", "B", "C"];
    //noteReader = new NoteReader(video, relKeys, getDetectionHeight(), keyScale);
    if(vidReader)vidReader.disable();
    vidReader = new readVideoPixel(video,  options, relKeys);
    //remove event listener if it exists    video.removeEventListener("timeupdate", noteReader.update);
    /*
   
    video.addEventListener("timeupdate", () => {
        noteReader.update();
      });
      */
}

function globalToVideoCoords(x,y){
    const rect = video.getBoundingClientRect();

  // mouse position relative to video element (CSS pixels)
  const mouseX = x - rect.left;
  const mouseY = y - rect.top;

  // scale to intrinsic video pixels
  const scaleX = video.videoWidth / rect.width;
  const scaleY = video.videoHeight / rect.height;

  const videoX = Math.floor(mouseX * scaleX);
  const videoY = Math.floor(mouseY * scaleY);

  // read pixel
  return {videoX, videoY};
}

function applyOverlay(){
    const rect = overlay.getBoundingClientRect();
    const keyArr = generatePianoLayout(767);
    const scale = rect.width/767;

    let relKeyArr = [];
    keyArr.forEach((x)=>{
        x.x = globalToVideoCoords(rect.x +x.x*scale , 0).videoX;
    })
    startNoteReader(keyArr);
}


//color detection
colorDetectInput.addEventListener('input', (e) => {
    const selectedHex = e.target.value; 
   
    options.colorDetect = hexToRgb(selectedHex);
});

/**
     * Converts hex color to RGB object
     * @param {string} hex - hex color string (e.g., "#ff0000")
     * @returns {{r:number, g:number, b:number}}
     */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  download.addEventListener("click", () => {
    vidReader.midiBuilder.download(options.songName +".mid");
  });