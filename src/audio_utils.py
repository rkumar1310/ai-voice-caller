import os
import wave
from pydub import AudioSegment
import numpy as np
from scipy.io import wavfile
import noisereduce as nr


async def save_audio_to_file(
    audio_data, file_name, audio_dir="audio_files", audio_format="wav", clip_thresh=-80
):
    """
    Saves the audio data to a file with optional noise reduction and audio clipping.

    :param audio_data: The audio data to save.
    :param file_name: The name of the file.
    :param audio_dir: Directory where audio files will be saved.
    :param audio_format: Format of the audio file.
    :param clip_thresh: Clipping threshold in dB.
    :return: Path to the saved audio file.
    """

    os.makedirs(audio_dir, exist_ok=True)

    file_path = os.path.join(audio_dir, file_name)

    # Save raw audio to file
    with wave.open(file_path, "wb") as wav_file:
        wav_file.setnchannels(1)  # Assuming mono audio
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        wav_file.writeframes(audio_data)

    # Load audio using pydub
    audio = AudioSegment.from_file(file_path, format=audio_format)

    # Clip audio below the threshold
    def clip_audio(audio_segment, threshold_db):
        samples = np.array(audio_segment.get_array_of_samples())
        max_amplitude = np.max(np.abs(samples))
        threshold_amplitude = max_amplitude * (10 ** (threshold_db / 20))

        # Apply clipping: set values below threshold to zero
        clipped_samples = np.where(np.abs(samples) < threshold_amplitude, 0, samples)
        return audio_segment._spawn(clipped_samples.tobytes())

    clipped_audio = clip_audio(audio, clip_thresh)

    # Save the clipped audio
    clipped_path = f"{os.path.splitext(file_path)[0]}_clipped.{audio_format}"
    clipped_audio.export(clipped_path, format=audio_format)

    # Perform noise reduction on clipped audio
    rate, data = wavfile.read(clipped_path)
    reduced_noise = nr.reduce_noise(y=data, sr=rate)

    # Save noise-reduced audio
    noise_reduced_path = (
        f"{os.path.splitext(clipped_path)[0]}_noise_reduced.{audio_format}"
    )
    wavfile.write(noise_reduced_path, rate, reduced_noise)

    return noise_reduced_path
