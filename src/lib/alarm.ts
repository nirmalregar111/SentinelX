import alarmSrc from "../imports/WhatsApp_Video_2026-09-08_at_18.30.19.mp4";

let audio: HTMLAudioElement | null = null;
let alarmActive = false;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(alarmSrc);
    audio.loop = true;
  }
  return audio;
}

export function startAlarm() {
  if (alarmActive) return;
  alarmActive = true;
  const a = getAudio();
  a.currentTime = 0;
  a.play().catch(() => {});
}

export function stopAlarm() {
  if (!alarmActive) return;
  alarmActive = false;
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

export function isAlarmActive() {
  return alarmActive;
}
