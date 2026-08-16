/* =========================================================
   APMaths - OpenAI Text to Speech
   script.js
   ========================================================= */

"use strict";


/* =========================================================
   DOM Elements
   ========================================================= */

const textInput = document.getElementById("textInput");
const charCount = document.getElementById("charCount");

const voiceSelect = document.getElementById("voiceSelect");

const speedRange = document.getElementById("speedRange");
const speedValue = document.getElementById("speedValue");

const instructionsInput = document.getElementById("instructionsInput");

const generateButton = document.getElementById("generateButton");
const stopButton = document.getElementById("stopButton");

const status = document.getElementById("status");

const audioSection = document.getElementById("audioSection");
const audioPlayer = document.getElementById("audioPlayer");
const downloadButton = document.getElementById("downloadButton");

const currentYear = document.getElementById("currentYear");


/* =========================================================
   State
   ========================================================= */

let currentAudioUrl = null;


/* =========================================================
   Character Counter
   ========================================================= */

function updateCharacterCount() {

    const count = textInput.value.length;

    charCount.textContent =
        `${count.toLocaleString("vi-VN")} ký tự`;
}

textInput.addEventListener("input", updateCharacterCount);


/* =========================================================
   Speed
   ========================================================= */

function updateSpeed() {

    const speed = Number(speedRange.value);

    speedValue.textContent = `${speed.toFixed(1)}×`;
}

speedRange.addEventListener("input", updateSpeed);


/* =========================================================
   Status
   ========================================================= */

function setStatus(message, type = "") {

    status.textContent = message;

    status.className = "status";

    if (type) {
        status.classList.add(type);
    }
}


/* =========================================================
   Generate Speech
   ========================================================= */

async function generateSpeech() {

    const text = textInput.value.trim();

    if (!text) {

        setStatus(
            "Vui lòng nhập văn bản trước khi tạo giọng nói.",
            "error"
        );

        textInput.focus();

        return;
    }


    const voice = voiceSelect.value;
    const speed = Number(speedRange.value);
    const instructions = instructionsInput.value.trim();


    /*
     * -------------------------------------------------------
     * TODO:
     * Gọi backend của APMaths.
     *
     * Ví dụ:
     *
     * const response = await fetch("/api/tts", {
     *     method: "POST",
     *     headers: {
     *         "Content-Type": "application/json"
     *     },
     *     body: JSON.stringify({
     *         text,
     *         voice,
     *         speed,
     *         instructions
     *     })
     * });
     *
     * Backend sẽ gọi OpenAI TTS API và trả về audio.
     * -------------------------------------------------------
     */


    setStatus(
        "Chức năng OpenAI TTS sẽ được kết nối ở bước tiếp theo."
    );

    console.log("TTS request:", {
        text,
        voice,
        speed,
        instructions
    });
}


/* =========================================================
   Stop Audio
   ========================================================= */

function stopAudio() {

    audioPlayer.pause();

    audioPlayer.currentTime = 0;

    stopButton.disabled = true;
}


/* =========================================================
   Generate Button
   ========================================================= */

generateButton.addEventListener(
    "click",
    generateSpeech
);


/* =========================================================
   Stop Button
   ========================================================= */

stopButton.addEventListener(
    "click",
    stopAudio
);


/* =========================================================
   Audio Events
   ========================================================= */

audioPlayer.addEventListener(
    "play",
    () => {
        stopButton.disabled = false;
    }
);


audioPlayer.addEventListener(
    "ended",
    () => {
        stopButton.disabled = true;
    }
);


/* =========================================================
   Create Audio
   ========================================================= */

function setAudioSource(blob) {

    /*
     * Xóa URL audio cũ nếu có.
     */

    if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
    }


    /*
     * Tạo URL mới.
     */

    currentAudioUrl = URL.createObjectURL(blob);

    audioPlayer.src = currentAudioUrl;

    downloadButton.href = currentAudioUrl;

    audioSection.hidden = false;

    stopButton.disabled = false;
}


/* =========================================================
   Cleanup
   ========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl);
        }

    }
);


/* =========================================================
   Current Year
   ========================================================= */

currentYear.textContent = new Date().getFullYear();


/* =========================================================
   Initial State
   ========================================================= */

updateCharacterCount();
updateSpeed();
