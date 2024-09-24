import json
import argparse

class RuleBasedSpeechProcessor1:
    def __init__(self, max_frames=2):
        # Maximum number of previous frames to consider for overlap resolution
        self.max_frames = max_frames
        # Buffer to hold the last N frames
        self.frame_buffer = []
        # Current best reconstruction of the speech as a list of words
        self.current_text = []

    def process(self, chunk_data):
        # Directly use the dictionary, assuming `chunk_data` is already a dictionary
        # Add the new chunk to the buffer
        self.frame_buffer.append(chunk_data)
        # Ensure we only keep the last N frames in the buffer
        if len(self.frame_buffer) > self.max_frames:
            self.frame_buffer.pop(0)

        # Flatten all words from the current buffer
        all_words = []
        for frame in self.frame_buffer:
            all_words.extend(frame['words'])

        # Merge words considering overlaps
        final_words = self.merge_words(all_words)

        # Generate the list of cleaned words
        new_text = [word['word'].strip() for word in final_words]

        # Compare and print only changes
        self.print_changes(new_text)
        self.current_text = new_text

        return self.current_text

    def merge_words(self, words):
        merged = []
        words.sort(key=lambda x: x['start'])  # Sort words by their start time

        for word in words:
            if not merged or (merged[-1]['end'] - 0.1) < word['start']:
                merged.append(word)  # No overlap, just add the word
            else:
                # Overlapping word, choose the one with the higher probability
                if merged[-1]['probability'] < word['probability']:
                    merged[-1] = word

        return merged
    
    def print_changes(self, new_text):
        # Convert the list of words into a string for simpler comparison and output
        new_text_str = ' '.join(new_text).lower()  # Use lower case to standardize comparison
        current_text_str = ' '.join(self.current_text).lower()
    
        if not self.current_text:  # First run
            print("Initial stitched text:", new_text_str)
            self.current_text = new_text  # Update the current text for the next comparison
            return
    
        # Split texts into words for word-level comparison
        current_words = current_text_str.split()
        new_words = new_text_str.split()
    
        # Finding changes by comparing the two lists of words
        changes = []
        c_index, n_index = 0, 0
        while n_index < len(new_words):
            if c_index < len(current_words) and current_words[c_index] == new_words[n_index]:
                c_index += 1  # Word matches, move to the next word in both lists
            else:
                changes.append(new_words[n_index])
            n_index += 1  # Always move to the next word in new_words
    
        if changes:
            print("Changes:", ' '.join(changes))
    
        # Update the current text for the next comparison
        self.current_text = new_text if changes else self.current_text


def levenshtein_distance(a, b):
    """Computes the Levenshtein distance between two strings."""
    n, m = len(a), len(b)
    if n > m:
        # Make sure n <= m to use O(min(n,m)) space
        a, b = b, a
        n, m = m, n

    current = range(n+1)
    for i in range(1, m+1):
        previous, current = current, [i] + [0] * n
        for j in range(1, n+1):
            add, delete = previous[j] + 1, current[j-1] + 1
            change = previous[j-1]
            if a[j-1] != b[i-1]:
                change = change + 1
            current[j] = min(add, delete, change)
            
    return current[n]

class RuleBasedSpeechProcessor2:
    def __init__(self, max_frames):
        self.current_text = []

    def process(self, chunk_data):
        words = chunk_data['words']
        words.sort(key=lambda x: x['start'])

        words_to_return = []
        for word_info in words:
            self.current_text, added_merged = self.merge_word(self.current_text, word_info)
            if added_merged:
                words_to_return.append(self.current_text[-1])

        return words_to_return

    def merge_word(self, text, new_word_info):
        print("merge_word")
        """ Merges a new word into the existing text, handling overlaps and choosing by probability. """
        if not text:
            return [new_word_info], True

        last_word_info = text[-1]
        # If new word starts after the last word ends, no overlap
        if last_word_info['end'] <= new_word_info['start']:
            return text + [new_word_info], True

        # If overlapping, check if it's an actual better continuation (by Levenshtein distance or probability)
        if (levenshtein_distance(last_word_info['word'], new_word_info['word']) < len(new_word_info['word']) / 2) or (new_word_info['probability'] > last_word_info['probability']):
            return text[:-1] + [new_word_info], True  # Replace
        return text, False  # Ignore the new word

    def reconstruct(self):
        return ' '.join([word_info['word'] for word_info in self.current_text])
