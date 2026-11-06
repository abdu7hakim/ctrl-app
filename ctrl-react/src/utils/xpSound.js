const rewardNotes = [659.25, 830.61, 987.77];

export function playXpRewardSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  let audioContext;
  try {
    audioContext = new AudioContextClass();
    const playNotes = () => {
      const startTime = audioContext.currentTime + 0.02;
      rewardNotes.forEach((frequency, index) => {
        const start = startTime + index * 0.09;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.25);
      });
      window.setTimeout(() => {
        audioContext.close().catch((error) => {
          console.error('XP ovozini yakunlashda xatolik:', error);
        });
      }, 500);
    };

    if (audioContext.state === 'suspended') {
      audioContext.resume().then(playNotes).catch((error) => {
        console.error('XP ovozini ijro etishda xatolik:', error);
        audioContext.close().catch((closeError) => {
          console.error('XP ovozini yakunlashda xatolik:', closeError);
        });
      });
    } else {
      playNotes();
    }
  } catch (error) {
    console.error('XP ovozini ishga tushirishda xatolik:', error);
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch((closeError) => {
        console.error('XP ovozini yakunlashda xatolik:', closeError);
      });
    }
  }
}
