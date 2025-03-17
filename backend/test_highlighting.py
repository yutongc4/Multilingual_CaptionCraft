"""Test script to demonstrate keyword highlighting across two languages"""
import random
from youtube_transcript_api import YouTubeTranscriptApi
import yake
from transformers import M2M100ForConditionalGeneration
from tokenization_small100 import SMALL100Tokenizer
import torch
from functools import lru_cache
import re

class FastM2MTranslator:
    def __init__(self, device="mps" if torch.backends.mps.is_available() else "cpu"):
        self.device = device
        model_name = "alirezamsh/small100"
        print(f"Loading {model_name} on {self.device}...")
        self.model = M2M100ForConditionalGeneration.from_pretrained(model_name)
        if self.device != "cpu":
            self.model = self.model.to(self.device)
        self.tokenizer = SMALL100Tokenizer.from_pretrained(model_name)

    @lru_cache(maxsize=1000)
    def translate_keyword(self, text, src_lang, tgt_lang):
        """Simple keyword translation."""
        self.tokenizer.tgt_lang = tgt_lang
        encoded = self.tokenizer(text, return_tensors="pt").to(self.device)
        generated_tokens = self.model.generate(**encoded)
        return self.tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0]

def highlight_text(text, keyword):
    """Highlight exact keyword match in text."""
    text_lower = text.lower()
    keyword_lower = keyword.lower()
    
    # Find all word boundaries including handling punctuation and special characters
    matches = list(re.finditer(r'\b' + re.escape(keyword_lower) + r'\b', text_lower))
    found = False
    
    if matches:
        # Convert text to list to make character-level modifications
        text_chars = list(text)
        for match in matches:
            start, end = match.span()
            # Get the original case version of the matched word
            original_word = text[start:end]
            # Add highlighting
            text_chars[start:end] = list(f"\033[1;33m{original_word}\033[0m")
            found = True
            # print(f"Found match: '{original_word}'")
        
        text = ''.join(text_chars)
    
    return text, found

def extract_keywords(text, language, min_length=3):
    """Extract a single most important keyword (1-gram) from text using YAKE."""
    kw_extractor = yake.KeywordExtractor(
        lan=language,
        n=1,        # unigrams only
        top=1       # only get top keyword
    )
    keywords = kw_extractor.extract_keywords(text)
    
    if keywords:
        keyword, score = keywords[0]
        # print(f"YAKE selected: '{keyword}' (score: {score:.4f})")
        return [keyword] if len(keyword) >= min_length else []
    return []

def find_matching_segment(source_segment, target_segments, time_threshold=0.5):
    """Find the matching segment in target language based on timestamp."""
    source_start = source_segment['start']
    source_end = source_start + source_segment['duration']
    
    for target_segment in target_segments:
        target_start = target_segment['start']
        target_end = target_start + target_segment['duration']
        
        # Check if segments overlap
        if (abs(source_start - target_start) < time_threshold and 
            abs(source_end - target_end) < time_threshold):
            return target_segment
    
    return None

def clean_caption_text(text):
    """Remove text within parentheses, proper nouns (capitalized words), and clean up whitespace."""
    # Remove text within parentheses
    cleaned = re.sub(r'\([^)]*\)', '', text)
    
    # Split into words and filter out words that start with uppercase
    words = cleaned.split()
    lowercase_words = [word for word in words if not word[0].isupper()]
    
    # Rejoin filtered words
    cleaned = ' '.join(lowercase_words)
    
    # Clean up extra whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    # print(f"Cleaned text for YAKE: '{cleaned}'")  # Debug print
    return cleaned

def process_transcripts(video_id, source_lang, target_lang, max_time=60, min_duration=2.0):
    """Process and highlight keywords in two transcripts. Returns a dictionary of matched word pairs."""
    try:
        # Get transcripts
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        source_transcript = transcript_list.find_transcript([source_lang])
        target_transcript = transcript_list.find_transcript([target_lang])
        
        source_data = source_transcript.fetch()
        target_data = target_transcript.fetch()
        
        # Filter segments by time and duration
        source_data = [seg for seg in source_data 
                      if seg['start'] <= max_time and seg['duration'] >= min_duration]
        target_data = [seg for seg in target_data 
                      if seg['start'] <= max_time and seg['duration'] >= min_duration]
        
        # Initialize translator
        translator = FastM2MTranslator()
        
        # Dictionary to store matched word pairs
        matched_words = {
            'source_to_target': {},  # Original to translated
            'highlighted_phrases': [] # List of tuples (source_phrase, target_phrase)
        }
        
        print(f"\nProcessing transcripts for languages: {source_lang} -> {target_lang}")
        
        for source_segment in source_data:
            # Find matching segment in target language
            target_segment = find_matching_segment(source_segment, target_data)
            
            if not target_segment:
                continue
            
            # Clean and extract keywords from source text
            source_text = source_segment['text']
            cleaned_text = clean_caption_text(source_text)
            if cleaned_text:
                keywords = extract_keywords(cleaned_text, source_lang)
                
                if keywords:
                    keyword = keywords[0]
                    # First verify keyword exists in source text
                    source_text, source_found = highlight_text(source_text, keyword)
                    if source_found:
                        # Translate the keyword
                        translated_keyword = translator.translate_keyword(keyword, source_lang, target_lang)
                        translated_keyword = translated_keyword.strip().lower()
                        
                        # Try to highlight in target text
                        target_text, target_found = highlight_text(target_segment['text'], translated_keyword)
                        if target_found:
                            matched_words['source_to_target'][keyword] = translated_keyword
                            matched_words['highlighted_phrases'].append((source_text, target_text))

        # Print only the final highlighted phrases
        print("\n=== Successfully Highlighted Phrases ===")
        for i, (source, target) in enumerate(matched_words['highlighted_phrases'], 1):
            print(f"\n{i}. Source: {source}")
            print(f"   Target: {target}")
        
        return matched_words
        
    except Exception as e:
        print(f"Error processing transcripts: {str(e)}")
        return None

def main():
    # Example video ID (replace with your video ID)
    video_id = "zy2Zj8yIe6c"
    
    try:
        # Get available transcripts
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        available_langs = [t.language_code for t in transcript_list]
        
        if len(available_langs) < 2:
            print("Not enough languages available for comparison")
            return
        
        # Use English -> Spanish
        source_lang = "en"
        target_lang = "nl"
        
        print(f"Selected languages: {source_lang} -> {target_lang}")
        
        # Process and highlight keywords
        matched_words = process_transcripts(
            video_id, 
            source_lang, 
            target_lang,
            max_time=600,     # Process up to 220 seconds
            min_duration=1.5  # Only captions 1.5 seconds or longer
        )
        word_pairs = []
        if matched_words:
            print("\n=== Matched Word Pairs ===")
            for source_word, target_word in matched_words['source_to_target'].items():
                print(f"'{source_word}' -> '{target_word}'")
                word_pairs.append((source_word, target_word))
        else:
            print("Failed to process transcripts")
            return word_pairs
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main() 