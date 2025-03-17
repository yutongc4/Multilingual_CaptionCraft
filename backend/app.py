# Backend API for the YouTube Captions Extension
from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import re

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/list-transcripts', methods=['GET'])
def list_transcripts():
    """
    Endpoint to list all available transcripts for a YouTube video
    """
    video_id = request.args.get('videoId')
    
    if not video_id:
        return jsonify({'error': 'No video ID provided'}), 400
    
    try:
        print(f"Attempting to fetch transcripts for video ID: {video_id}")
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # Convert transcript list to a serializable format
        transcripts = []
        for transcript in transcript_list:
            print(f"Found transcript: {transcript.language_code} - {transcript.language}")
            transcripts.append({
                'language': transcript.language,
                'language_code': transcript.language_code,
                'is_generated': transcript.is_generated,
                'is_translatable': transcript.is_translatable,
                'translation_languages': [
                    {'language': lang['language'], 'language_code': lang['language_code']} 
                    for lang in transcript.translation_languages
                ]
            })
        
        response_data = {
            'video_id': video_id,
            'transcripts': transcripts
        }
        print(f"Returning response with {len(transcripts)} transcripts")
        return jsonify(response_data)
        
    except TranscriptsDisabled:
        print(f"Transcripts are disabled for video {video_id}")
        return jsonify({'error': 'Transcripts are disabled for this video'}), 404
    except NoTranscriptFound:
        print(f"No transcript found for video {video_id}")
        return jsonify({'error': 'No transcript found for this video'}), 404
    except Exception as e:
        print(f"Error fetching transcripts: {str(e)}")
        return jsonify({'error': f'Error fetching transcripts: {str(e)}'}), 500

@app.route('/api/get-transcript', methods=['GET'])
def get_transcript():
    """
    Endpoint to get a specific transcript for a YouTube video
    """
    video_id = request.args.get('videoId')
    lang = request.args.get('lang')
    
    if not video_id:
        return jsonify({'error': 'No video ID provided'}), 400
    
    if not lang:
        return jsonify({'error': 'No language code provided'}), 400
    
    try:
        print(f"Fetching transcript for video {video_id} in language {lang}")
        # Get transcript in the specified language
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        try:
            # Try to find transcript in the requested language
            transcript = transcript_list.find_transcript([lang])
            transcript_data = transcript.fetch()
            print(f"Found direct transcript in {lang}")
        except NoTranscriptFound:
            # If not found, try to translate from another language if possible
            try:
                reference_transcript = transcript_list[0]  # Get the first available transcript
                if reference_transcript.is_translatable:
                    print(f"Translating transcript to {lang} from {reference_transcript.language_code}")
                    transcript = reference_transcript.translate(lang)
                    transcript_data = transcript.fetch()
                else:
                    print(f"No transcript in {lang} and translation is not available")
                    return jsonify({'error': f'No transcript found in {lang} and translation is not available'}), 404
            except Exception as e:
                print(f"Error translating transcript: {str(e)}")
                return jsonify({'error': f'Error translating transcript: {str(e)}'}), 500
        
        # Process fetched transcript
        return jsonify({
            'video_id': video_id,
            'language': lang,
            'transcript': transcript_data
        })
        
    except TranscriptsDisabled:
        print(f"Transcripts are disabled for video {video_id}")
        return jsonify({'error': 'Transcripts are disabled for this video'}), 404
    except NoTranscriptFound:
        print(f"No transcript found for video {video_id} in language: {lang}")
        return jsonify({'error': f'No transcript found for video in language: {lang}'}), 404
    except Exception as e:
        print(f"Error fetching transcript: {str(e)}")
        return jsonify({'error': f'Error fetching transcript: {str(e)}'}), 500

