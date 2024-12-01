/**
 * VoiceStreamAI Client - WebSocket-based real-time transcription
 *
 * Contributor:
 * - Alessandro Saccoia - alessandro.saccoia@gmail.com
 */

let websocket;
let context;
let processor;
let globalStream;
let isRecording = false;

const websocketAddress = document.querySelector("#websocketAddress");
const selectedLanguage = document.querySelector("#languageSelect");
const websocketStatus = document.querySelector("#webSocketStatus");
const connectButton = document.querySelector("#connectButton");
const startButton = document.querySelector("#startButton");
const stopButton = document.querySelector("#stopButton");
const transcriptionDiv = document.querySelector("#transcription");
const languageDiv = document.querySelector("#detected_language");
const processingTimeDiv = document.querySelector("#processing_time");
const panel = document.querySelector("#silence_at_end_of_chunk_options_panel");
const selectedStrategy = document.querySelector("#bufferingStrategySelect");
const chunk_length_seconds = document.querySelector("#chunk_length_seconds");
const chunk_offset_seconds = document.querySelector("#chunk_offset_seconds");
window.myApp = { speaking: false };

console.log("howdy");

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioBufferQueue = []; // Queue to manage audio chunks

// Handle user interaction to resume AudioContext
function resumeAudioContext() {
    if (audioContext.state === "suspended") {
        audioContext
            .resume()
            .then(() => {
                console.log("AudioContext resumed.");
            })
            .catch((err) => {
                console.error("Failed to resume AudioContext:", err);
            });
    }
}

// Add an event listener for user interaction
document.addEventListener("click", resumeAudioContext);
document.addEventListener("touchstart", resumeAudioContext);

websocketAddress.addEventListener("input", resetWebsocketHandler);

websocketAddress.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        connectWebsocketHandler();
    }
});

connectButton.addEventListener("click", connectWebsocketHandler);

function resetWebsocketHandler() {
    conmsole.log("resetWebsocketHandler");
    if (isRecording) {
        stopRecordingHandler();
    }
    if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
    }
    connectButton.disabled = false;
}

function connectWebsocketHandler() {
    if (!websocketAddress.value) {
        console.log("WebSocket address is required.");
        return;
    }

    websocket = new WebSocket(websocketAddress.value);
    websocket.onopen = () => {
        console.log("WebSocket connection established");
        websocketStatus.textContent = "Connected";
        startButton.disabled = false;
        connectButton.disabled = true;
        startRecordingHandler();
    };
    websocket.onclose = (event) => {
        console.log("WebSocket connection closed", event);
        websocketStatus.textContent = "Not Connected";
        startButton.disabled = true;
        stopButton.disabled = true;
        connectButton.disabled = false;
    };
    websocket.onmessage = async (event) => {
        // Check the type of the received data
        if (typeof event.data === "string") {
            // Handle as a string (e.g., JSON-transcribed text)
            console.log("Message from server:", event.data);
            try {
                const transcript_data = JSON.parse(event.data);
                updateTranscription(transcript_data);
            } catch (error) {
                console.error("Error parsing JSON:", error);
            }
        } else if (event.data instanceof ArrayBuffer) {
            // Handle audio chunk (ArrayBuffer)
            console.log("Received audio ArrayBuffer");
            const audioBuffer = await processTTSAudioChunk(event.data);
            if (audioBuffer) {
                audioBufferQueue.push(audioBuffer);
                playNextAudioChunk();
            }
        } else if (event.data instanceof Blob) {
            // Handle audio chunk (Blob)
            console.log("Received audio Blob");
            const arrayBuffer = await event.data.arrayBuffer();
            console.log("ArrayBuffer:", arrayBuffer);
            const audioBuffer = await processTTSAudioChunk(arrayBuffer);
            console.log("AudioBuffer:", audioBuffer);
            if (audioBuffer) {
                audioBufferQueue.push(audioBuffer);
                playNextAudioChunk();
            }
        } else {
            console.warn("Unknown data type received:", event.data);
        }
    };
}

