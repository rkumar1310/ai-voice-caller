class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.audioQueue = [];
        this.currentBuffer = null;
        this.offset = 0;

        this.port.onmessage = (event) => {
            if (event.data.type === "enqueue") {
                this.audioQueue.push(event.data.chunk);
            } else if (event.data.type === "clear") {
                this.audioQueue = [];
                this.currentBuffer = null;
                this.offset = 0;
            }
        };
    }

    process(inputs, outputs) {
        const output = outputs[0][0];

        for (let i = 0; i < output.length; i++) {
            if (
                !this.currentBuffer ||
                this.offset >= this.currentBuffer.length
            ) {
                if (this.audioQueue.length > 0) {
                    this.currentBuffer = this.audioQueue.shift();
                    this.offset = 0;
                } else {
                    output[i] = 0; // Output silence if no data available
                    continue;
                }
            }

            output[i] = this.currentBuffer[this.offset];
            this.offset++;
        }

        return true; // Keep the processor alive
    }
}

registerProcessor("audio-processor", AudioProcessor);
