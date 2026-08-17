/* =========================================================
   APMaths - Gemini Text to Speech
   script.js
   ========================================================= */

"use strict";

/* =========================================================
   Configuration
   ========================================================= */

const WORKER_URL = "https://apmaths-openai-tts.hoangnam-sp101.workers.dev/";

/* =========================================================
   DOM Elements
   ========================================================= */

const textInput = document.getElementById("textInput");
const charCount = document.getElementById("charCount");
const modelSelect = document.getElementById("modelSelect");
const engineSelect = document.getElementById("engineSelect");
const voiceSelect = document.getElementById("voiceSelect");
const profileSelect = document.getElementById("profileSelect");
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
let currentController = null;

/* =========================================================
   Gemini TTS Voices
   ========================================================= */

const GEMINI_VOICES = [
    { value: "Achernar", label: "Achernar — Dịu êm" },
    { value: "Achird", label: "Achird — Thân thiện" },
    { value: "Algenib", label: "Algenib — Khàn" },
    { value: "Algieba", label: "Algieba — Mượt" },
    { value: "Alnilam", label: "Alnilam — Cứng cáp" },
    { value: "Aoede", label: "Aoede — Thoáng" },
    { value: "Autonoe", label: "Autonoe — Tươi sáng" },
    { value: "Callirrhoe", label: "Callirrhoe — Dễ chịu" },
    { value: "Charon", label: "Charon — Thông tin" },
    { value: "Despina", label: "Despina — Mượt" },
    { value: "Enceladus", label: "Enceladus — Hơi thở" },
    { value: "Erinome", label: "Erinome — Rõ ràng" },
    { value: "Fenrir", label: "Fenrir — Mạnh mẽ" },
    { value: "Gacrux", label: "Gacrux — Trưởng thành" },
    { value: "Iapetus", label: "Iapetus — Rõ ràng" },
    { value: "Laomedeia", label: "Laomedeia — Rộn ràng" },
    { value: "Leda", label: "Leda — Trẻ trung" },
    { value: "Orus", label: "Orus — Cứng cáp" },
    { value: "Puck", label: "Puck — Rộn ràng" },
    { value: "Pulcherrima", label: "Pulcherrima — Tiến về phía trước" },
    { value: "Rasalgethi", label: "Rasalgethi — Thông tin" },
    { value: "Sadachbia", label: "Sadachbia — Sinh động" },
    { value: "Sadaltager", label: "Sadaltager — Hiểu biết" },
    { value: "Schedar", label: "Schedar — Cân bằng" },
    { value: "Sulafat", label: "Sulafat — Ấm áp" },
    { value: "Umbriel", label: "Umbriel — Dễ chịu" },
    { value: "Vindemiatrix", label: "Vindemiatrix — Dịu dàng" },
    { value: "Zephyr", label: "Zephyr — Tươi sáng" },
    { value: "Zubenelgenubi", label: "Zubenelgenubi — Tự nhiên" },
    { value: "Kore", label: "Kore — Chắc chắn" }
];

/* =========================================================
   Update Voice List
   ========================================================= */

function updateVoiceList() {
    const previousVoice = voiceSelect.value;
    const voices = GEMINI_VOICES;

    /* Clear current options */
    voiceSelect.innerHTML = "";

    /* Add voices */
    voices.forEach(voice => {
        const option = document.createElement("option");
        option.value = voice.value;
        option.textContent = voice.label;
        voiceSelect.appendChild(option);
    });

    /* Restore previous voice */
    const exists = voices.some(voice => voice.value === previousVoice);

    if (exists) {
        voiceSelect.value = previousVoice;
    } else {
        voiceSelect.value = "Achernar";
    }
}

/* =========================================================
   Model Change
   ========================================================= */

modelSelect.addEventListener("change", () => {
    updateVoiceList();
    setStatus("");
});

/* =========================================================
   Character Counter
   ========================================================= */

