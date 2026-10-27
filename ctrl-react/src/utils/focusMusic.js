export const focusMusicOptions = [
  { id: 'ambient', label: 'Sokin ambient' },
  { id: 'rain', label: 'Yomg‘ir' },
  { id: 'soft', label: 'Yumshoq ohang' },
];

export function createFocusMusic(audioContext, trackId) {
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.0001, audioContext.currentTime);
  master.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 1.5);
  master.connect(audioContext.destination);

  const nodes = [];
  const oscillators = [];
  const addTone = (frequency, type, volume, detune = 0) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.detune.setValueAtTime(detune, audioContext.currentTime);
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start();
    oscillators.push(oscillator);
    nodes.push(gain);
  };

  if (trackId === 'rain') {
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * 0.35;
    }

    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, audioContext.currentTime);
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
    nodes.push(source, filter, gain);
  } else if (trackId === 'soft') {
    addTone(174.61, 'sine', 0.12);
    addTone(220, 'triangle', 0.07, -4);
    addTone(261.63, 'sine', 0.045, 3);
    addTone(329.63, 'sine', 0.025, -2);
  } else {
    addTone(130.81, 'sine', 0.12);
    addTone(196, 'sine', 0.07, 3);
    addTone(261.63, 'sine', 0.045, -3);
    addTone(329.63, 'triangle', 0.025);
  }

  return {
    stop() {
      const stopAt = audioContext.currentTime + 0.15;
      master.gain.cancelScheduledValues(audioContext.currentTime);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), audioContext.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      oscillators.forEach((oscillator) => oscillator.stop(stopAt));
      nodes.filter((node) => typeof node.stop === 'function' && !oscillators.includes(node)).forEach((node) => node.stop(stopAt));
    },
  };
}
