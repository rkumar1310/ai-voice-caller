import os
import numpy as np
import soundfile as sf
import librosa
from pyannote.core import Segment
from os import remove
from .vad_interface import VADInterface
from audio_utils import save_audio_to_file

TEMP_DIRECTORY = 'audio_files/'

class DemucsVAD(VADInterface):
    def __init__(self, **kwargs):
        """
        Initializes Demucs's VAD pipeline.

        Args:
            silence_time (float): Time threshold for detecting silence.
            rms_threshold (float): RMS value below which the segment is considered silent.
        """
        self.silence_time = kwargs.get('silence_time', 0.5)
        self.rms_threshold = kwargs.get('rms_threshold', 0.02)  # RMS threshold for silence
        print("Initialized DemucsVAD")

    async def detect_activity(self, client):
        print("sdaasdasdasciao")
        audio_file_path = await save_audio_to_file(client.scratch_buffer, client.get_file_name())

        print("ciao2")
        # Isolate vocals from the rest of the audio using Demucs
        return_code = os.system(
            f'python3 -m demucs.separate -n htdemucs --two-stems=vocals "{audio_file_path}" -o "{TEMP_DIRECTORY}"'
        )

        print("ciao3")
        vocals_file_path = os.path.join(
            TEMP_DIRECTORY,
            "htdemucs",
            os.path.splitext(os.path.basename(audio_file_path))[0],
            "vocals.wav"
        )

        print(vocals_file_path)

        no_vocals_file_path = os.path.join(
            TEMP_DIRECTORY,
            "htdemucs",
            os.path.splitext(os.path.basename(audio_file_path))[0],
            "no_vocals.wav"
        )

        # Perform voice activity detection on the "vocals.wav" file
        vad_segments = self.detect_silence_segments(vocals_file_path)

        # Clean up
        #remove(audio_file_path)
        #remove(vocals_file_path)
        #remove(no_vocals_file_path)

        return vad_segments

    def detect_silence_segments(self, audio_file_path):
        """
        Detects silence and segments the audio file into non-silent segments.
    
        Args:
            audio_file_path (str): Path to the audio file to analyze.
    
        Returns:
            list: List of dictionaries containing the start and end times of each speech segment.
        """
        # Load the audio file
        audio, sr = sf.read(audio_file_path)
    
        # Calculate the frame-wise RMS values
        frame_length = int(self.silence_time * sr)
        hop_length = frame_length // 2  # 50% overlap between frames
        rms = librosa.feature.rms(y=audio, frame_length=frame_length, hop_length=hop_length)[0]
    
        # Identify non-silent frames (RMS above the threshold)
        non_silent_frames = np.where(rms > self.rms_threshold)[0]
    
        # Convert frame indices to time
        times = librosa.frames_to_time(non_silent_frames, sr=sr, hop_length=hop_length)
    
        # Group continuous non-silent frames into segments
        vad_segments = []
        if len(times) > 0:
            start = times[0]
            for i in range(1, len(times)):
                if times[i] - times[i-1] > self.silence_time:
                    end = times[i-1]
                    # Only append segments that are longer than or equal to self.silence_time
                    if end - start >= self.silence_time:
                        vad_segments.append({"start": start, "end": end, "confidence": 1.0})
                    start = times[i]
            # Append the last segment if it meets the condition
            if times[-1] - start >= self.silence_time:
                vad_segments.append({"start": start, "end": times[-1], "confidence": 1.0})

        print(vad_segments)
        return vad_segments