// Decode the audio chunk
async function processTTSAudioChunk(audioData) {
    try {
        const audioBuffer = await audioContext.decodeAudioData(audioData);
        return audioBuffer;
    } catch (err) {
        console.error("Error decoding audio data:", err);
        return null;
    }
}

// Play the next audio chunk in the queue
function playNextAudioChunk() {
    console.log("Playing next audio chunk", audioBufferQueue, audioContext);
    if (audioBufferQueue.length > 0 && audioContext.state !== "suspended") {
        console.log("Playing audio chunk");
        const audioBuffer = audioBufferQueue.shift();
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();

        // Play the next chunk when the current one finishes
        source.onended = playNextAudioChunk;
    }
}

function updateTranscription(transcript_data) {
    if (
        Array.isArray(transcript_data.words) &&
        transcript_data.words.length > 0
    ) {
        // Append words with color based on their probability
        transcript_data.words.forEach((wordData) => {
            const span = document.createElement("span");
            const probability = wordData.probability;
            span.textContent = wordData.word + " ";

            // Set the color based on the probability
            if (probability > 0.9) {
                span.style.color = "green";
            } else if (probability > 0.6) {
                span.style.color = "orange";
            } else {
                span.style.color = "red";
            }

            transcriptionDiv.appendChild(span);
        });

        // Add a new line at the end
        transcriptionDiv.appendChild(document.createElement("br"));
    } else {
        // Fallback to plain text
        const span = document.createElement("span");
        span.textContent = transcript_data.text;
        transcriptionDiv.appendChild(span);
        transcriptionDiv.appendChild(document.createElement("br"));
    }

    // Update the language information
    if (transcript_data.language && transcript_data.language_probability) {
        languageDiv.textContent =
            transcript_data.language +
            " (" +
            transcript_data.language_probability.toFixed(2) +
            ")";
    } else {
        languageDiv.textContent = "Not Supported";
    }

    // Update the processing time, if available
    if (transcript_data.processing_time) {
        processingTimeDiv.textContent =
            "Processing time: " +
            transcript_data.processing_time.toFixed(2) +
            " seconds";
    }
}

startButton.addEventListener("click", startRecordingHandler);

function startRecordingHandler() {
    if (isRecording) return;
    isRecording = true;

    context = new AudioContext();

    let onSuccess = async (stream) => {
        // Push user config to server
        let language =
            selectedLanguage.value !== "multilingual"
                ? selectedLanguage.value
                : null;
        sendAudioConfig(language);

        globalStream = stream;

        const input = context.createMediaStreamSource(stream);

        const audioProcessor = new AudioProcessor();
        const recordingNode = await setupRecordingWorkletNode();
        recordingNode.port.onmessage = (event) => {
            // processAudio(event.data);
            audioProcessor.processAudio(event.data);
        };
        input.connect(recordingNode);
    };
    let onError = (error) => {
        console.error(error);
    };
    navigator.mediaDevices
        .getUserMedia({
            audio: {
                echoCancellation: true,
                autoGainControl: false,
                noiseSuppression: true,
                latency: 0,
            },
        })
        .then(onSuccess, onError);

    // Disable start button and enable stop button
    startButton.disabled = true;
    stopButton.disabled = false;
}

async function setupRecordingWorkletNode() {
    await context.audioWorklet.addModule("realtime-audio-processor.js");

    return new AudioWorkletNode(context, "realtime-audio-processor");
}

stopButton.addEventListener("click", stopRecordingHandler);

function stopRecordingHandler() {
    if (!isRecording) return;
    isRecording = false;

    if (globalStream) {
        globalStream.getTracks().forEach((track) => track.stop());
    }
    if (processor) {
        processor.disconnect();
        processor = null;
    }
    if (context) {
        context.close().then(() => (context = null));
    }
    startButton.disabled = false;
    stopButton.disabled = true;
}

