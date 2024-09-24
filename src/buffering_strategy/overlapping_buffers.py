import asyncio
import json
import time

class OverlappingBuffers:
    def __init__(self, client, **kwargs):
        """
        Initialize the OverlappingBuffers buffering strategy.

        Args:
            client (Client): The client instance associated with this buffering strategy.
            **kwargs: Additional keyword arguments, including 'chunk_length_seconds' and 'overlap_seconds'.
        """
        self.client = client
        self.chunk_length_seconds = float(kwargs.get('chunk_length_seconds', 3))
        self.overlap_seconds = float(kwargs.get('overlap_seconds', 1))
        self.first_chunk_end_seconds = 1.0
        self.total_chunk_length = self.chunk_length_seconds + 2 * self.overlap_seconds

        
        self.buffers = []
        # if for example chunk_length_seconds = 3 and overlap_seconds = 1 it starts from -4, so the
        # first chunk will end at 1. the second one 
        self.next_start_time = 0

        # fill some buffers to start gracefully
        # %===|%
        #    %|===%
        #     |  %===%


        self.next_start_time = -self.total_chunk_length + self.first_chunk_end_seconds # 4
        
        while self.next_start_time <= 0:                
            new_buffer = {
                'start_time': max(self.next_start_time, 0),
                'data': bytearray(),
                'end_time': self.next_start_time + self.total_chunk_length
            }
            self.buffers.append(new_buffer)
            self.next_start_time += self.chunk_length_seconds        

        # Semaphore to manage concurrency when accessing buffer
        self.semaphore = asyncio.Semaphore(1)

    async def process_audio(self, websocket, vad_pipeline, asr_pipeline, postprocessing_pipeline):
        """
        Append audio data to the current or new buffer depending on the timings.

        Args:
            audio_data (bytes): The incoming audio data.
        """
        async with self.semaphore:
            buffers = self.buffers
            next_start_time = self.next_start_time
            sample_rate = self.client.sampling_rate
            chunk_length_in_bytes = int(self.chunk_length_seconds * sample_rate * self.client.samples_width)
            overlap_in_bytes = int(self.overlap_seconds * sample_rate * self.client.samples_width)

            # Determine if we need to start a new buffer
            if self.client.current_start_time >= next_start_time:
                # Start a new buffer accounting for overlap into the future
                new_buffer = {
                    'start_time': self.client.current_start_time,
                    'data': bytearray(self.client.buffer),
                    'end_time': self.client.current_start_time + self.total_chunk_length
                }
                buffers.append(new_buffer)
                # Schedule next start time after the current chunk minus the overlap
                self.next_start_time = self.client.current_start_time + self.chunk_length_seconds - self.overlap_seconds
            else:
                # Append to existing buffers if within their time frame
                for buffer in buffers:
                    if buffer['start_time'] <= self.client.current_start_time <= buffer['end_time']:
                        buffer['data'].extend(self.client.buffer)

            self.client.clear_buffer()

            # Process buffers ready for transcription
            for buffer in buffers[:]:
                if self.client.current_end_time >= buffer['end_time']:
                    await self.process_audio_async(buffer['start_time'], buffer['data'], websocket, asr_pipeline, postprocessing_pipeline)
                    buffers.remove(buffer)

    async def process_audio_async(self, buffer_start_time, buffer_data, websocket, asr_pipeline, postprocessing_pipeline):
        """
        Asynchronously process and transcribe audio data.

        Args:
            buffer_data (bytearray): The audio data to process.
        """
        self.client.scratch_buffer = buffer_data
        transcription = await asr_pipeline.transcribe(buffer_start_time, self.client)
        if transcription['text']:
            transcription['words'] = postprocessing_pipeline.process(transcription)
            transcription['full_text'] = postprocessing_pipeline.reconstruct()
            json_transcription = json.dumps(transcription)
            await websocket.send(json_transcription)
        self.client.increment_file_counter()
