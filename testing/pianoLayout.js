
  /**
 * Generate x positions for 88 piano keys
 * @param {number} totalWidth - total pixel width of the piano
 * @returns {Array<{note:string, midi:number, isBlack:boolean, x:number}>}
 */
  function generatePianoLayout(totalWidth) {
    const whiteKeyCount = 52; // 52 white keys on a piano
    const whiteKeyWidth = totalWidth / whiteKeyCount;
    const halfWhiteKeyWidth = whiteKeyWidth / 2;
    // chromatic sequence starting at A
    const pattern = [
      { name: "A",  black: false },
      { name: "A#", black: true  },
      { name: "B",  black: false },
      { name: "C",  black: false },
      { name: "C#", black: true  },
      { name: "D",  black: false },
      { name: "D#", black: true  },
      { name: "E",  black: false },
      { name: "F",  black: false },
      { name: "F#", black: true  },
      { name: "G",  black: false },
      { name: "G#", black: true  },
    ];
  
    const keys = [];
    let whiteIndex = 0; // counts white keys placed so far
  
    for (let midi = 21; midi <= 108; midi++) {
      const step = (midi - 21) % 12;
      const { name, black } = pattern[step];
  
      // Octave number: MIDI 21 (A0) → octave 0
      const octave = Math.floor((midi - 21) / 12);
      const note = name + octave;
  
      let x;
      if (!black) {
        // White key position
        x = whiteIndex * whiteKeyWidth + halfWhiteKeyWidth;
        whiteIndex++;
      } else {
        // Black key sits between whites: ~0.65 offset into previous white
        x = whiteIndex * whiteKeyWidth;
      }
  
      keys.push({ note, midi, isBlack: black, x });
    }
  
    return keys;
  }
  