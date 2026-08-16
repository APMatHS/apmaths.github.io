/* =========================================================
   APMaths - Gemini Text to Speech
   script.js
   ========================================================= */

"use strict";


/* =========================================================
   Configuration
   ========================================================= */

const WORKER_URL =
    "https://apmaths-openai-tts.hoangnam-sp101.workers.dev/";


/* =========================================================
   DOM Elements
   ========================================================= */

const textInput =
    document.getElementById("textInput");

const charCount =
    document.getElementById("charCount");

const modelSelect =
    document.getElementById("modelSelect");

const voiceSelect =
    document.getElementById("voiceSelect");

const speedRange =
    document.getElementById("speedRange");

const speedValue =
    document.getElementById("speedValue");

const instructionsInput =
    document.getElementById("instructionsInput");

const generateButton =
    document.getElementById("generateButton");

const stopButton =
    document.getElementById("stopButton");

const status =
    document.getElementById("status");

const audioSection =
    document.getElementById("audioSection");

const audioPlayer =
    document.getElementById("audioPlayer");

const downloadButton =
    document.getElementById("downloadButton");

const currentYear =
    document.getElementById("currentYear");


/* =========================================================
   State
   ========================================================= */

let currentAudioUrl = null;

let currentController = null;


/* =========================================================
   Character Counter
   ========================================================= */

function updateCharacterCount() {

    const count =
        textInput.value.length;

    charCount.textContent =
        `${count.toLocaleString("vi-VN")} ký tự`;
}


textInput.addEventListener(
    "input",
    updateCharacterCount
);


/* =========================================================
   Speed
   ========================================================= */

function updateSpeed() {

    const speed =
        Number(speedRange.value);

    speedValue.textContent =
        `${speed.toFixed(1)}×`;
}


speedRange.addEventListener(
    "input",
    updateSpeed
);


/* =========================================================
   Status
   ========================================================= */

function setStatus(
    message,
    type = ""
) {

    status.textContent =
        message;

    status.className =
        "status";

    if (type) {
        status.classList.add(type);
    }
}


/* =========================================================
   Button State
   ========================================================= */

function setGeneratingState(
    isGenerating
) {

    generateButton.disabled =
        isGenerating;

    stopButton.disabled =
        !isGenerating;

    if (isGenerating) {

        generateButton.textContent =
            "⏳ Đang tạo...";

    } else {

        generateButton.textContent =
            "🔊 Tạo giọng nói";

    }
}


/* =========================================================
   Generate Speech
   ========================================================= */

async function generateSpeech() {

    const text =
        textInput.value.trim();


    /* =============================================
       Validate text
       ============================================= */

    if (!text) {

        setStatus(
            "Vui lòng nhập văn bản trước khi tạo giọng nói.",
            "error"
        );

        textInput.focus();

        return;
    }


    /* =============================================
       Get settings
       ============================================= */

    const model =
        modelSelect.value;

    const voice =
        voiceSelect.value;

    const speed =
        Number(speedRange.value);

    const instructions =
        instructionsInput.value.trim();


    /* =============================================
       Abort previous request
       ============================================= */

    if (currentController) {

        currentController.abort();

    }


    currentController =
        new AbortController();


    /* =============================================
       Start loading
       ============================================= */

    setGeneratingState(true);

    setStatus(
        "Đang tạo giọng nói..."
    );


    try {

        /* =========================================
           Request Worker
           ========================================= */

        const response =
            await fetch(
                WORKER_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        text,

                        model,

                        voice,

                        speed,

                        instructions

                    }),

                    signal:
                        currentController.signal
                }
            );


        /* =========================================
           Handle HTTP error
           ========================================= */

        if (!response.ok) {

            let errorMessage =
                `Lỗi HTTP ${response.status}.`;

            try {

                const errorData =
                    await response.json();

                if (errorData.error) {

                    errorMessage =
                        errorData.error;

                }

                if (errorData.details) {

                    errorMessage +=
                        ` ${errorData.details}`;

                }

            } catch {
                /* Response is not JSON */
            }


            throw new Error(
                errorMessage
            );

        }


        /* =========================================
           Get audio
           ========================================= */

        const audioBlob =
            await response.blob();


        if (
            !audioBlob ||
            audioBlob.size === 0
        ) {

            throw new Error(
                "Không nhận được dữ liệu audio."
            );

        }


        /* =========================================
           Set audio
           ========================================= */

        setAudioSource(
            audioBlob
        );


        setStatus(
            "Đã tạo giọng nói thành công.",
            "success"
        );


        /* =========================================
           Optional: play automatically
           ========================================= */

        try {

            await audioPlayer.play();

        } catch {
            /*
             * Trình duyệt có thể chặn
             * autoplay. Audio vẫn sẵn sàng.
             */
        }


    } catch (error) {

        /* =========================================
           Abort
           ========================================= */

        if (
            error.name ===
            "AbortError"
        ) {

            setStatus(
                "Đã dừng tạo giọng nói."
            );

            return;

        }


        /* =========================================
           Error
           ========================================= */

        console.error(
            "TTS error:",
            error
        );

        setStatus(
            error.message ||
            "Không thể tạo giọng nói.",
            "error"
        );


    } finally {

        setGeneratingState(
            false
        );

        currentController =
            null;

    }
}


/* =========================================================
   Stop
   ========================================================= */

function stopAudio() {

    /* =============================================
       Cancel network request
       ============================================= */

    if (currentController) {

        currentController.abort();

        currentController =
            null;

    }


    /* =============================================
       Stop audio
       ============================================= */

    audioPlayer.pause();

    audioPlayer.currentTime =
        0;


    setGeneratingState(
        false
    );

    setStatus(
        "Đã dừng."
    );
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

        stopButton.disabled =
            false;

    }
);


audioPlayer.addEventListener(
    "ended",
    () => {

        stopButton.disabled =
            true;

    }
);


/* =========================================================
   Create Audio Source
   ========================================================= */

function setAudioSource(
    blob
) {

    /* =============================================
       Remove old audio URL
       ============================================= */

    if (currentAudioUrl) {

        URL.revokeObjectURL(
            currentAudioUrl
        );

    }


    /* =============================================
       Create new URL
       ============================================= */

    currentAudioUrl =
        URL.createObjectURL(
            blob
        );


    /* =============================================
       Set player
       ============================================= */

    audioPlayer.src =
        currentAudioUrl;


    /* =============================================
       Set download link
       ============================================= */

    downloadButton.href =
        currentAudioUrl;

    downloadButton.download =
        "gemini-tts.wav";


    /* =============================================
       Show audio section
       ============================================= */

    audioSection.hidden =
        false;

}


/* =========================================================
   Cleanup
   ========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (currentAudioUrl) {

            URL.revokeObjectURL(
                currentAudioUrl
            );

        }

    }
);


/* =========================================================
   Current Year
   ========================================================= */

currentYear.textContent =
    new Date().getFullYear();


/* =========================================================
   Initial State
   ========================================================= */

updateCharacterCount();

updateSpeed();

setGeneratingState(false);
