const alarmPatterns = {
  bell: { type: 'sine', notes: [880, 1174, 880], duration: 0.24 },
  chime: { type: 'sine', notes: [659, 784, 1046], duration: 0.2 },
  digital: { type: 'square', notes: [740, 988, 740], duration: 0.14 },
};

export function playFocusAlarm(audioContext, soundId) {
  const pattern = alarmPatterns[soundId] || alarmPatterns.bell;
  const startTime = audioContext.currentTime + 0.02;

  pattern.notes.forEach((frequency, index) => {
    const start = startTime + index * (pattern.duration + 0.06);
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = pattern.type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + pattern.duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + pattern.duration);
  });
}