@app.route('/api/translate-transcript', methods=['GET'])
def translate_transcript():
    """
    Endpoint to translate a transcript from one language to another
    """
    video_id = request.args.get('videoId')
    source_lang = request.args.get('sourceLang')
    target_lang = request.args.get('targetLang')
    
    if not video_id or not source_lang or not target_lang:
        return jsonify({'error': 'Missing required parameters: videoId, sourceLang, targetLang'}), 400
    
    try:
        # Get transcript list
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # Get source transcript
        try:
            source_transcript = transcript_list.find_transcript([source_lang])
        except NoTranscriptFound:
            return jsonify({'error': f'No transcript found in source language: {source_lang}'}), 404
        
        # Check if the transcript can be translated
        if not source_transcript.is_translatable:
            return jsonify({'error': 'This transcript cannot be translated'}), 400
        
        # Check if target language is available for translation
        target_lang_available = False
        for lang in source_transcript.translation_languages:
            if lang['language_code'] == target_lang:
                target_lang_available = True
                break
        
        if not target_lang_available:
            return jsonify({'error': f'Target language {target_lang} is not available for translation'}), 400
        
        # Translate the transcript
        translated_transcript = source_transcript.translate(target_lang)
        transcript_data = translated_transcript.fetch()
        
        return jsonify({
            'video_id': video_id,
            'source_language': source_lang,
            'target_language': target_lang,
            'transcript': transcript_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Error translating transcript: {str(e)}'}), 500

@app.route('/api/export-transcript', methods=['GET'])
def export_transcript():
    """
    Endpoint to export a transcript in various formats (SRT, VTT, JSON, TXT)
    """
    video_id = request.args.get('videoId')
    lang = request.args.get('lang')
    format_type = request.args.get('format', 'txt')  # Default to txt
    
    if not video_id or not lang:
        return jsonify({'error': 'Missing required parameters: videoId, lang'}), 400
    
    try:
        # Get transcript
        transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
        
        # Format based on requested type
        if format_type.lower() == 'txt':
            from youtube_transcript_api.formatters import TextFormatter
            formatter = TextFormatter()
            formatted_transcript = formatter.format_transcript(transcript_data)
            mimetype = 'text/plain'
            filename = f"{video_id}_{lang}.txt"
        elif format_type.lower() == 'json':
            import json
            formatted_transcript = json.dumps(transcript_data, indent=2)
            mimetype = 'application/json'
            filename = f"{video_id}_{lang}.json"
        elif format_type.lower() == 'srt':
            from youtube_transcript_api.formatters import SRTFormatter
            formatter = SRTFormatter()
            formatted_transcript = formatter.format_transcript(transcript_data)
            mimetype = 'text/plain'
            filename = f"{video_id}_{lang}.srt"
        elif format_type.lower() == 'vtt':
            from youtube_transcript_api.formatters import WebVTTFormatter
            formatter = WebVTTFormatter()
            formatted_transcript = formatter.format_transcript(transcript_data)
            mimetype = 'text/plain'
            filename = f"{video_id}_{lang}.vtt"
        else:
            return jsonify({'error': f'Unsupported format: {format_type}'}), 400
        
        response = app.response_class(
            response=formatted_transcript,
            status=200,
            mimetype=mimetype
        )
        response.headers.set('Content-Disposition', f'attachment; filename={filename}')
        return response
        
    except Exception as e:
        return jsonify({'error': f'Error exporting transcript: {str(e)}'}), 500
    
@app.route('/api/get-multiple-transcripts', methods=['POST'])
def get_multiple_transcripts():
    """
    Fetch multiple transcripts in parallel
    """
    data = request.json
    video_id = data.get('videoId')
    languages = data.get('languages', [])
    
    if not video_id or not languages:
        return jsonify({'error': 'Missing videoId or languages'}), 400

    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        results = {}
        errors = {}

        with ThreadPoolExecutor() as executor:
            futures = {}
            for lang in languages:
                futures[executor.submit(fetch_single_transcript, transcript_list, lang)] = lang

            for future in as_completed(futures):
                lang = futures[future]
                try:
                    results[lang] = future.result()
                except Exception as e:
                    errors[lang] = str(e)

        return jsonify({
            'video_id': video_id,
            'transcripts': results,
            'errors': errors
        }), 200 if results else 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def fetch_single_transcript(transcript_list, lang):
    """Helper function to fetch a single transcript"""
    try:
        transcript = transcript_list.find_transcript([lang])
        return transcript.fetch()
    except NoTranscriptFound:
        # Attempt translation fallback
        reference_transcript = transcript_list[0]
        if reference_transcript.is_translatable:
            return reference_transcript.translate(lang).fetch()
        raise

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)