import os
import wave


async def save_audio_to_file(
    audio_data, file_name, audio_dir="audio_files", audio_format="wav"
):
    """
    Saves the audio data to a file.

    :param audio_data: The audio data to save.
    :param file_name: The name of the file.
    :param audio_dir: Directory where audio files will be saved.
    :param audio_format: Format of the audio file.
    :return: Path to the saved audio file.
    """

    os.makedirs(audio_dir, exist_ok=True)

    file_path = os.path.join(audio_dir, file_name)

    with wave.open(file_path, "wb") as wav_file:
        wav_file.setnchannels(1)  # Assuming mono audio
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        wav_file.writeframes(audio_data)

    # load the audio file for noise reduction
    from scipy.io import wavfile
    import noisereduce as nr

    # load data
    rate, data = wavfile.read(file_path)

    # change file name
    base, ext = os.path.splitext(file_path)
    noise_reduced_path = f"{base}_noise_reduced{ext}"

    # perform noise reduction
    reduced_noise = nr.reduce_noise(y=data, sr=rate)
    wavfile.write(noise_reduced_path, rate, reduced_noise)

    return file_path