function sendAudioConfig(language) {
    let processingArgs = {};

    if (selectedStrategy.value === "silence_at_end_of_chunk") {
        processingArgs = {
            chunk_length_seconds: parseFloat(chunk_length_seconds.value),
            chunk_offset_seconds: parseFloat(chunk_offset_seconds.value),
        };
    }

    const audioConfig = {
        type: "config",
        data: {
            sampleRate: context.sampleRate,
            channels: 1,
            language: language,
            processing_strategy: selectedStrategy.value,
            processing_args: processingArgs,
        },
    };

    websocket.send(JSON.stringify(audioConfig));
}

class AudioProcessor {
    constructor() {
        this.isSpeaking = false;
        this.currentChunk = [];
        this.silenceCounter = 0;
        this.speakingCounter = 0;
        this.currentDuration = 0;
        this.chunkLength = 0.5;
    }

    processAudio(sampleData) {
        const outputSampleRate = 16000;
        const decreaseResultBuffer = decreaseSampleRate(
            sampleData,
            context.sampleRate,
            outputSampleRate
        );

        console.log("duration", decreaseResultBuffer.length / outputSampleRate);

        // Compute RMS (Root Mean Square) for volume analysis
        const rms = Math.sqrt(
            decreaseResultBuffer.reduce((sum, sample) => sum + sample ** 2, 0) /
                decreaseResultBuffer.length
        );
        if (rms > 0.06) {
            this.speakingCounter += 1;
        } else {
            this.silenceCounter += 1;
        }
        const audioData = convertFloat32ToInt16(decreaseResultBuffer);

        this.currentDuration += decreaseResultBuffer.length / outputSampleRate;
        this.currentChunk.push(audioData);

        if (this.currentDuration >= parseFloat(this.chunkLength)) {
            // check if we have enough speaking data
            if (this.speakingCounter / this.currentDuration > 0.1) {
                // send the chunk
                console.log("Sending chunk");
                this.sendChunk();
                this.resetState();
                this.speaking = true;
            } else {
                if (this.speaking) {
                    // still send the chunk for silence padding
                    console.log("Sending chunk");
                    this.sendChunk();
                    this.sendStopTalking();
                    this.resetState();
                    this.speaking = false;
                }
                console.log("Discarding chunk");
                this.resetState();
            }
        }
    }
    sendChunk() {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            for (let i = 0; i < this.currentChunk.length; i++) {
                console.log("Sending chunk", this.currentChunk[i]);
                websocket.send(this.currentChunk[i]);
            }
        }
    }

    sendStopTalking() {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(
                JSON.stringify({
                    type: "stop_talking",
                })
            );
        }
    }

    resetState() {
        this.silenceCounter = 0;
        this.speakingCounter = 0;
        this.currentDuration = 0;
        this.currentChunk = [];
    }
}

function decreaseSampleRate(buffer, inputSampleRate, outputSampleRate) {
    if (inputSampleRate < outputSampleRate) {
        console.error("Sample rate too small.");
        return;
    } else if (inputSampleRate === outputSampleRate) {
        return;
    }

    let sampleRateRatio = inputSampleRate / outputSampleRate;
    let newLength = Math.ceil(buffer.length / sampleRateRatio);
    let result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        let nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        let accum = 0,
            count = 0;
        for (
            let i = offsetBuffer;
            i < nextOffsetBuffer && i < buffer.length;
            i++
        ) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = accum / count;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

function convertFloat32ToInt16(buffer) {
    let l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
        buf[l] = Math.min(1, buffer[l]) * 0x7fff;
    }
    return buf.buffer;
}

// Initialize WebSocket on page load
//  window.onload = initWebSocket;

function toggleBufferingStrategyPanel() {
    if (selectedStrategy.value === "silence_at_end_of_chunk") {
        panel.classList.remove("hidden");
    } else {
        panel.classList.add("hidden");
    }
}
