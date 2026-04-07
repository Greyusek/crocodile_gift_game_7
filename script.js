const CONFIG_PATH = "kids.json";
const STATIC_PATH = "assets/static/";
const KIDS_PATH = "assets/kids/";

const GIFT_IMAGES = [
  "pres_red.png",
  "pres_green.png",
  "pres_blue.png",
];

const VOICE = {
  hello: "hellow.mp3",
  ask: "is_it_for_me.mp3",
  thanks: "thanks.mp3",
  bye: "bye.mp3",
};

const SPEECH_TEXT = {
  hello: "Hello!",
  ask: "Is it for me?",
  thanks: "Thanks!",
  bye: "Bye!",
};

const DRAWING_SHOW_MS = 2600;
const AFTER_KID_VOICE_DELAY_MS = 350;
const AFTER_THANKS_DELAY_MS = 220;

const state = {
  kids: [],
  started: false,
  busy: false,
  openedCount: 0,
  staticAudio: {},
};

const els = {
  game: document.getElementById("game"),
  artBoard: document.getElementById("art-board"),
  hero: document.getElementById("hero"),
  giftLayer: document.getElementById("gift-layer"),
  overlay: document.getElementById("overlay"),
  drawing: document.getElementById("drawing"),
  drawingContainer: document.getElementById("drawing-container"),
  photoFrame: document.getElementById("photo-frame"),
  kidPhoto: document.getElementById("kid-photo"),
  speechBubble: document.getElementById("speech-bubble"),
  finishBadge: document.getElementById("finish-badge"),
  startBtn: document.getElementById("start-btn"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const config = await loadConfig();
    state.kids = buildKidsList(config.count);
    preloadStaticAudio();
    renderGifts();
    bindEvents();
  } catch (error) {
    console.error(error);
    alert("Ошибка загрузки. Проверь kids.json и наличие файлов.");
  }
}

function bindEvents() {
  els.startBtn.addEventListener("click", handleGoButton);
}

async function handleGoButton() {
  if (!state.started) {
    await startGame();
  } else {
    await resetGame();
    await startGame();
  }
}

async function loadConfig() {
  const response = await fetch(CONFIG_PATH + "?v=2");
  if (!response.ok) {
    throw new Error("Не удалось загрузить kids.json");
  }

  const data = await response.json();
  if (!Number.isInteger(data.count) || data.count < 1) {
    throw new Error("В kids.json должно быть число count >= 1");
  }

  return data;
}

function buildKidsList(count) {
  const kids = [];
  for (let i = 1; i <= count; i += 1) {
    kids.push({
      id: i,
      photo: `${KIDS_PATH}kid_${i}.jpg`,
      drawing: `${KIDS_PATH}kid_pr_${i}.jpg`,
      voice: `${KIDS_PATH}sp_kid_${i}.mp3`,
      opened: false,
    });
  }
  return kids;
}

function preloadStaticAudio() {
  for (const [key, file] of Object.entries(VOICE)) {
    state.staticAudio[key] = new Audio(STATIC_PATH + file);
    state.staticAudio[key].preload = "auto";
  }
}

function renderGifts() {
  els.giftLayer.innerHTML = "";
  hideFinishBadge();

  const positions = getGiftPositions(state.kids.length);

  state.kids.forEach((kid, index) => {
    const gift = document.createElement("img");
    gift.className = "gift";
    gift.src = STATIC_PATH + GIFT_IMAGES[index % GIFT_IMAGES.length];
    gift.alt = `Gift ${index + 1}`;
    gift.style.left = positions[index].left;
    gift.style.bottom = positions[index].bottom;
    gift.style.animationDelay = `${(index % 7) * 0.2}s`;
    gift.dataset.index = String(index);
    gift.addEventListener("click", () => onGiftClick(index, gift));
    els.giftLayer.appendChild(gift);
  });
}

function shuffleGifts() {
  if (state.busy) return;
  renderGifts();
  enableAvailableGifts();
}

function getGiftPositions(count) {
  const positions = [];
  const maxPerRow = count <= 6 ? count : Math.ceil(count / 2);
  const rowCount = count <= 6 ? 1 : 2;

  let placed = 0;

  for (let row = 0; row < rowCount; row += 1) {
    const remaining = count - placed;
    const itemsThisRow = rowCount === 1 ? count : Math.min(maxPerRow, remaining);
    const startX = row === 0 ? 36 : 42;
    const endX = 88;
    const y = row === 0 ? 11 : 3.5;

    const rowIndexes = Array.from({ length: itemsThisRow }, (_, i) => i);
    rowIndexes.sort(() => Math.random() - 0.5);

    for (let j = 0; j < itemsThisRow; j += 1) {
      const i = rowIndexes[j];
      const t = itemsThisRow === 1 ? 0.5 : i / (itemsThisRow - 1);
      const x = startX + (endX - startX) * t;
      positions.push({
        left: `${x}%`,
        bottom: `${y}%`,
      });
    }

    placed += itemsThisRow;
  }

  return positions;
}

