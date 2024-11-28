import { useCallback, useEffect, useState } from "react";

export default function useAudioInputProcessor({
    context,
    sendWebsocketMessage,
}: {
    context: AudioContext | null;
    sendWebsocketMessage: (message: ArrayBufferLike | string) => void;
}) {
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
    const [currentChunk, setCurrentChunk] = useState<ArrayBufferLike[]>([]);
    const [silenceCounter, setSilenceCounter] = useState<number>(0);
    const [speakingCounter, setSpeakingCounter] = useState<number>(0);
    const [currentDuration, setCurrentDuration] = useState<number>(0);
    const [chunkLength] = useState<number>(1.5);

    const processAudio = useCallback(
        (sampleData: Float32Array) => {
            if (!context) {
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

            // Compute RMS (Root Mean Square) for volume analysis
            const rms = Math.sqrt(
                decreaseResultBuffer.reduce(
                    (sum, sample) => sum + sample ** 2,
                    0
                ) / decreaseResultBuffer.length
            );
            if (rms > 0.06) {
                setSpeakingCounter((prev) => prev + 1);
            } else {
                setSilenceCounter((prev) => prev + 1);
            }
            const audioData = convertFloat32ToInt16(decreaseResultBuffer);

            setCurrentDuration(
                (prev) => prev + decreaseResultBuffer.length / outputSampleRate
            );
            setCurrentChunk((prev) => [...prev, audioData]);
        },
        [context]
    );

    const sendChunk = useCallback(() => {
        for (let i = 0; i < currentChunk.length; i++) {
            sendWebsocketMessage(currentChunk[i]);
        }
    }, [currentChunk, sendWebsocketMessage]);

    const sendStopTalking = useCallback(() => {
        sendWebsocketMessage(
            JSON.stringify({
                type: "stop_talking",
            })
        );
    }, [sendWebsocketMessage]);

    useEffect(() => {
        if (currentDuration >= chunkLength) {
            if (speakingCounter / speakingCounter + silenceCounter > 0.1) {
                sendChunk();
                resetState();
                setIsSpeaking(true);
            } else {
                if (isSpeaking) {
                    sendChunk();
                    sendStopTalking();
                    resetState();
                    setIsSpeaking(false);
                }
                resetState();
            }
        }
    }, [
        chunkLength,
        currentDuration,
        isSpeaking,
        sendChunk,
        sendStopTalking,
        silenceCounter,
        speakingCounter,
    ]);

    const decreaseSampleRate = (
        buffer: Float32Array,
        inputSampleRate: number,
        outputSampleRate: number
    ) => {
        if (inputSampleRate < outputSampleRate) {
            console.error("Sample rate too small.");
            return;
        } else if (inputSampleRate === outputSampleRate) {
            return;
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

    const resetState = () => {
        setCurrentChunk([]);
        setSilenceCounter(0);
        setSpeakingCounter(0);
        setCurrentDuration(0);
    };

    return { processAudio };
}
