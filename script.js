  // Utility: encode a number as MIDI Variable-Length Quantity (VLQ)
  function writeVLQ(value){
    let buffer = value & 0x7F;
    const bytes = [];
    while((value >>= 7)){
      buffer <<= 8;
      buffer |= ((value & 0x7F) | 0x80);
    }
    while(true){
      bytes.push(buffer & 0xFF);
      if(buffer & 0x80) buffer >>= 8; else break;
    }
    return bytes;
  }

  // Build a minimal Standard MIDI File (SMF) containing a C major scale
  function buildCScaleMIDI({bpm=120, ppq=480, noteLenQ=1}={}){
    // Header chunk: MThd, length 6, format 0, ntrks 1, division = ppq
    const bytes = [];
    function pushStr(s){ for(let i=0;i<s.length;i++) bytes.push(s.charCodeAt(i)); }
    function push32be(n){ bytes.push((n>>>24)&255, (n>>>16)&255, (n>>>8)&255, n&255); }
    function push16be(n){ bytes.push((n>>>8)&255, n&255); }

    // MThd
    pushStr('MThd');
    push32be(6);
    push16be(0);  // format 0
    push16be(1);  // one track
    push16be(ppq);

    // Track data will be built separately and length-prefixed
    const track = [];
    const pushVLQ = n => track.push(...writeVLQ(n));

    // Meta: Set Tempo (microseconds per quarter note)
    const mpqn = Math.round(60000000 / Math.max(1, bpm));
    pushVLQ(0);
    track.push(0xFF, 0x51, 0x03, (mpqn>>>16)&255, (mpqn>>>8)&255, mpqn&255);

    // Program Change to Acoustic Grand Piano (0), channel 0
    pushVLQ(0);
    track.push(0xC0, 0x00);

    // Define the C major scale notes (MIDI numbers)
    const notes = [60,62,64,65,67,69,71,72]; // C4..C5
    const durTicks = Math.max(1, Math.round(ppq * noteLenQ));

    // For each note: delta 0 Note On, then delta=durTicks Note Off
    for(const n of notes){
      pushVLQ(0);            // start immediately after previous note off
      track.push(0x90, n, 0x48); // Note On, velocity 72
      pushVLQ(durTicks);
      track.push(0x80, n, 0x40); // Note Off, velocity 64
    }

    // Meta: End of Track
    pushVLQ(0);
    track.push(0xFF, 0x2F, 0x00);

    // Wrap track with MTrk header and length
    pushStr('MTrk');
    push32be(track.length);
    bytes.push(...track);

    return new Uint8Array(bytes);
  }

  function downloadBlob(uint8, filename){
    const blob = new Blob([uint8], {type:'audio/midi'});
    const url = URL.createObjectURL(blob);
    const a = document.getElementById('dl');
    a.href = url; a.download = filename; a.style.display='inline-flex';
    a.textContent = `Download ${filename}`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 30000);
  }

  function toHex(u8){
    return Array.from(u8).map(b=>b.toString(16).padStart(2,'0')).join(' ');
  }

  document.getElementById('make').addEventListener('click',()=>{
    const bpm = parseInt(document.getElementById('bpm').value||'120',10);
    const ppq = parseInt(document.getElementById('tpq').value||'480',10);
    const noteLenQ = parseFloat(document.getElementById('dur').value||'1');
    const data = buildCScaleMIDI({bpm, ppq, noteLenQ});
    const fname = `c-major-scale-${bpm}bpm.mid`;
    downloadBlob(data, fname);
  });

  document.getElementById('preview').addEventListener('click',()=>{
    const bpm = parseInt(document.getElementById('bpm').value||'120',10);
    const ppq = parseInt(document.getElementById('tpq').value||'480',10);
    const noteLenQ = parseFloat(document.getElementById('dur').value||'1');
    const data = buildCScaleMIDI({bpm, ppq, noteLenQ});
    const hex = document.getElementById('hex');
    hex.style.display='block';
    hex.textContent = toHex(data);
  });