function updateCharacterCount() {
    const count = textInput.value.length;
    charCount.textContent = `${count.toLocaleString("vi-VN")} ký tự`;
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
   Button State
   ========================================================= */

function setGeneratingState(isGenerating) {
    generateButton.disabled = isGenerating;
    stopButton.disabled = !isGenerating;

    if (isGenerating) {
        generateButton.textContent = "⏳ Đang tạo...";
    } else {
        generateButton.textContent = "🔊 Tạo giọng nói";
    }
}

/* =========================================================
   Generate Speech
   ========================================================= */

async function generateSpeech() {
    const originalText = textInput.value.trim();

   const text =
    APMathsMathSpeech.mathTextToSpeech(
        originalText
    );
   
    const profile = profileSelect.value;

    /* Validate */
    if (!text) {
        setStatus("Vui lòng nhập văn bản trước khi tạo giọng nói.", "error");
        textInput.focus();
        return;
    }

    /* Get settings */
    const model = modelSelect.value;
   const engine = engineSelect.value;
    const voice = voiceSelect.value;
    const speed = Number(speedRange.value);
    const instructions = instructionsInput.value.trim();

    /* Abort previous request */
    if (currentController) {
        currentController.abort();
    }

    currentController = new AbortController();

    /* Loading */
    setGeneratingState(true);
    setStatus("Đang tạo giọng nói...");

    try {
        /* Call Worker */
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                engine,
                text,
                model,
                voice,
                profile,
                speed,
                instructions
            }),
            signal: currentController.signal
        });

        /* HTTP error */

if (!response.ok) {

    let errorMessage =
        `Lỗi HTTP ${response.status}.`;

    try {

        const errorData =
            await response.json();

        if (
            typeof errorData.details === "object" &&
            errorData.details !== null
        ) {

            const geminiError =
                errorData.details.error;

            if (
                geminiError &&
                geminiError.message
            ) {

                errorMessage =
                    geminiError.message;

            } else {

                errorMessage +=
                    ` ${JSON.stringify(
                        errorData.details
                    )}`;

            }

        } else if (
            errorData.details
        ) {

            errorMessage +=
                ` ${errorData.details}`;

        } else if (
            errorData.error
        ) {

            errorMessage =
                errorData.error;

        }

    } catch {

        /* Response không phải JSON. */

    }

    throw new Error(errorMessage);
}

        /* Audio */
        const audioBlob = await response.blob();

        if (!audioBlob || audioBlob.size === 0) {
            throw new Error("Không nhận được dữ liệu audio.");
        }

        /* Set audio */
        setAudioSource(audioBlob);
        setStatus("Đã tạo giọng nói thành công.", "success");

        /* Try autoplay */
        try {
            await audioPlayer.play();
        } catch {
            /* Browser có thể chặn autoplay. Người dùng vẫn có thể bấm Play. */
        }
    } catch (error) {
        /* Abort */
        if (error.name === "AbortError") {
            setStatus("Đã dừng tạo giọng nói.");
            return;
        }

        /* Error */
        console.error("TTS error:", error);
        setStatus(error.message || "Không thể tạo giọng nói.", "error");
    } finally {
        setGeneratingState(false);
        currentController = null;
    }
}

/* =========================================================
   Stop Audio
   ========================================================= */

function stopAudio() {
    /* Cancel request */
    if (currentController) {
        currentController.abort();
        currentController = null;
    }

    /* Stop player */
    audioPlayer.pause();
    audioPlayer.currentTime = 0;

    setGeneratingState(false);
    setStatus("Đã dừng.");
}

/* =========================================================
   Generate Button
   ========================================================= */

generateButton.addEventListener("click", generateSpeech);

/* =========================================================
   Stop Button
   ========================================================= */

stopButton.addEventListener("click", stopAudio);

/* =========================================================
   Audio Events
   ========================================================= */

audioPlayer.addEventListener("play", () => {
    stopButton.disabled = false;
});

audioPlayer.addEventListener("ended", () => {
    stopButton.disabled = true;
});

/* =========================================================
   Set Audio Source
   ========================================================= */

function setAudioSource(blob) {
    /* Revoke old URL */
    if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
    }

    /* Create URL */
    currentAudioUrl = URL.createObjectURL(blob);

    /* Audio player */
    audioPlayer.src = currentAudioUrl;

    /* Download */
    downloadButton.href = currentAudioUrl;
    downloadButton.download = "gemini-tts.wav";

    /* Show audio section */
    audioSection.hidden = false;
}

/* =========================================================
   Cleanup
   ========================================================= */

window.addEventListener("beforeunload", () => {
    if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
    }
});

/* =========================================================
   Current Year
   ========================================================= */

currentYear.textContent = new Date().getFullYear();

/* =========================================================
   Initial State
   ========================================================= */

updateVoiceList();
updateCharacterCount();
updateSpeed();
setGeneratingState(false);