async function startGame() {
  if (state.started) return;
  state.started = true;
  await playCrocodileLine("hello");
}

async function resetGame() {
  state.started = false;
  state.busy = false;
  state.openedCount = 0;
  state.kids.forEach((kid) => { kid.opened = false; });
  stopAllAudio();
  hideOverlay();
  hideSpeech();
  hideFinishBadge();
  renderGifts();
}

async function onGiftClick(index, giftEl) {
  const kid = state.kids[index];
  if (!state.started || state.busy || kid.opened) return;

  state.busy = true;
  disableAllGifts();

  try {
    await playCrocodileLine("ask");

    giftEl.classList.add("opening");
    await wait(500);

    showOverlay(kid);
    await wait(2000);

    showPhotoFrame();
    await playAudio(kid.voice);

    hidePhotoFrame();
    await wait(250);

    hideOverlay();
    await wait(AFTER_KID_VOICE_DELAY_MS);

    await playCrocodileLine("thanks");

    kid.opened = true;
    giftEl.classList.remove("opening");
    giftEl.classList.add("opened");
    state.openedCount += 1;

    await wait(AFTER_THANKS_DELAY_MS);

    if (state.openedCount >= state.kids.length) {
      await playCrocodileLine("bye");
      showFinishBadge();
    }
  } finally {
    state.busy = false;
    enableAvailableGifts();
  }
}

function disableAllGifts() {
  document.querySelectorAll(".gift").forEach((gift) => gift.classList.add("disabled"));
}

function enableAvailableGifts() {
  document.querySelectorAll(".gift").forEach((gift, index) => {
    gift.classList.remove("disabled");
    if (state.kids[index]?.opened) {
      gift.classList.add("opened");
    }
  });
}

function showOverlay(kid) {
  els.kidPhoto.src = kid.photo;
  els.drawing.src = kid.drawing;
  els.overlay.classList.remove("hidden");
  hidePhotoFrame();
}

function hideOverlay() {
  hidePhotoFrame();
  els.overlay.classList.add("hidden");
}

function showSpeech(text) {
  els.speechBubble.textContent = text;
  els.speechBubble.classList.remove("hidden");
}

function hideSpeech() {
  els.speechBubble.classList.add("hidden");
}

function showFinishBadge() {
  els.finishBadge.classList.remove("hidden");
}

function hideFinishBadge() {
  els.finishBadge.classList.add("hidden");
}

async function playCrocodileLine(type) {
  showSpeech(SPEECH_TEXT[type] || "");
  els.hero.classList.add("hero-talking");
  await playAudio(state.staticAudio[type]);
  els.hero.classList.remove("hero-talking");
  hideSpeech();
}

async function playAudio(source) {
  const audio = typeof source === "string" ? new Audio(source) : source;
  audio.currentTime = 0;

  return new Promise((resolve) => {
    let finished = false;

    const done = () => {
      if (finished) return;
      finished = true;
      audio.removeEventListener("ended", done);
      audio.removeEventListener("error", done);
      resolve();
    };

    audio.addEventListener("ended", done);
    audio.addEventListener("error", done);

    audio.play().catch((error) => {
      console.warn("Не удалось воспроизвести аудио:", error);
      done();
    });
  });
}

function stopAllAudio() {
  Object.values(state.staticAudio).forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showPhotoFrame() {
  els.photoFrame.classList.add("visible");
}

function hidePhotoFrame() {
  els.photoFrame.classList.remove("visible");
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || window.matchMedia('(max-width: 768px)').matches;
}

const fullscreenBtn = document.getElementById('fullscreenBtn');

async function enterFullscreen() {
  const el = document.documentElement;

  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) { // Safari
      el.webkitRequestFullscreen();
    }
  } catch (err) {
    console.log('Fullscreen error:', err);
  }
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
}

// показываем кнопку только на мобилках
if (!isMobileDevice()) {
  fullscreenBtn.style.display = 'none';
}

fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    enterFullscreen();
  } else {
    exitFullscreen();
  }
});

// скрываем кнопку в fullscreen
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    fullscreenBtn.style.display = 'none';
  } else if (isMobileDevice()) {
    fullscreenBtn.style.display = 'block';
  }
});
