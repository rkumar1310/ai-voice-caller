import { useCallback, useEffect, useState } from "react";

export default function useAudioPlayback() {
    const [context, setContext] = useState<AudioContext | null>(null);
    const [audioBufferQueue, setAudioBufferQueue] = useState<AudioBuffer[]>([]);
    useEffect(() => {
        const audioContext = new AudioContext();
        setContext(audioContext);

        return () => {
            audioContext.close();
        };
    }, []);

    const enqueueAudioChunk = useCallback(
        (audioChunk: ArrayBuffer) => {
            if (!context) {
                return;
            }

            console.log("Decoding audio chunk");

            context.decodeAudioData(audioChunk).then((audioBuffer) => {
                if (!audioBuffer) {
                    return;
                }
                setAudioBufferQueue((prevAudioBufferQueue) => [
                    ...prevAudioBufferQueue,
                    audioBuffer,
                ]);
            });
        },
        [context]
    );

    useEffect(() => {
        console.log("Playing next audio chunk", audioBufferQueue, context);
        if (!context || !audioBufferQueue) {
            return;
        }
        if (audioBufferQueue.length > 0 && context.state !== "suspended") {
            console.log("Playing audio chunk");
            const audioBuffer = audioBufferQueue.shift();
            if (!audioBuffer) {
                return;
            }
            const source = context.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(context.destination);
            source.start();
            source.onended = () => {
                console.log("Audio chunk ended");
            };
        }
    }, [audioBufferQueue, context]);

    const stopAndClearAudio = useCallback(() => {
        if (!context) {
            return;
        }
        context.suspend();
        setAudioBufferQueue([]);
    }, [context]);

    return { context, enqueueAudioChunk, stopAndClearAudio };
}
