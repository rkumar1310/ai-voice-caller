import { useCallback } from "react";

export default function useAudioInputProcessor(
    context: AudioContext | null,
    sendWebsocketMessage: (message: ArrayBufferLike | string) => void
) {
    const sendChunk = useCallback(
        (audioData: ArrayBufferLike) => {
            sendWebsocketMessage(audioData);
        },
        [sendWebsocketMessage]
    );

    const processAudio = useCallback(
        (sampleData: Float32Array) => {
            if (!context) {
                console.error("Audio context not initialized");
                return;
            }
            const outputSampleRate = 16000;
            const decreaseResultBuffer = decreaseSampleRate(
                sampleData,
                context.sampleRate,
                outputSampleRate
            );

            if (!decreaseResultBuffer) {
                throw new Error("Error decreasing sample rate");
            }

            const audioData = convertFloat32ToInt16(decreaseResultBuffer);
            sendChunk(audioData);
        },
        [context, sendChunk]
    );

    const decreaseSampleRate = (
        buffer: Float32Array,
        inputSampleRate: number,
        outputSampleRate: number
    ) => {
        if (inputSampleRate < outputSampleRate) {
            console.error("Sample rate too small.");
            return;
        } else if (inputSampleRate === outputSampleRate) {
            return buffer;
        }

        const sampleRateRatio = inputSampleRate / outputSampleRate;
        const newLength = Math.ceil(buffer.length / sampleRateRatio);
        const result = new Float32Array(newLength);
        let offsetResult = 0;
        let offsetBuffer = 0;
        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round(
                (offsetResult + 1) * sampleRateRatio
            );
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
    };

    const convertFloat32ToInt16 = (buffer: Float32Array) => {
        let l = buffer.length;
        const buf = new Int16Array(l);
        while (l--) {
            buf[l] = Math.min(1, buffer[l]) * 0x7fff;
        }
        return buf.buffer;
    };

    return { processAudio };
}
